import type { AnswerHistory } from "@/lib/searchAnswers";
import { AVERAGE_WINDOW_DAYS } from "@/lib/moneyHistory";

import { SEARCH_ANSWER_HISTORY_COPY, SEARCH_ANSWER_HISTORY_LABELS } from "./searchCopy";

type Props = {
  history: AnswerHistory;
};

/**
 * What the same money was worth before.
 *
 * A real table, because this is a real table: rows are points in time, columns
 * are currencies, and a reader scans down one column to see where a currency
 * has gone. Laying it out as stacked paragraphs would lose the comparison that
 * is the whole point of showing five of them at once.
 *
 * The column headings appear only when there is more than one currency. Into
 * yen there is exactly one, and a column headed JPY above a list of ¥ amounts
 * says nothing the amounts do not.
 *
 * It scrolls inside itself rather than widening the card, so two currencies
 * and a change beside each still fit on a phone.
 */
export default function SearchAnswerHistory({ history }: Props) {
  const showHeadings = history.columns.length > 1;

  return (
    <div data-search-answer-history className="mt-3 border-t border-accent/20 pt-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/60">
        {SEARCH_ANSWER_HISTORY_LABELS.heading}
      </p>

      <div className="mt-2 overflow-x-auto">
        {/*
          * Sized to its contents rather than to the card. A full-width table
          * on a wide screen pushes "20 years ago" and the number beside it to
          * opposite ends of the page, which is a row nobody can read across.
          */}
        <table className="w-auto border-collapse text-left">
          {showHeadings ? (
            <thead>
              <tr>
                <th scope="col" className="pb-1 pr-6 text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground/60">
                  <span className="sr-only">{SEARCH_ANSWER_HISTORY_LABELS.whenColumn}</span>
                </th>
                {history.columns.map((currency) => (
                  <th
                    key={currency}
                    scope="col"
                    className="pb-1 pr-6 text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground/60"
                  >
                    {currency}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}

          <tbody>
            {history.rows.map((row) => (
              <tr key={row.lookback}>
                <th
                  scope="row"
                  className="whitespace-nowrap py-0.5 pr-6 text-xs font-semibold text-foreground/60"
                >
                  {SEARCH_ANSWER_HISTORY_COPY[row.lookback]}
                </th>
                {row.cells.map((cell, index) => (
                  <td
                    key={history.columns[index]}
                    className="whitespace-nowrap py-0.5 pr-6 text-sm font-bold text-foreground"
                  >
                    {cell.value}
                    {cell.change ? (
                      <span className="ml-2 text-xs font-semibold text-foreground/60">
                        {cell.change}
                      </span>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[11px] font-semibold text-foreground/60">
        {SEARCH_ANSWER_HISTORY_LABELS.note(AVERAGE_WINDOW_DAYS)}
      </p>
    </div>
  );
}
