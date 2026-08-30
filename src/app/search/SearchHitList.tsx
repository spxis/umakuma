import { SEARCH_SOURCE_LABELS, type SearchHit, type SearchSource } from "@/lib/globalSearch";
import { subjectGlyphTone } from "@/app/shared/subjectListView";

import { SEARCH_PAGE_COPY } from "./searchCopy";

type Props = {
  hits: SearchHit[];
};

/** Source accents, so a row's origin reads before the label does. */
const SOURCE_TONES: Record<SearchSource, string> = {
  wanikani: "border-sky-300 bg-sky-50 text-sky-700",
  jlpt: "border-emerald-300 bg-emerald-50 text-emerald-700",
  grades: "border-kanji/40 bg-kanji/10 text-kanji",
};

/**
 * Search results as one ranked list rather than three stacked ones.
 *
 * A learner asking "where does 鉛筆 live" wants the best answer first,
 * whichever catalogue holds it; grouping by source would make them read three
 * lists and compare. The source rides along as a pill instead.
 */
export default function SearchHitList({ hits }: Props) {
  if (hits.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface-muted p-5">
        <p className="text-sm font-bold text-foreground/75">{SEARCH_PAGE_COPY.noResults}</p>
        <p className="mt-1 text-xs font-semibold text-foreground/55">{SEARCH_PAGE_COPY.noResultsHint}</p>
      </div>
    );
  }

  return (
    <ul className="overflow-hidden rounded-2xl border border-line bg-surface divide-y divide-line/60">
      {hits.map((hit) => (
        <li key={hit.key} className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-surface-muted/50">
          <span
            className={`w-16 shrink-0 truncate text-center text-2xl font-black leading-none sm:w-24 [font-family:var(--font-jp-current)] ${subjectGlyphTone(
              hit.subjectType,
            )}`}
          >
            {hit.glyph}
          </span>

          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-bold text-foreground sm:text-base">
              {hit.meaning || "—"}
            </span>
            {hit.reading ? (
              <span className="truncate text-xs font-semibold text-foreground/55 [font-family:var(--font-jp-current)]">
                {hit.reading}
              </span>
            ) : null}
          </span>

          <span className="flex shrink-0 items-center gap-1">
            {hit.badges.map((badge) => (
              <span key={badge} className="subject-pill hidden border-line bg-surface text-foreground sm:inline-flex">
                {badge}
              </span>
            ))}
            <span className={`subject-pill border ${SOURCE_TONES[hit.source]}`}>
              {SEARCH_SOURCE_LABELS[hit.source]}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
