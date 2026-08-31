import { Fragment } from "react";

import { NO_TRANSLATE_CLASS } from "./japaneseText";

/**
 * Kana, kanji and Japanese punctuation, in runs.
 *
 * Deliberately greedy across adjacent Japanese so 「なに」 comes out as one span
 * rather than four, and deliberately not matching Latin letters or digits, so
 * an English sentence stays one translatable block either side of the quote.
 */
const JAPANESE_RUN =
  /[　-〿぀-ヿㇰ-ㇿ㐀-䶿一-鿿ｦ-ﾟ]+/g;

/**
 * English prose with Japanese quoted inside it.
 *
 * Release notes are the case that needs this: "a reader knows 何 by なに before
 * they know it by what" is a sentence somebody may legitimately want
 * translated, and the two words inside it are the two that must survive
 * unchanged. Marking the whole paragraph would keep the English from
 * translating; marking none of it hands the quoted Japanese to the translator.
 *
 * So only the Japanese runs are marked, and the English between them is left
 * alone to be translated like any other sentence.
 */
export default function JapaneseInProse({ text }: { text: string }) {
  const pieces: Array<{ text: string; japanese: boolean }> = [];
  let index = 0;

  for (const match of text.matchAll(JAPANESE_RUN)) {
    const start = match.index ?? 0;
    if (start > index) pieces.push({ text: text.slice(index, start), japanese: false });
    pieces.push({ text: match[0], japanese: true });
    index = start + match[0].length;
  }
  if (index < text.length) pieces.push({ text: text.slice(index), japanese: false });

  // No Japanese in it at all: hand back the string, and no wrapper spans.
  if (!pieces.some((piece) => piece.japanese)) return <>{text}</>;

  return (
    <>
      {pieces.map((piece, position) =>
        piece.japanese ? (
          <span key={position} translate="no" className={NO_TRANSLATE_CLASS}>
            {piece.text}
          </span>
        ) : (
          <Fragment key={position}>{piece.text}</Fragment>
        ),
      )}
    </>
  );
}
