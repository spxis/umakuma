"use client";

import { MAP_MARK_STATUSES, toggleStatus, type MapMarkStatus } from "@/lib/mapMarks";

import { MAP_MARK_COPY } from "./MapStudy.constants";

/**
 * Saying what you make of a region.
 *
 * Two questions, kept apart because they answer differently: whether you can
 * name it, and whether you have been there. A child can name every prefecture
 * and have set foot in three; a parent can have driven through Gifu twice and
 * still not place it. One control for both would force a false choice.
 *
 * Pressing the status already set clears it. That is the only way back to "I
 * have not said", and a third button for it would be one nobody presses on
 * purpose and everybody presses by accident.
 */

const BUTTON =
  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-black uppercase tracking-[0.08em] transition disabled:opacity-50";

const TONE: Record<MapMarkStatus, { on: string; off: string }> = {
  [MAP_MARK_STATUSES.known]: {
    on: "border-emerald-500 bg-emerald-500/15 text-emerald-800",
    off: "border-line bg-surface text-foreground/70 hover:bg-surface-muted",
  },
  [MAP_MARK_STATUSES.practice]: {
    on: "border-amber-500 bg-amber-400/20 text-amber-900",
    off: "border-line bg-surface text-foreground/70 hover:bg-surface-muted",
  },
};

export default function MapMarkButtons({
  status,
  visited,
  saving,
  onChange,
}: {
  status: MapMarkStatus | null;
  visited: boolean;
  saving: boolean;
  onChange: (next: { status: MapMarkStatus | null; visited: boolean }) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {([MAP_MARK_STATUSES.known, MAP_MARK_STATUSES.practice] as const).map((value) => {
        const on = status === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={on}
            disabled={saving}
            onClick={() => onChange({ status: toggleStatus(status, value), visited })}
            className={`${BUTTON} ${on ? TONE[value].on : TONE[value].off}`}
          >
            {MAP_MARK_COPY.status[value]}
          </button>
        );
      })}

      <button
        type="button"
        aria-pressed={visited}
        disabled={saving}
        onClick={() => onChange({ status, visited: !visited })}
        className={`${BUTTON} ${
          visited
            ? "border-sky-600 bg-sky-500/15 text-sky-800"
            : "border-line bg-surface text-foreground/70 hover:bg-surface-muted"
        }`}
      >
        {MAP_MARK_COPY.visited}
      </button>
    </div>
  );
}
