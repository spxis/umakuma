"use client";

import Link from "next/link";
import { useState } from "react";

import MapSetPicker from "@/app/game/MapSetPicker";
import ConfirmDialog from "@/app/shared/ConfirmDialog";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import type { CountryCode } from "@/lib/geoRegion";
import { MAP_COUNTRIES_ALL } from "@/lib/mapCountries";
import { MAP_SET_VISIBILITIES, groupMapSets, mapSetLabel, type MapCustomSetSummary } from "@/lib/mapCustomSets";
import { regionNameLabel } from "@/lib/regionNames";
import { useGeoDataset } from "@/lib/useGeoDataset";

type Props = {
  accountId: string;
  /** The address the Map lobby lives under. */
  owner: string;
  initialSets: MapCustomSetSummary[];
  /** An admin may share a set of theirs with the site, and take it back. */
  isAdmin: boolean;
};

const ROW_BUTTON =
  "h-8 rounded-full border border-line bg-surface px-3 text-[11px] font-black uppercase tracking-[0.1em] text-foreground hover:bg-surface-muted disabled:opacity-50";

function countryName(code: string): string {
  return MAP_COUNTRIES_ALL.find((country) => country.code === code)?.label ?? code;
}

/** One set's regions by name once its country's outlines have loaded, by code until then. */
function SetRegions({ set }: { set: MapCustomSetSummary }) {
  const dataset = useGeoDataset(set.country as CountryCode);
  const byCode = new Map((dataset?.regions ?? []).map((region) => [String(region.code), region]));
  const names = set.regions.map((code) => {
    const region = byCode.get(code);
    return region ? regionNameLabel(region) : code;
  });
  return <p className="text-xs text-foreground/60">{names.join(" · ")}</p>;
}

/**
 * The Map sets a member keeps and the ones the site offers everybody.
 *
 * Their own: open one on the map to change its name or its prefectures, or
 * delete it. The site's: made by an admin for every member, to look at here
 * and to play from the Map lobby, and only their maker's to change. An
 * admin's own set carries the switch between the two.
 */
export default function YourMapSets({ accountId, owner, initialSets, isAdmin }: Props) {
  const [sets, setSets] = useState(initialSets);
  const [opened, setOpened] = useState<MapCustomSetSummary | null>(null);
  const [deleting, setDeleting] = useState<MapCustomSetSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const groups = groupMapSets(sets);

  const replace = (set: MapCustomSetSummary) => setSets((current) => current.map((entry) => (entry.id === set.id ? set : entry)));

  const remove = async (set: MapCustomSetSummary) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/game/${accountId}/map-sets/${set.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? STUDY_LIST_COPY.mapsDeleteFailed);
      }
      setSets((current) => current.filter((entry) => entry.id !== set.id));
      setDeleting(null);
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : STUDY_LIST_COPY.mapsDeleteFailed);
    } finally {
      setBusy(false);
    }
  };

  const share = async (set: MapCustomSetSummary, visibility: MapCustomSetSummary["visibility"]) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/game/${accountId}/map-sets/${set.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      });
      const payload = (await response.json().catch(() => null)) as { set?: MapCustomSetSummary; error?: string } | null;
      if (!response.ok || !payload?.set) throw new Error(payload?.error ?? STUDY_LIST_COPY.mapsShareFailed);
      replace(payload.set);
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : STUDY_LIST_COPY.mapsShareFailed);
    } finally {
      setBusy(false);
    }
  };

  const row = (set: MapCustomSetSummary) => (
    <li key={set.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-2 font-black text-foreground">
          {mapSetLabel(set)}
          <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground/60">{countryName(set.country)}</span>
          {set.visibility === MAP_SET_VISIBILITIES.site ? (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              {STUDY_LIST_COPY.mapsSiteBadge}
              {set.mine ? "" : ` · ${STUDY_LIST_COPY.mapsBy(set.ownerName)}`}
            </span>
          ) : null}
          {saved === set.id ? <span className="text-[11px] font-semibold text-emerald-700">{STUDY_LIST_COPY.mapsSaved}</span> : null}
        </p>
        <SetRegions set={set} />
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <button type="button" className={ROW_BUTTON} onClick={() => setOpened(set)}>
          {set.mine ? STUDY_LIST_COPY.mapsOpen : STUDY_LIST_COPY.mapsView}
        </button>
        {set.mine && isAdmin ? (
          <button
            type="button"
            className={ROW_BUTTON}
            disabled={busy}
            onClick={() => void share(set, set.visibility === MAP_SET_VISIBILITIES.site ? MAP_SET_VISIBILITIES.private : MAP_SET_VISIBILITIES.site)}
          >
            {set.visibility === MAP_SET_VISIBILITIES.site ? STUDY_LIST_COPY.mapsUnshare : STUDY_LIST_COPY.mapsShare}
          </button>
        ) : null}
        {set.mine ? (
          <button type="button" className={`${ROW_BUTTON} text-rose-700`} onClick={() => setDeleting(set)}>
            {STUDY_LIST_COPY.mapsDelete}
          </button>
        ) : null}
      </div>
    </li>
  );

  const shelf = (heading: string, blurb: string | null, list: MapCustomSetSummary[]) => (
    <section className="flex flex-col gap-1">
      <h2 className="flex items-baseline gap-2 text-xs font-bold uppercase tracking-wide text-foreground/60">
        {heading}
        <span className="font-semibold text-foreground/60">{list.length}</span>
      </h2>
      {blurb ? <p className="text-xs text-foreground/60">{blurb}</p> : null}
      <ul className="flex flex-col divide-y divide-line/60 rounded-2xl border border-line bg-surface px-4">{list.map(row)}</ul>
    </section>
  );

  return (
    <div className="flex flex-col gap-5">
      {groups.site.length > 0 ? shelf(STUDY_LIST_COPY.mapsSiteHeading, STUDY_LIST_COPY.mapsSiteBlurb, groups.site) : null}
      {groups.mine.length > 0 ? (
        shelf(STUDY_LIST_COPY.mapsMineHeading, null, groups.mine)
      ) : (
        <p className="rounded-2xl border border-line bg-surface p-6 text-sm text-foreground/70">{STUDY_LIST_COPY.mapsEmpty}</p>
      )}

      <p className="text-xs text-foreground/60">
        <Link href={`/users/${encodeURIComponent(owner)}/game/map`} className="font-semibold underline underline-offset-4">
          {STUDY_LIST_COPY.mapsPlay}
        </Link>
      </p>
      {error ? (
        <p role="alert" className="text-xs font-semibold text-rose-600">
          {error}
        </p>
      ) : null}

      {opened ? (
        <MapSetPicker
          accountId={accountId}
          country={opened.country as CountryCode}
          initial={opened}
          readOnly={!opened.mine}
          onClose={() => setOpened(null)}
          onSaved={(set) => {
            replace(set);
            setSaved(set.id);
            setOpened(null);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title={STUDY_LIST_COPY.mapsDeleteTitle(deleting?.name ?? "")}
        description={STUDY_LIST_COPY.mapsDeleteBody}
        confirmLabel={busy ? STUDY_LIST_COPY.mapsDeleting : STUDY_LIST_COPY.mapsDelete}
        busy={busy}
        onConfirm={() => deleting && void remove(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
