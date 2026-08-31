import Link from "next/link";

import StrokeOrderButton from "@/app/shared/StrokeOrderButton";

import { SEARCH_SOURCE_LABELS, searchHitHref, type SearchHit, type SearchSource } from "@/lib/globalSearch";
import { subjectGlyphTone } from "@/app/shared/subjectListView";

import { SEARCH_PAGE_COPY } from "./searchCopy";
import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";

type Props = {
  hits: SearchHit[];
  /** Whose explorers a hit opens; null when nobody is signed in. */
  viewerUsername: string | null;
};

/** Source accents, so a row's origin reads before the label does. */
export const SOURCE_TONES: Record<SearchSource, string> = {
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
export default function SearchHitList({ hits, viewerUsername }: Props) {
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
        <li key={hit.key}>
          <HitRow hit={hit} href={searchHitHref(hit, viewerUsername)} />
        </li>
      ))}
    </ul>
  );
}

function HitRow({ hit, href }: { hit: SearchHit; href: string | null }) {
  const body = (
    <>
          <span
            className={`w-16 shrink-0 truncate text-center text-2xl font-black leading-none sm:w-24 ${JP_TEXT_CLASS} ${subjectGlyphTone(
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
              <span lang="ja" translate="no" className={`truncate text-xs font-semibold text-foreground/55 ${JP_TEXT_CLASS}`}>
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
    </>
  );

  const shell = "flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition hover:bg-surface-muted/50";

  /*
   * The strokes button sits outside the row link. Nesting a button inside an
   * anchor is invalid, and the click would be swallowed by the navigation.
   */
  return (
    <div className="flex items-center gap-1 pr-2">
      {href ? (
        <Link href={href} className={shell}>
          {body}
        </Link>
      ) : (
        <div className={shell}>{body}</div>
      )}
      {isSingleKanji(hit) ? <StrokeOrderButton kanji={hit.glyph} meaning={hit.meaning} /> : null}
    </div>
  );
}

/** Stroke order exists for single kanji, not radicals drawn as images or words. */
function isSingleKanji(hit: SearchHit): boolean {
  return hit.subjectType === "kanji" && [...hit.glyph].length === 1;
}
