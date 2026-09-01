"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MODAL_LAYERS } from "@/app/shared/modalLayers";

import { PRACTICE_SHEET_COPY, SHEET_CHIP } from "./practiceCopy";
import { PRINT_NOW_PARAM } from "./sheetLink";

/**
 * Print, and how much of it.
 *
 * This was one button that called `window.print()`, which printed the twenty
 * characters currently on screen and nothing else. A grade is eighty, so the
 * button quietly meant "print a quarter of this" - and because twenty
 * characters is about two and a bit sheets of paper, each of those four print
 * jobs ended in a mostly-empty page. Nobody was told either thing.
 *
 * So it asks, but only when there is something to ask about: a sheet that fits
 * on one page has one answer and gets the plain button it always had.
 */
export default function PrintButton({
  /** How many screen pages the sheet has, which is what makes this a question. */
  pageCount,
  /** Characters on the page in front of them, and in the whole list. */
  onThisPage,
  total,
  /** The address of this same sheet, laid out for printing. */
  allHref,
  /** Already in the print layout: there is no larger scope left to offer. */
  printAll = false,
  /** Arrived here by choosing "Everything", so open the dialog without a second click. */
  autoPrint = false,
}: {
  pageCount: number;
  onThisPage: number;
  total: number;
  allHref: string;
  printAll?: boolean;
  autoPrint?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!autoPrint) return;

    /*
     * Drop the flag before printing, so a refresh - or the back button landing
     * here again - shows the sheet instead of reopening the dialog.
     */
    const url = new URL(window.location.href);
    url.searchParams.delete(PRINT_NOW_PARAM);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);

    /*
     * One paint and the glyph font first. This document can be 250 characters
     * of inline SVG, and a dialog opened mid-layout prints the half-drawn page.
     */
    let cancelled = false;
    let timer = 0;
    void document.fonts.ready.then(() => {
      timer = window.setTimeout(() => {
        if (!cancelled) window.print();
      }, 200);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [autoPrint]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const printNow = () => {
    setOpen(false);
    window.print();
  };

  // Nothing to choose between: one screen page, or already showing them all.
  if (printAll || pageCount <= 1) {
    return (
      <button type="button" onClick={() => window.print()} className={TRIGGER}>
        {PRACTICE_SHEET_COPY.print}
      </button>
    );
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={TRIGGER}
      >
        {PRACTICE_SHEET_COPY.print}
        <span aria-hidden="true" className="ml-2 text-[9px] leading-none">
          ▼
        </span>
      </button>

      {open ? (
        <>
          {/* A click anywhere else dismisses it. */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className={`fixed inset-0 ${MODAL_LAYERS.sheetMenuScrim} cursor-default`}
          />
          <div
            role="menu"
            className={`absolute right-0 top-11 ${MODAL_LAYERS.sheetMenu} w-64 rounded-2xl border border-line bg-surface p-2 text-left shadow-xl`}
          >
            <p className={`px-2 pb-1 pt-1 text-[10px] ${SHEET_CHIP.label}`}>
              {PRACTICE_SHEET_COPY.printScopeHeading}
            </p>

            <button type="button" role="menuitem" onClick={printNow} className={ITEM}>
              <span className="font-black text-foreground">{PRACTICE_SHEET_COPY.printScopeThis}</span>
              <span className="text-[11px] text-foreground/60">
                {onThisPage} {PRACTICE_SHEET_COPY.printScopeCharacters}
              </span>
            </button>

            <Link href={allHref} role="menuitem" onClick={() => setOpen(false)} className={ITEM}>
              <span className="font-black text-foreground">{PRACTICE_SHEET_COPY.printScopeAll}</span>
              <span className="text-[11px] text-foreground/60">
                {total} {PRACTICE_SHEET_COPY.printScopeCharacters}
              </span>
            </Link>
          </div>
        </>
      ) : null}
    </span>
  );
}

const TRIGGER =
  "inline-flex h-9 items-center rounded-full bg-accent px-5 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:bg-accent-2";

const ITEM =
  "flex w-full items-baseline justify-between gap-3 rounded-xl px-2 py-2 text-xs transition hover:bg-surface-muted";
