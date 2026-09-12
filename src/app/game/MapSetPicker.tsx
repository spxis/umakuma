"use client";

import { useCallback, useMemo, useState } from "react";

import ModalShell from "@/app/shared/ModalShell";
import { MODAL_LAYERS } from "@/app/shared/modalLayers";
import { useMapZoom } from "@/app/maps/useMapZoom";
import { MAP_ZOOM_LEVELS } from "@/lib/geoMapFraming";
import type { CountryCode } from "@/lib/geoRegion";
import { regionNameLabel } from "@/lib/regionNames";
import { mapSetProblems, MAP_SET_LIMITS, normalizeMapSetRegions, type MapCustomSetSummary } from "@/lib/mapCustomSets";
import { useGeoDataset } from "@/lib/useGeoDataset";

import CountryMap, { type MapMark } from "./CountryMap";
import { GAME_COPY, MAP_TONES } from "./GameMode.constants";

type Props = {
  accountId: string;
  country: CountryCode;
  onSaved: (set: MapCustomSetSummary) => void;
  onClose: () => void;
};

const ZOOM_BUTTON =
  "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-black text-foreground hover:bg-surface-muted disabled:opacity-40";
const FIELD_CLASS = "h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-sm font-bold text-foreground";

/**
 * Building a custom set on the map itself.
 *
 * The same board the study page draws, with the same drag and zoom, because
 * Kanto is eight prefectures inside a thumbnail and a list of forty-seven
 * names is not how anybody learns where Gunma is. Tapping a region adds it;
 * tapping again takes it out. The set is saved by name and played from the
 * lobby's own select, so a student twelve prefectures in drills those twelve.
 */
export default function MapSetPicker({ accountId, country, onSaved, onClose }: Props) {
  const view = useMapZoom(country);
  const dataset = useGeoDataset(country);
  const [chosen, setChosen] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const division = dataset?.divisionTypeName ?? "Region";
  const regionByCode = useMemo(() => new Map((dataset?.regions ?? []).map((region) => [String(region.code), region])), [dataset]);
  const label = useCallback(
    (code: string | number) => {
      const region = regionByCode.get(String(code));
      return region ? regionNameLabel(region) : String(code);
    },
    [regionByCode],
  );

  const toggle = useCallback((code: string | number) => {
    const key = String(code);
    setChosen((current) => (current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key]));
  }, []);

  const marks: MapMark[] = chosen.map((code) => ({ code, tone: MAP_TONES.target }));
  /* The same gate the route refuses on greys the button out. Until the
     outlines arrive nothing can be off the map, so the known list is the
     chosen list. */
  const problems = mapSetProblems(
    { country, name, regions: chosen },
    dataset ? dataset.regions.map((region) => region.code) : chosen,
  );
  const ready = problems.length === 0 && !saving;

  const save = async () => {
    if (!ready) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/game/${accountId}/map-sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, name: name.trim(), regions: normalizeMapSetRegions(chosen) }),
      });
      const payload = (await response.json().catch(() => null)) as { set?: MapCustomSetSummary; error?: string } | null;
      if (!response.ok || !payload?.set) throw new Error(payload?.error ?? GAME_COPY.mapSetError);
      onSaved(payload.set);
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : GAME_COPY.mapSetError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose} layer={MODAL_LAYERS.page} labelledBy="map-set-title" panelClassName="w-full max-w-4xl rounded-2xl border border-line bg-surface p-4 shadow-xl">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="map-set-title" className="text-lg font-black leading-tight text-foreground">
              {GAME_COPY.mapSetTitle(division)}
            </h2>
            <p className="text-[11px] font-semibold text-foreground/60">{GAME_COPY.mapSetHint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 shrink-0 rounded-full border border-line bg-surface px-3.5 text-xs font-black text-foreground hover:bg-surface-muted"
          >
            {GAME_COPY.mapSetCancel}
          </button>
        </div>

        <div className="relative h-[52vh] min-h-[300px] rounded-2xl border border-line bg-surface-muted p-2">
          <CountryMap
            marks={marks}
            country={country}
            box={view.box}
            onRegionSelect={toggle}
            regionLabel={label}
            svgProps={view.panProps}
          />
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-line bg-surface/90 p-1 shadow-sm backdrop-blur">
            <button type="button" onClick={() => view.step(-1)} disabled={view.zoom === MAP_ZOOM_LEVELS[0]} aria-label={GAME_COPY.zoomOut} title={GAME_COPY.zoomOut} className={ZOOM_BUTTON}>
              −
            </button>
            <span className="min-w-8 text-center text-[11px] font-black text-foreground/70">{view.zoom}×</span>
            <button type="button" onClick={() => view.step(1)} disabled={view.zoom === MAP_ZOOM_LEVELS[MAP_ZOOM_LEVELS.length - 1]} aria-label={GAME_COPY.zoomIn} title={GAME_COPY.zoomIn} className={ZOOM_BUTTON}>
              +
            </button>
            {view.zoomed ? (
              <button type="button" onClick={view.reset} className={`${ZOOM_BUTTON} w-auto px-2 text-[10px]`}>
                {GAME_COPY.zoomReset}
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5" aria-live="polite">
          <span className="text-[11px] font-black uppercase tracking-wide text-foreground/60">
            {chosen.length === 0 ? GAME_COPY.mapSetNone : GAME_COPY.mapSetChosen(chosen.length, division)}
          </span>
          {chosen.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => toggle(code)}
              aria-label={GAME_COPY.mapSetRemove(label(code))}
              title={GAME_COPY.mapSetRemove(label(code))}
              className="inline-flex items-center gap-1 rounded-full border border-indigo-600/40 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800"
            >
              {label(code)}
              <span aria-hidden="true">×</span>
            </button>
          ))}
          {chosen.length > 0 ? (
            <button type="button" onClick={() => setChosen([])} className="text-[11px] font-semibold text-foreground/60 underline underline-offset-4">
              {GAME_COPY.mapSetClear}
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-foreground/60">{GAME_COPY.mapSetName}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={MAP_SET_LIMITS.name}
              placeholder={GAME_COPY.mapSetNamePlaceholder}
              className={FIELD_CLASS}
            />
          </label>
          <button
            type="button"
            disabled={!ready}
            onClick={() => void save()}
            className="h-9 rounded-full border border-indigo-700 bg-indigo-600 px-5 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-45 hover:brightness-95"
          >
            {saving ? GAME_COPY.mapSetSaving : GAME_COPY.mapSetSave}
          </button>
        </div>
        {name.trim() !== "" && problems.length > 0 ? (
          <p className="text-[11px] font-semibold text-foreground/60">{problems[0]}</p>
        ) : null}
        {error ? (
          <p role="alert" className="text-xs font-semibold text-rose-600">
            {error}
          </p>
        ) : null}
      </div>
    </ModalShell>
  );
}
