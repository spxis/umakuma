"use client";

import type { ReactNode } from "react";

import { RELEASES_PAGE_COPY } from "./releasesCopy";
import { monthIsOpen, monthsAfterToggle, setOpenMonths, useOpenMonths } from "./useOpenMonths";

/**
 * One month of releases, folded shut unless it is the month you are in.
 *
 * A wrapper rather than the whole list, so the entries inside stay on the
 * server: they need the codename table and the summary rules, and shipping
 * those to the browser to draw a disclosure triangle would be paying for the
 * wrong thing.
 *
 * The triangle is controlled rather than left to the browser, because the
 * answer has to come from what the reader chose on their last visit. The click
 * is intercepted for the same reason - letting the element toggle itself and
 * then correcting it afterwards is how a section flickers.
 */
export default function MonthSection({
  monthKey,
  label,
  count,
  currentKey,
  everyKey,
  children,
}: {
  monthKey: string;
  label: string;
  count: number;
  /** The month the site is in, which is the one that opens by default. */
  currentKey: string;
  /** Every month on the page, so a toggle can write the whole list back. */
  everyKey: readonly string[];
  children: ReactNode;
}) {
  const open = useOpenMonths();
  const isOpen = monthIsOpen(monthKey, open, currentKey);

  return (
    <details open={isOpen} className="group/month mb-6">
      <summary
        onClick={(event) => {
          event.preventDefault();
          setOpenMonths(monthsAfterToggle(monthKey, open, currentKey, everyKey));
        }}
        className="mb-2 flex cursor-pointer list-none items-baseline justify-between gap-3 border-b border-line pb-1 text-[11px] font-black uppercase tracking-[0.14em] text-foreground/60"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="text-foreground/35 transition group-open/month:rotate-90">›</span>
          {label}
        </span>
        <span className="font-bold tracking-normal text-foreground/60">
          {count} {count === 1 ? RELEASES_PAGE_COPY.release : RELEASES_PAGE_COPY.releases}
        </span>
      </summary>

      {children}
    </details>
  );
}
