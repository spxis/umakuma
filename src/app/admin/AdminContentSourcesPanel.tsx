"use client";

import useSWR from "swr";

import AdminPanelHeader from "./AdminPanelHeader";
import { ADMIN_CONTENT_SOURCES_COPY as copy } from "./AdminContentSources.constants";
import type { AdminContentSources } from "@/lib/adminContentSources";

/**
 * School grades and map data, and whether what shipped is what is loaded.
 *
 * Neither dataset syncs from anywhere at runtime: grades are seeded into the
 * database by a script, maps are generated into the repo by another. So this
 * panel does not offer a sync button it cannot honour. It answers the question
 * those scripts leave open - did anybody run them - and names the command when
 * the answer is no.
 */
export default function AdminContentSourcesPanel({
  dataset,
  sessionAuthorized,
  checkingSession,
}: {
  dataset: "grades" | "maps";
  sessionAuthorized: boolean;
  checkingSession: boolean;
}) {
  /*
   * SWR rather than an effect, which is the repo's pattern and also the only
   * way to load this without setting state synchronously inside an effect.
   * The key goes null until the session is confirmed, so an unauthorised
   * request is never sent in the first place.
   */
  const { data: sources, error, isLoading } = useSWR<AdminContentSources>(
    sessionAuthorized && !checkingSession ? "/api/admin/content-sources" : null,
    async (url: string) => {
      const response = await fetch(url);
      const payload = (await response.json()) as AdminContentSources & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? copy.loadFailed);
      return payload;
    },
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  const isGrades = dataset === "grades";

  if (checkingSession || isLoading) {
    return <Shell dataset={dataset}><p className="text-sm text-foreground/70">{copy.loading}</p></Shell>;
  }

  if (!sessionAuthorized) {
    return <Shell dataset={dataset}><p className="text-sm text-foreground/70">{copy.needsAuth}</p></Shell>;
  }

  if (error || !sources) {
    return <Shell dataset={dataset}><p className="text-sm text-rose-600">{error ?? copy.loadFailed}</p></Shell>;
  }

  return (
    <Shell dataset={dataset}>
      {isGrades ? <GradesBody sources={sources} /> : <MapsBody sources={sources} />}
    </Shell>
  );
}

function Shell({ dataset, children }: { dataset: "grades" | "maps"; children: React.ReactNode }) {
  const panel = dataset === "grades" ? copy.grades : copy.maps;
  return (
    <section className="rounded-2xl border border-line bg-surface/90 p-5 shadow-sm">
      <AdminPanelHeader label={panel.label} title={panel.title} description={panel.description} />
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">{label}</p>
      <p className={`text-lg font-black ${tone === "warn" ? "text-amber-600" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function GradesBody({ sources }: { sources: AdminContentSources }) {
  const { grades } = sources;
  const drifted = grades.drifted.length > 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label={copy.grades.inFiles} value={grades.totalInFiles.toLocaleString("en-CA")} />
        <Stat
          label={copy.grades.inDatabase}
          value={grades.totalInDatabase.toLocaleString("en-CA")}
          tone={drifted ? "warn" : undefined}
        />
        <Stat label={copy.grades.standard} value={grades.standard ?? "—"} />
      </div>

      {/*
        * The whole reason this panel exists. A grade file gaining twenty kanji
        * without the seed being re-run is invisible everywhere else: the
        * explorer simply shows the old list and nothing reports an error.
        */}
      {drifted ? (
        <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <span className="block font-black">{copy.grades.driftHeading}</span>
          {copy.grades.driftBody} <code className="font-bold">{copy.grades.seedCommand}</code>
        </p>
      ) : (
        <p className="mt-3 text-xs text-foreground/60">{copy.grades.inSync}</p>
      )}

      <ul className="mt-3 divide-y divide-line/70 rounded-xl border border-line">
        {grades.rows.map((row) => {
          const rowDrifted = row.inFiles !== row.inDatabase;
          return (
            <li key={row.grade} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
              <span className="font-bold text-foreground">{row.label}</span>
              <span className={rowDrifted ? "font-black text-amber-700" : "text-foreground/65"}>
                {copy.grades.filesShort} {row.inFiles} · {copy.grades.databaseShort} {row.inDatabase}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function MapsBody({ sources }: { sources: AdminContentSources }) {
  return (
    <ul className="space-y-3">
      {sources.maps.map((map) => {
        const countMismatch = map.regions !== map.expectedRegions;
        return (
          <li key={map.country} className="rounded-xl border border-line p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-black text-foreground">
                {map.countryName}{" "}
                <span className="text-xs font-semibold text-foreground/60">{map.divisionTypeName}</span>
              </p>
              <p className={`text-xs font-bold ${countMismatch ? "text-amber-700" : "text-foreground/60"}`}>
                {map.regions} / {map.expectedRegions} {copy.maps.regions}
              </p>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <Stat label={copy.maps.detail} value={String(map.averagePathCommands)} />
              <Stat label={copy.maps.viewBox} value={map.viewBox} />
              <Stat
                label={copy.maps.orphans}
                value={map.orphans.length === 0 ? "0" : `${map.orphans.length}`}
              />
            </div>

            {map.orphans.length > 0 ? (
              <p className="mt-2 text-[11px] text-foreground/60">
                {copy.maps.orphansBody} {map.orphans.join(", ")}
              </p>
            ) : null}

            <p className="mt-2 break-all text-[11px] text-foreground/60">
              {copy.maps.sourcePrefix} {map.source}
            </p>
          </li>
        );
      })}

      <li className="rounded-xl border border-line bg-surface-muted p-3 text-xs text-foreground/70">
        <span className="block font-black text-foreground/80">{copy.maps.regenerateHeading}</span>
        {copy.maps.regenerateBody} <code className="font-bold">{copy.maps.regenerateCommand}</code>
      </li>
    </ul>
  );
}
