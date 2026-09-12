"use client";

import Link from "next/link";
import { useState } from "react";

import MapSetPicker from "@/app/game/MapSetPicker";
import ConfirmDialog from "@/app/shared/ConfirmDialog";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import type { CountryCode } from "@/lib/geoRegion";
import { MAP_COUNTRIES_ALL } from "@/lib/mapCountries";
import { mapSetLabel, type MapCustomSetSummary } from "@/lib/mapCustomSets";
import { regionNameLabel } from "@/lib/regionNames";
import { useGeoDataset } from "@/lib/useGeoDataset";

type Props = {
  accountId: string;
  /** The address the Map lobby lives under. */
  owner: string;
  initialSets: MapCustomSetSummary[];
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
 * A member's custom Map sets, as a list they keep: open one on the map to
 * change its name or its prefectures, or delete it. Playing one happens in
 * the Map lobby, which this links to; the Play row there offers every set.
 */
export default function YourMapSets({ accountId, owner, initialSets }: Props) {
  const [sets, setSets] = useState(initialSets);
  const [editing, setEditing] = useState<MapCustomSetSummary | null>(null);
  const [deleting, setDeleting] = useState<MapCustomSetSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

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

  return (
    <section className="flex flex-col gap-3">
      {sets.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-6 text-sm text-foreground/70">{STUDY_LIST_COPY.mapsEmpty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line/60 rounded-2xl border border-line bg-surface px-4">
          {sets.map((set) => (
            <li key={set.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-2 font-black text-foreground">
                  {mapSetLabel(set)}
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground/60">{countryName(set.country)}</span>
                  {saved === set.id ? <span className="text-[11px] font-semibold text-emerald-700">{STUDY_LIST_COPY.mapsSaved}</span> : null}
                </p>
                <SetRegions set={set} />
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <button type="button" className={ROW_BUTTON} onClick={() => setEditing(set)}>
                  {STUDY_LIST_COPY.mapsOpen}
                </button>
                <button type="button" className={`${ROW_BUTTON} text-rose-700`} onClick={() => setDeleting(set)}>
                  {STUDY_LIST_COPY.mapsDelete}
                </button>
              </div>
            </li>
          ))}
        </ul>
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

      {editing ? (
        <MapSetPicker
          accountId={accountId}
          country={editing.country as CountryCode}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={(set) => {
            setSets((current) => current.map((entry) => (entry.id === set.id ? set : entry)));
            setSaved(set.id);
            setEditing(null);
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
    </section>
  );
}
