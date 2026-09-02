import Link from "next/link";

import { PRACTICE_SHEET_COPY, SHEET_CHIP, SHEET_SIZE_ORDER, type SheetSize } from "./practiceCopy";
import { sheetHref, type SheetSettings } from "./sheetLink";

/**
 * How the sheet is drawn, as opposed to what is on it.
 *
 * The source row above chooses which characters; everything here is about the
 * page they land on - whether the finished character occupies the first
 * column, whether readings print, how big the squares are. All of it rides in
 * the URL, so a sheet set up a particular way is still a link.
 *
 * Where the pager sits was a control here too, and it is not any more. It asked
 * the reader to make a layout decision about a component rather than about
 * their sheet, and the answer was the same every time: both ends, because the
 * foot of a tracing sheet is three thousand pixels down. It survives as a URL
 * parameter for the print layout to set - see `pagerPlacement` on the page.
 */

const CHIP = `${SHEET_CHIP.base} h-7 text-[11px]`;
/*
 * Label and chips wrap as one unit. They were siblings of the row, so at a
 * narrow width the row broke between "Pages" and its buttons and left the
 * heading stranded at the end of the line above.
 */
const GROUP = "flex items-center gap-1.5";

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

function Checkbox({ label, on, href }: { label: string; on: boolean; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-xs font-semibold text-foreground/70 transition hover:text-foreground"
    >
      <span
        aria-hidden="true"
        className={`inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] font-black ${
          on ? SHEET_CHIP.on : "border-line text-transparent"
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
      <span className={SHEET_CHIP.label}>{PRACTICE_SHEET_COPY.optionsLabel}</span>

      {/*
        * The finished character in the first column is a tracing idea. A
        * reference sheet is nothing but finished characters, so the control
        * would toggle nothing and reads as broken.
        */}
      {settings.mode === "reference" ? null : (
        <Checkbox
          label={PRACTICE_SHEET_COPY.optionShowModel}
          on={settings.showModel}
          href={sheetHref(settings, { showModel: !settings.showModel })}
        />
      )}
      <Checkbox
        label={PRACTICE_SHEET_COPY.optionShowReadings}
        on={settings.showReadings}
        href={sheetHref(settings, { showReadings: !settings.showReadings })}
      />
      <Checkbox
        label={PRACTICE_SHEET_COPY.optionShowNumbers}
        on={settings.showNumbers}
        href={sheetHref(settings, { showNumbers: !settings.showNumbers })}
      />

      {/*
        * How big the squares are. A child needs a box big enough to form a
        * character inside; a university student copying vocabulary wants small
        * ones and many. The sheet only ever offered the child's.
        */}
      <span className={GROUP}>
        <span className={`${SHEET_CHIP.label} mr-0.5`}>
          {settings.mode === "reference" ? PRACTICE_SHEET_COPY.columnsLabel : PRACTICE_SHEET_COPY.sizeLabel}
        </span>
        {/*
          * Back to page one. A page holds a different number of characters at
          * each size - it is three sheets of paper, not a fixed count - so
          * page four of the small sheet is not page four of the large one.
          */}
        {SHEET_SIZE_ORDER.map((size) => (
          <Link
            key={size}
            href={sheetHref(settings, { size, page: 1 })}
            title={SIZE_TITLES[size]}
            className={`${CHIP} w-8 justify-center ${size === settings.size ? SHEET_CHIP.on : SHEET_CHIP.off}`}
          >
            {SIZE_LABELS[size]}
          </Link>
        ))}
      </span>

    </nav>
  );
}
