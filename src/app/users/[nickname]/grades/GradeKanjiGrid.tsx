import Link from "next/link";

import type { SchoolGradeKanjiEntry } from "@/lib/schoolGrades.types";

import { GRADE_EXPLORER_COPY } from "./GradeExplorer.constants";
import { displayReading, readingsForGrade } from "./gradeExplorerView";

type Props = {
  items: SchoolGradeKanjiEntry[];
  /** Where a card links, so the grid does not need to know the route. */
  hrefFor?: (entry: SchoolGradeKanjiEntry) => string | null;
};

function ReadingRow({ label, readings }: { label: string; readings: string[] }) {
  return (
    <p className="flex items-baseline gap-1.5 text-xs">
      <span className="shrink-0 font-black uppercase tracking-[0.08em] text-foreground/45">{label}</span>
      <span className="min-w-0 truncate font-bold text-foreground/80 [font-family:var(--font-jp-current)]">
        {readings.length > 0
          ? readings.map(displayReading).join("、")
          : GRADE_EXPLORER_COPY.noReadings}
      </span>
    </p>
  );
}

/**
 * The grade catalogue as cards, readings first.
 *
 * Deliberately not the shared subject card: that one carries an SRS stage and a
 * WaniKani level, neither of which a school grade has, and it shows no readings
 * at all. A grade test asks for the on and kun readings, so those get the room.
 */
export default function GradeKanjiGrid({ items, hrefFor }: Props) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-surface-muted p-4 text-sm font-semibold text-foreground/70">
        {GRADE_EXPLORER_COPY.noMatches}
      </p>
    );
  }

  return (
    <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
      {items.map((entry) => {
        const readings = readingsForGrade(entry);
        const href = hrefFor?.(entry) ?? null;
        const body = (
          <>
            <div className="flex items-start justify-between gap-2">
              <span className="text-4xl font-black leading-none text-kanji [font-family:var(--font-jp-current)]">
                {entry.kanji}
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                {typeof entry.strokeCount === "number" ? (
                  <span className="subject-pill border-line bg-surface text-foreground">
                    {entry.strokeCount} {GRADE_EXPLORER_COPY.strokes}
                  </span>
                ) : null}
                {typeof entry.crossRef?.jlptLevel === "number" ? (
                  <span className="subject-pill border-emerald-300 bg-emerald-50 text-emerald-700">
                    {GRADE_EXPLORER_COPY.jlptCrossRef} N{entry.crossRef.jlptLevel}
                  </span>
                ) : null}
              </span>
            </div>

            <p className="mt-2 truncate text-sm font-black text-foreground" title={entry.primaryMeaning ?? ""}>
              {entry.primaryMeaning ?? GRADE_EXPLORER_COPY.noReadings}
            </p>

            <div className="mt-2 space-y-0.5">
              <ReadingRow label={GRADE_EXPLORER_COPY.onReadings} readings={readings.on} />
              <ReadingRow label={GRADE_EXPLORER_COPY.kunReadings} readings={readings.kun} />
            </div>
          </>
        );

        const shell = "rounded-2xl border border-kanji/40 bg-kanji/5 p-3 transition";
        return (
          <li key={entry.kanji} className="min-w-0">
            {href ? (
              <Link href={href} className={`block h-full ${shell} hover:brightness-95`}>
                {body}
              </Link>
            ) : (
              <div className={`h-full ${shell}`}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
