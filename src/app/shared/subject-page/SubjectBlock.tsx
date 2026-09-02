import type { ReactNode } from "react";

import SourceCredit from "@/app/shared/SourceCredit";
import type { SourceCredit as Credit } from "@/lib/sourceCredits";

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
  children,
}: {
  heading?: string;
  credit?: { source: Credit; label: string };
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-3xl border border-line bg-surface p-5">
      {heading ? (
        <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{heading}</h2>
      ) : null}
      {children}
      {credit ? <SourceCredit credit={credit.source} label={credit.label} /> : null}
    </section>
  );
}
