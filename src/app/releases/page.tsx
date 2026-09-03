import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";

import CodenameText from "@/app/shared/CodenameText";
import umakumaLogo from "@/images/umakuma-banner1-transparent.png";
import { loadFeatureTimeline, publicReleaseEntries, publicSummaryFor } from "@/lib/featureTimeline";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { codenameForVersion } from "@/lib/releaseCodenames";

import { FEATURE_AREA_LABELS } from "@/lib/featureTimeline";

import { RELEASES_PAGE_COPY } from "./releasesCopy";
import MonthSection from "./MonthSection";
import {
  areaCounts,
  currentMonthKeyIn,
  filterByArea,
  groupReleasesByMonth,
  parseAreaParam,
  releaseAnchor,
} from "./releasesView";
import { noTranslateClass } from "@/app/shared/japaneseText";
import JapaneseInProse from "@/app/shared/JapaneseInProse";

export const metadata: Metadata = {
  title: "UmaKuma Updates",
  description: "What shipped in UmaKuma, newest first.",
};

export default async function PublicReleasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /*
   * The page is public, so the admin route is offered only to an admin - a
   * link everybody can see to a page only one person can open is noise.
   */
  const session = await getServerSession(authOptions);
  const viewerIsAdmin = isAdminEmail(session?.user?.email ?? null);

  const releases = publicReleaseEntries(loadFeatureTimeline());
  /* Counted before the filter, so a chip says how many it would show. */
  const areas = areaCounts(releases);
  const area = parseAreaParam((await searchParams).area);
  const months = groupReleasesByMonth(filterByArea(releases, area));
  const monthKeys = months.map((month) => month.key);
  /*
   * Vancouver's month, not the server's: the site keeps one clock, and a page
   * that opened January on the 1st of February for readers in one timezone and
   * not another would be the sort of bug nobody can reproduce.
   */
  const currentMonthKey = currentMonthKeyIn(months);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center gap-4">
        <Link href="/" className="shrink-0">
          <Image src={umakumaLogo} alt="UmaKuma" width={56} height={56} className="h-14 w-14 object-contain" priority />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black text-foreground">{RELEASES_PAGE_COPY.heading}</h1>
          <p className="text-xs uppercase tracking-[0.08em] text-foreground/60">{RELEASES_PAGE_COPY.subtitle}</p>
        </div>

        {viewerIsAdmin ? (
          <Link
            href="/admin/releases"
            className="inline-flex h-8 shrink-0 items-center rounded-full border border-line bg-surface px-3 text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60 transition hover:bg-surface-muted hover:text-foreground"
          >
            {RELEASES_PAGE_COPY.adminLink}
          </Link>
        ) : null}
      </header>

      <p className="mb-6 rounded-2xl border border-line bg-surface-muted px-4 py-3 text-sm font-semibold text-foreground/70">
        {RELEASES_PAGE_COPY.intro}
      </p>

      {/*
        * The tags were printed on every entry and usable from none of them.
        * Links rather than buttons: a filtered list is a view worth having an
        * address, and the page is already drawn on the server.
        */}
      <nav aria-label={RELEASES_PAGE_COPY.filterLabel} className="mb-6 flex flex-wrap items-center gap-1.5">
        <AreaChip href="/releases" label={RELEASES_PAGE_COPY.allAreas} count={releases.length} on={area === null} />
        {areas.map((entry) => (
          <AreaChip
            key={entry.area}
            href={`/releases?area=${entry.area}`}
            label={FEATURE_AREA_LABELS[entry.area]}
            count={entry.count}
            on={area === entry.area}
          />
        ))}
      </nav>

      {months.map((month) => (
        <MonthSection
          key={month.key}
          monthKey={month.key}
          label={month.label}
          count={month.entries.length}
          currentKey={currentMonthKey}
          everyKey={monthKeys}
          /* A filtered list opens: its matches must not hide in a folded month. */
          forceOpen={area !== null}
        >
          <ul className="space-y-2">
            {month.entries.map((entry) => {
              const codename = entry.version ? codenameForVersion(entry.version) : null;
              return (
                <li key={entry.id} id={releaseAnchor(entry)}>
                  <details className="group rounded-2xl border border-line bg-surface px-4 py-3 transition open:bg-surface-muted/40">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                      {entry.version ? (
                        <span className="subject-pill border-line bg-surface-muted font-black tabular-nums text-foreground">
                          v{entry.version}
                        </span>
                      ) : null}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-foreground">{entry.name}</span>
                        {/*
                          * The codename on the row rather than only inside it.
                          * It is the release's identity - a reader remembers
                          * 「とうげのともしび」long after they forget v0.108.0 -
                          * and it was invisible until you expanded the entry.
                          */}
                        {codename ? (
                          <span lang="ja" translate="no" className={noTranslateClass("block truncate text-[11px] font-semibold text-foreground/60")}>
                            「{codename.reading}」 {codename.romaji}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60">
                        {entry.date}
                      </span>
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-foreground/35 transition group-open:rotate-90"
                      >
                        ›
                      </span>
                    </summary>

                    <div className="mt-3 border-t border-line/70 pt-3">
                      <p className="text-sm font-semibold text-foreground/80">
                        <JapaneseInProse text={publicSummaryFor(entry)} />
                      </p>

                      {entry.details ? (
                        <p className="mt-2 text-sm text-foreground/70">
                          <JapaneseInProse text={entry.details} />
                        </p>
                      ) : null}

                      <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60">
                        <div className="flex items-center gap-1.5">
                          <dt>{RELEASES_PAGE_COPY.area}</dt>
                          <dd className="text-foreground/70">{entry.area}</dd>
                        </div>
                        {codename ? (
                          <div className="flex min-w-0 items-center gap-1.5">
                            <dt>{RELEASES_PAGE_COPY.codename}</dt>
                            <dd className="min-w-0 truncate normal-case tracking-normal text-foreground/70">
                              <CodenameText codename={codename} />
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </MonthSection>
      ))}

      <p className="mt-8 text-center text-xs font-semibold text-foreground/60">
        <Link href="/" className="underline decoration-dotted underline-offset-2 hover:text-foreground/60">
          {RELEASES_PAGE_COPY.backHome}
        </Link>
      </p>
    </div>
  );
}

/** One tag, with the number of releases behind it. */
function AreaChip({
  href,
  label,
  count,
  on,
}: {
  href: string;
  label: string;
  count: number;
  on: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={on ? "true" : undefined}
      className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold uppercase tracking-[0.08em] transition ${
        on
          ? "border-accent bg-accent text-white"
          : "border-line bg-surface text-foreground/70 hover:bg-surface-muted"
      }`}
    >
      {label}
      <span className={`tabular-nums ${on ? "text-white/75" : "text-foreground/60"}`}>{count}</span>
    </Link>
  );
}
