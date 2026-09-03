import { JP_TEXT_CLASS } from "./japaneseText";
import { GLYPH_ROW_SIZE_CLASS } from "./glyphSizes";
import { subjectGlyphTone } from "./subjectListView";

/**
 * The glyph at the head of a row.
 *
 * Study history, a saved list, what you looked at recently, a page of search
 * results, the suggestions under the search box: five surfaces, five copies of
 * `truncate text-center text-2xl font-black leading-none` with the tone
 * function called by hand after it. Copies age - one had grown an `sm:text-3xl`
 * nothing else had, and one had lost its `lang="ja"`, which is the attribute
 * that stops Chrome offering to translate 私自身 into "myself" and a screen
 * reader spelling the kanji out in English.
 *
 * The lane is still the caller's, because it is a real per-surface decision
 * and each one is argued in a comment where it is passed: a results row can
 * afford three characters, a suggestion under a field can afford four.
 */
export default function SubjectGlyph({
  glyph,
  subjectType,
  /** The width of the column it stands in, and nothing else. */
  laneClassName = "",
  /** Overrides the colour the subject's kind would give it. */
  tone,
}: {
  glyph: string;
  subjectType?: string;
  laneClassName?: string;
  tone?: string;
}) {
  return (
    <span
      lang="ja"
      translate="no"
      className={`${laneClassName} truncate text-center ${GLYPH_ROW_SIZE_CLASS} font-black leading-none ${JP_TEXT_CLASS} ${
        tone ?? subjectGlyphTone(subjectType ?? "")
      }`.trim()}
    >
      {glyph}
    </span>
  );
}
