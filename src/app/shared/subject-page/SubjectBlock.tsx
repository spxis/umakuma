import Link from "next/link";
import type { ReactNode } from "react";

import { SourceCredits } from "@/app/shared/SourceCredit";
import type { SourceKey } from "@/lib/sourceCredits";

export type BlockCredit = { source: SourceKey; label: string };

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
  headingHref,
  credit,
  action,
  className = "",
  children,
}: {
  heading?: string;
  /**
   * This block's own page, where it has one.
   *
   * Every block is already a page of its own - `/kanji/X/related` draws this
   * block and nothing else - and nothing on the page said so. The title is
   * the natural place: it is the name of the thing the address is named
   * after. Quiet until it is pointed at, because a page of eight underlined
   * headings reads as a page of links rather than a page about a character.
   */
  headingHref?: string | null;
  /**
   * Where this block's content came from. One source is the usual case; a
   * block fed by several names all of them, because a credit that lists one of
   * two holders is a true sentence that leaves the other out - the same reason
   * the maps credit their outlines and their cities separately.
   */
  credit?: BlockCredit | BlockCredit[];
  /** A control that belongs to this block, beside its heading. */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const credits = credit ? (Array.isArray(credit) ? credit : [credit]) : [];

  return (
    <section className={`overflow-hidden rounded-3xl border border-line bg-surface ${className}`}>
      {/*
        * The title in a bar across the top, which is what the stroke-order
        * panel has always done. It used to be a small label inside the padded
        * body, so the one card with a header bar read as a different component
        * from the four beneath it. The right-hand slot is that panel's too -
        * where its stroke count sits, a block's own control sits.
        */}
      {heading || action ? (
        <header className="flex items-start justify-between gap-3 border-b border-line bg-surface-muted/60 px-5 py-3">
          {heading ? (
            <h2 className="min-w-0 text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
              {headingHref ? (
                <Link
                  href={headingHref}
                  className="underline decoration-transparent underline-offset-4 transition hover:text-accent hover:decoration-current focus-visible:text-accent focus-visible:decoration-current"
                >
                  {heading}
                </Link>
              ) : (
                heading
              )}
            </h2>
          ) : (
            <span />
          )}
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </header>
      ) : null}
      {/* The padding is on the content, not the section, so the credit's rule
        * runs the full width of the card the way the stroke-order foot does. */}
      <div className="space-y-3 p-5">{children}</div>
      <SourceCredits credits={credits} />
    </section>
  );
}
