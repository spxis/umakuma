"use client";

import { CITY_DENSITIES, type CityDensity } from "@/lib/geoCities";

import { MAP_CITY_COPY } from "./MapStudy.constants";

/**
 * Cities on or off, and how many of them.
 *
 * The same chip language as the mark layers directly above it, because it is
 * the same kind of question - what is painted on this map - and two visual
 * idioms in one row would read as two unrelated controls. Off is a hollow
 * chip; the density steps only appear once there is something to size.
 */
const CHIP =
  "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-black uppercase tracking-[0.08em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70";

const ON = "border-accent bg-accent/15 text-accent";
/* /60, not fainter: the contrast gate holds every muted colour to 4.5:1. */
const OFF = "border-line bg-surface text-foreground/60 hover:bg-surface-muted";

const STEP_ON = "border-accent bg-accent/10 text-accent";
const STEP_OFF = "border-line bg-surface text-foreground/60 hover:bg-surface-muted";

export default function MapCityToggle({
  shown,
  onToggle,
  density,
  onDensity,
  counts,
}: {
  shown: boolean;
  onToggle: () => void;
  density: CityDensity;
  onDensity: (next: CityDensity) => void;
  counts: Record<CityDensity, number>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        aria-pressed={shown}
        title={MAP_CITY_COPY.toggle}
        onClick={onToggle}
        className={`${CHIP} ${shown ? ON : OFF}`}
      >
        {MAP_CITY_COPY.label}
      </button>

      {shown ? (
        <div role="group" aria-label={MAP_CITY_COPY.densityLabel} className="flex flex-wrap items-center gap-1.5">
          {CITY_DENSITIES.map((step) => (
            <button
              key={step}
              type="button"
              aria-pressed={density === step}
              onClick={() => onDensity(step)}
              className={`${CHIP} ${density === step ? STEP_ON : STEP_OFF}`}
            >
              {MAP_CITY_COPY.density[step](counts[step])}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
