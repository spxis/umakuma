"use client";

import type { MapMarkLayers, MapMarkTotals } from "@/lib/mapMarks";

import { MAP_MARK_COPY } from "./MapStudy.constants";

/**
 * The tally above the map, where each count is a switch for its own paint.
 *
 * "6 of 47 known · 6 to practise · 3 visited" was a sentence. It is three
 * buttons now, because the reader who has marked forty prefectures known
 * wants to see the seven that are not, and the only way was to squint past a
 * wall of green. Off is a hollow chip, still saying its number; the marks
 * themselves are untouched, and the panel's own buttons still show them.
 */
const CHIP =
  "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-black uppercase tracking-[0.08em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70";

const ON: Record<keyof MapMarkLayers, string> = {
  known: "border-emerald-500 bg-emerald-500/15 text-emerald-800",
  practice: "border-amber-500 bg-amber-400/20 text-amber-900",
  visited: "border-sky-600 bg-sky-500/10 text-sky-800",
};
/*
 * /60, not fainter: the contrast gate holds every muted colour to 4.5:1, and
 * an off switch that cannot be read is not a switch. The strike-through
 * carries "off"; the colour only has to stay legible.
 */
const OFF = "border-line bg-surface text-foreground/60 line-through decoration-2 hover:bg-surface-muted";

const LAYERS: (keyof MapMarkLayers)[] = ["known", "practice", "visited"];

export default function MapLayerToggles({
  totals,
  layers,
  onToggle,
  total,
}: {
  totals: MapMarkTotals;
  layers: MapMarkLayers;
  onToggle: (layer: keyof MapMarkLayers) => void;
  total: number;
}) {
  return (
    <div role="group" aria-label={MAP_MARK_COPY.layersLabel} className="flex flex-wrap items-center gap-1.5">
      {LAYERS.map((layer) => (
        <button
          key={layer}
          type="button"
          aria-pressed={layers[layer]}
          onClick={() => onToggle(layer)}
          className={`${CHIP} ${layers[layer] ? ON[layer] : OFF}`}
        >
          {MAP_MARK_COPY.layer[layer](totals[layer])}
        </button>
      ))}
      <span className="text-[11px] font-semibold text-foreground/60">{MAP_MARK_COPY.ofTotal(total)}</span>
    </div>
  );
}
