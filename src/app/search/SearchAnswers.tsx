import { japaneseTextProps } from "@/app/shared/japaneseText";
import type { SearchAnswer } from "@/lib/searchAnswers";

import { SEARCH_ANSWER_COPY } from "./searchCopy";

type Props = {
  answers: SearchAnswer[];
};

/**
 * The answers above the catalogues.
 *
 * Above, and looking unlike a result row, because it is not one: a row is
 * something the search found and this is something it worked out. The number
 * carries the weight a glyph carries in a result, since it is the thing the
 * reader came for, and everything that says which question it answers sits
 * quietly under it.
 *
 * The catalogue columns still run below. 令和 is a date and also a word, and a
 * page that answered the date and hid the word would have traded one missing
 * answer for another.
 */
export default function SearchAnswers({ answers }: Props) {
  if (answers.length === 0) return null;

  return (
    <ul className="space-y-2">
      {answers.map((answer) => (
        <li
          key={answer.kind}
          data-search-answer={answer.kind}
          className="rounded-2xl border border-accent/40 bg-accent/5 px-5 py-4"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
            {SEARCH_ANSWER_COPY[answer.kind]}
          </p>

          <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-3xl font-black text-foreground">{answer.value}</span>
            {answer.japanese ? (
              <span
                {...japaneseTextProps("text-xl font-bold text-foreground/80")}
              >
                {answer.japanese}
              </span>
            ) : null}
          </p>

          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs font-semibold text-foreground/60">
            <span>{answer.question}</span>
            {answer.detail ? (
              <>
                <span aria-hidden="true">·</span>
                <span {...japaneseTextProps()}>{answer.detail}</span>
              </>
            ) : null}
          </p>
        </li>
      ))}
    </ul>
  );
}
