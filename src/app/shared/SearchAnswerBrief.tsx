import { SEARCH_ANSWER_COPY } from "@/app/search/searchCopy";
import type { SearchAnswer } from "@/lib/searchAnswers";

import { japaneseTextProps } from "./japaneseText";

/**
 * An answer at the top of the header dropdown.
 *
 * The same answers the results page shows, in the space a dropdown has: the
 * value, what it answers, and the Japanese form where there is one. No rate
 * history and no attribution line - those are a table and a sentence, and this
 * is ten rows under a search box. Whoever wants them opens the results page,
 * which is the row directly underneath.
 *
 * It renders above the hits and also instead of them, because the two are
 * unrelated: "Taisho 5" is 1916 and no catalogue holds a row for it, and a
 * dropdown that said "no results" to a question it had just answered would be
 * hiding the answer behind its own emptiness.
 */
export default function SearchAnswerBrief({ answers }: { answers: SearchAnswer[] }) {
  if (answers.length === 0) return null;

  return (
    <ul className="border-b border-line/60">
      {answers.map((answer) => (
        <li
          key={`${answer.kind}:${answer.question}`}
          data-search-answer={answer.kind}
          className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 bg-accent/5 px-4 py-2"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-accent">
            {SEARCH_ANSWER_COPY[answer.kind]}
          </span>
          <span className="text-lg font-black text-foreground">{answer.value}</span>
          {answer.japanese ? (
            <span {...japaneseTextProps("text-sm font-bold text-foreground/75")}>{answer.japanese}</span>
          ) : null}
          <span className="ml-auto text-[11px] font-semibold text-foreground/60">{answer.question}</span>
        </li>
      ))}
    </ul>
  );
}
