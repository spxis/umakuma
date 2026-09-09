import type { XpKindShare } from "./xpLedger";
import { XP_HISTORY_COPY as copy } from "./xpHistoryCopy";

/**
 * Where a member's XP came from, drawn the one way.
 *
 * Lifted out of `XpActivitySummary` when the profile needed the same list:
 * two surfaces answering "what have I been paid for" with two sets of bars
 * would have drifted on the first change to either.
 *
 * The heading is the caller's, because the two pages introduce it
 * differently - the history page has a section for it, the profile is
 * answering a smaller question - and a component that insists on its own
 * heading is a component only one page can use.
 */
export default function XpKindSplit({ byKind }: { byKind: XpKindShare[] }) {
  if (byKind.length === 0) return null;

  return (
    <ul className="space-y-1.5">
      {byKind.map((entry) => (
        <li key={entry.kind} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-xs font-bold text-foreground">{entry.label}</span>
          <span
            role="progressbar"
            aria-label={entry.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(entry.share * 100)}
            className="h-2 flex-1 overflow-hidden rounded-full bg-line"
          >
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${Math.round(entry.share * 100)}%` }}
            />
          </span>
          <span className="w-24 shrink-0 text-right text-[11px] font-black tabular-nums text-foreground/70">
            {copy.xpAmount(entry.amount)}
          </span>
          <span className="w-10 shrink-0 text-right text-[11px] font-semibold tabular-nums text-foreground/60">
            {copy.splitShare(entry.share)}
          </span>
        </li>
      ))}
    </ul>
  );
}
