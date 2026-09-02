import type { ReactNode } from "react";

import SourceCredit from "@/app/shared/SourceCredit";
import type { SourceKey } from "@/lib/sourceCredits";

/**
 * One block of a subject page.
 *
 * A page is an ordered list of these, each fed by exactly one source, each
 * rendering nothing at all when it has nothing. That is what lets the kanji,
 * word and radical pages be one component with three block lists rather than
 * three layouts - and what lets a fifth data source arrive as one new block
 * and one new line in a list.
 *
 * The credit is part of the block rather than the page because the source is:
 * a block that shows borrowed content names where it came from, every time.
 */
export default function SubjectBlock({
  heading,
  credit,
  action,
  className = "",
  children,
}: {
  heading?: string;
  credit?: { source: SourceKey; label: string };
  /** A control that belongs to this block, beside its heading. */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`overflow-hidden rounded-3xl border border-line bg-surface ${className}`}>
      {/* The padding is on the content, not the section, so the credit's rule
        * runs the full width of the card the way the stroke-order foot does. */}
      <div className="space-y-3 p-5">
        {heading || action ? (
          <div className="flex items-center justify-between gap-2">
            {heading ? (
              <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{heading}</h2>
            ) : (
              <span />
            )}
            {action}
          </div>
        ) : null}
        {children}
      </div>
      {credit ? <SourceCredit source={credit.source} label={credit.label} /> : null}
    </section>
  );
}
