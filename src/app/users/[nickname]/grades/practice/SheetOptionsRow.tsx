import Link from "next/link";

import { PAGINATION_PLACEMENTS } from "@/app/shared/paginationPlacement";

import { PRACTICE_SHEET_COPY, SHEET_SIZE_ORDER, type SheetSize } from "./practiceCopy";
import { sheetHref, type SheetSettings } from "./sheetLink";

/**
 * How the sheet is drawn, as opposed to what is on it.
 *
 * The source row above chooses which characters; everything here is about the
 * page they land on - whether the finished character occupies the first
 * column, whether readings print, how big the squares are, where the pager
 * sits. All of it rides in the URL, so a sheet set up a particular way is
 * still a link.
 */

const CHIP = "inline-flex h-7 items-center rounded-full border text-[11px] font-bold transition";
const CHIP_ON = "border-neutral-900 bg-neutral-900 text-white";
const CHIP_OFF = "border-neutral-300 text-neutral-600 hover:bg-neutral-100";
const GROUP_LABEL = "ml-2 text-[11px] font-black uppercase tracking-[0.08em] text-neutral-400";

const SIZE_LABELS: Record<SheetSize, string> = {
  large: PRACTICE_SHEET_COPY.sizeLarge,
  medium: PRACTICE_SHEET_COPY.sizeMedium,
  small: PRACTICE_SHEET_COPY.sizeSmall,
};

/**
 * S, M and L say nothing about who they are for, so the reason lives in the
 * title. A parent printing for a six-year-old and a student copying vocabulary
 * want opposite ends of this control and neither can guess which.
 */
const SIZE_TITLES: Record<SheetSize, string> = {
  large: PRACTICE_SHEET_COPY.sizeLargeTitle,
  medium: PRACTICE_SHEET_COPY.sizeMediumTitle,
  small: PRACTICE_SHEET_COPY.sizeSmallTitle,
};

const PAGER_LABELS: Record<(typeof PAGINATION_PLACEMENTS)[number], string> = {
  top: PRACTICE_SHEET_COPY.pagerTop,
  bottom: PRACTICE_SHEET_COPY.pagerBottom,
  both: PRACTICE_SHEET_COPY.pagerBoth,
  none: PRACTICE_SHEET_COPY.pagerNone,
};

function Checkbox({ label, on, href }: { label: string; on: boolean; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-600 transition hover:text-neutral-900"
    >
      <span
        aria-hidden="true"
        className={`inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] font-black ${
          on ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-400 text-transparent"
        }`}
      >
        ✓
      </span>
      {label}
    </Link>
  );
}

export default function SheetOptionsRow({ settings }: { settings: SheetSettings }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-4 print:hidden">
      <span className="text-[11px] font-black uppercase tracking-[0.08em] text-neutral-400">
        {PRACTICE_SHEET_COPY.optionsLabel}
      </span>

      <Checkbox
        label={PRACTICE_SHEET_COPY.optionShowModel}
        on={settings.showModel}
        href={sheetHref(settings, { showModel: !settings.showModel })}
      />
      <Checkbox
        label={PRACTICE_SHEET_COPY.optionShowReadings}
        on={settings.showReadings}
        href={sheetHref(settings, { showReadings: !settings.showReadings })}
      />

      {/*
        * How big the squares are. A child needs a box big enough to form a
        * character inside; a university student copying vocabulary wants small
        * ones and many. The sheet only ever offered the child's.
        */}
      <span className={GROUP_LABEL}>{PRACTICE_SHEET_COPY.sizeLabel}</span>
      <span className="flex items-center gap-1.5">
        {SHEET_SIZE_ORDER.map((size) => (
          <Link
            key={size}
            href={sheetHref(settings, { size })}
            title={SIZE_TITLES[size]}
            className={`${CHIP} w-8 justify-center ${size === settings.size ? CHIP_ON : CHIP_OFF}`}
          >
            {SIZE_LABELS[size]}
          </Link>
        ))}
      </span>

      {/*
        * Where the pager sits. Someone printing a single sheet wants neither
        * end; someone working through a grade on screen wants both, because
        * the foot of a tracing sheet is three thousand pixels down.
        */}
      <span className={GROUP_LABEL}>{PRACTICE_SHEET_COPY.pagerLabel}</span>
      <span className="flex items-center gap-1.5">
        {PAGINATION_PLACEMENTS.map((placement) => (
          <Link
            key={placement}
            href={sheetHref(settings, { placement })}
            className={`${CHIP} px-3 ${placement === settings.placement ? CHIP_ON : CHIP_OFF}`}
          >
            {PAGER_LABELS[placement]}
          </Link>
        ))}
      </span>
    </nav>
  );
}
