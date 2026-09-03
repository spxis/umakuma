import { PAGE_SHELL_PADDING } from "@/app/shared/pageShell";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import SurfacePagination from "@/app/shared/SurfacePagination";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accountUrlKeyWhere } from "@/lib/accountLookup";
import { PRACTICE_SOURCES, isTaggedPracticeSource, practiceEntriesFor, practiceLevelCounts } from "@/lib/practiceSource";
import { encodeSelection } from "@/app/shared/subjectSelection";

import { canViewUserPage, resolveViewerMenuInfo } from "../../userPageAuth";
import { parsePracticeTarget } from "../practiceAddress";
import { readSheetOptions, sheetLabelFor } from "../sheetOptions";
import { GRADE_OPTIONS, GRADE_SHORT_LABELS } from "../../grades/gradeExplorerView";
import PrintButton from "../PrintButton";
import { JLPT_CLASSIC_LEVELS, JLPT_LEVELS, PRACTICE_SHEET_COPY, SHEET_CHIP, WANIKANI_MAX_LEVEL } from "../practiceCopy";
import SheetOptionsRow from "../SheetOptionsRow";
import { printNowHref, sheetHref, type SheetSettings } from "../sheetLink";
import SheetBody from "../SheetBody";
import { NO_TRANSLATE_CLASS } from "@/app/shared/japaneseText";

type PageProps = {
  params: Promise<{ nickname: string; target?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GradePracticePage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  const { nickname, target: rawTarget } = await params;

  /*
   * The collection is in the path now, so a wrong one is a 404 rather than a
   * silent fall back to grade one, and `/practice` on its own opens the
   * chooser - which is the point of it being a surface of its own.
   */
  const target = parsePracticeTarget(rawTarget);
  if (target === "invalid") {
    notFound();
  }
  const query = await searchParams;
  const {
    mode,
    choosing,
    showModel,
    showReadings,
    showNumbers,
    placement,
    size,
    printAll,
    printNow,
    pageSize,
    picked,
    page,
    listKey,
    source,
    level,
    grade,
  } = readSheetOptions(query, target);

  const account = await prisma.account.findFirst({
    where: accountUrlKeyWhere(decodeURIComponent(nickname)),
    select: { id: true, wkUsername: true, wkLevel: true, lastSyncedAt: true, lastActivityAt: true },
  });
  if (!account) {
    notFound();
  }
  const isAdmin = isAdminEmail(viewerEmail);
  if (!canViewUserPage({
    viewerEmail,
    viewerMenuInfo,
    targetWkUsername: decodeURIComponent(nickname),
    targetSlug: decodeURIComponent(nickname),
  })) {
    redirect("/join?access=denied");
  }

  const viewerWkLevel = account.wkLevel ?? 1;

  // Only fetched while the chooser is open, so a closed sheet pays nothing.
  const levelCounts = choosing && !isTaggedPracticeSource(source)
    ? await practiceLevelCounts(source)
    : {};

  /*
   * `account` is whose practice page this is, and `canViewUserPage` above has
   * already established that the reader is that member or an admin - so it is
   * the reader, and the list's own visibility is what decides the rest.
   */
  const { entries, total, listName, missing } = await practiceEntriesFor(
    source,
    Number.isFinite(level) ? level : 1,
    page,
    pageSize,
    {
      accountId: account.id,
      isAdmin,
      picked,
      slug: target?.slug ?? null,
      owner: target?.owner ?? null,
      key: listKey,
    },
  );

  /*
   * A list nobody may read, and a list nobody has, are the same 404 the
   * list's own page gives. Without this an address naming somebody else's
   * private list renders as a working sheet that happens to be blank, which
   * is exactly the "broken link that looks like a working one" the rest of
   * this page's addressing was written to avoid.
   */
  if (missing) {
    notFound();
  }

  const settings: SheetSettings = {
    nickname: decodeURIComponent(nickname),
    picked: encodeSelection(picked),
    slug: target?.slug ?? null,
    owner: target?.owner ?? null,
    listKey,
    source,
    grade,
    level,
    page,
    mode,
    showModel,
    showReadings,
    showNumbers,
    placement,
    size,
    choosing,
    printAll,
  };

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pageHref = (next: number) => sheetHref(settings, { page: next });
  /* Switching layout restarts the count: page three of twenty is not page three of 250. */
  const printAllHref = printNowHref(settings, { printAll: true, page: 1 });
  /*
   * In the print layout the pager steps between print runs rather than between
   * reading pages, so it says so - and it shows whatever the reader chose,
   * because with the runs hidden there is no way to reach the second one.
   */
  const pagerPlacement = printAll ? "both" : placement;
  const pagerSummary = printAll
    ? `${PRACTICE_SHEET_COPY.printRunLabel} ${page} ${PRACTICE_SHEET_COPY.printRunOf} ${pageCount}`
    : undefined;

  const sheetLabel = sheetLabelFor({ source, level, grade }, listName);

  return (
    /*
     * The page belongs to the site; only the sheet belongs to the printer. It
     * was painted white and grey throughout because it is made to be printed,
     * which left the one page in the app that looked like a photocopy of the
     * others. `data-print="mono"` marks the region the print rules strip back.
     */
    <div
      data-print="mono"
      className={`w-full text-foreground ${PAGE_SHELL_PADDING} print:bg-white print:px-0 print:py-0 print:text-neutral-900`}
    >
      {/* Site chrome on screen, gone on paper - a printed sheet is not a web page. */}
      <AppTopMenuRow
        viewerMenuInfo={viewerMenuInfo}
        primaryWkUsername={decodeURIComponent(nickname)}
        accountId={account.id}
        showAdminActions={isAdmin}
        lastSyncedAt={account.lastSyncedAt?.toISOString() ?? null}
        lastActivityAt={account.lastActivityAt?.toISOString() ?? null}
        className="mb-4 print:hidden"
      />

      {/*
        * The sheet keeps its A4 column; the navigation above it does not. They
        * shared one wrapper, so the narrower width wrapped the header onto an
        * extra line and pushed this page's sub-nav 21px below its siblings'.
        */}
      <div className="mx-auto w-full max-w-4xl print:max-w-none">

      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 print:mb-2">
        <div className="min-w-0">
          <h1 className="text-xl font-black">
            {mode === "reference" ? PRACTICE_SHEET_COPY.referenceHeading : PRACTICE_SHEET_COPY.heading} · {sheetLabel}
          </h1>
          <p className="text-xs text-foreground/60 print:text-neutral-500">
            {mode === "reference" ? PRACTICE_SHEET_COPY.referenceSubtitle : PRACTICE_SHEET_COPY.subtitle}
          </p>
        </div>

        {/*
          * Only on paper. A printed sheet goes into a folder with other
          * printed sheets, so it needs somewhere to write whose it is and
          * when - the two things a screen never has to ask.
          */}
        <div className="hidden items-end gap-6 text-[11px] uppercase tracking-[0.08em] text-neutral-500 print:flex">
          <span className="flex items-end gap-2">
            {PRACTICE_SHEET_COPY.printName}
            <span className="inline-block w-44 border-b border-neutral-400" />
          </span>
          <span className="flex items-end gap-2">
            {PRACTICE_SHEET_COPY.printDate}
            <span className="inline-block w-28 border-b border-neutral-400" />
          </span>
        </div>

        {/*
          * No "back to grades": practice is not a page you arrive at from the
          * grades explorer any more. It builds sheets from WaniKani levels,
          * JLPT levels, school grades and either tagged list, and the
          * navigation above holds all of them.
          */}
        <div className="flex items-center gap-2 print:hidden">
          <PrintButton
            pageCount={pageCount}
            onThisPage={entries.length}
            total={total}
            allHref={printAllHref}
            printAll={printAll}
            autoPrint={printNow}
          />
        </div>
      </header>

      <nav className="mb-4 flex flex-wrap items-center gap-1.5 print:hidden">
        <span className={`mr-1 ${SHEET_CHIP.label}`}>{PRACTICE_SHEET_COPY.sourceLabel}</span>
        {([
          [PRACTICE_SOURCES.grade, PRACTICE_SHEET_COPY.fromGrades, grade],
          [PRACTICE_SOURCES.wanikani, PRACTICE_SHEET_COPY.fromWanikani, viewerWkLevel],
          [PRACTICE_SOURCES.jlpt, PRACTICE_SHEET_COPY.fromJlpt, 5],
        ] as const).map(([id, label, defaultLevel]) => {
          const active = id === source;
          const target = id === source ? level : defaultLevel;
          return (
            <Link
              key={id}
              href={sheetHref(settings, {
                source: id,
                level: target,
                page: 1,
                choosing: active && !choosing,
              })}
              className={`${SHEET_CHIP.base} h-8 px-3 text-xs ${active ? SHEET_CHIP.on : SHEET_CHIP.off}`}
            >
              {/* One node: as two, the space between them was the translator's. */}
              <span translate="no" className={NO_TRANSLATE_CLASS}>{`${label} ${target}`}</span>
              {active ? (
                <span aria-hidden="true" className={`ml-2 text-base leading-none transition ${choosing ? "rotate-90" : ""}`}>›</span>
              ) : null}
            </Link>
          );
        })}

        {/*
          * The member's own lists, offered here rather than only where they
          * were tagged. They stay quiet until the row is hovered, since most
          * visits are to a grade and a permanent pair of buttons would compete
          * with the ladder they came for.
          */}
        <span className="group/tags ml-1 inline-flex items-center gap-1.5">
          {([
            [PRACTICE_SOURCES.trouble, PRACTICE_SHEET_COPY.fromTrouble],
            [PRACTICE_SOURCES.favorite, PRACTICE_SHEET_COPY.fromFavourite],
          ] as const).map(([id, label]) => {
            const active = id === source;
            return (
              <Link
                key={id}
                href={sheetHref(settings, { source: id, page: 1, choosing: false })}
                className={`${SHEET_CHIP.base} h-8 px-3 text-xs ${
                  active
                    ? `${SHEET_CHIP.on} opacity-100`
                    : `${SHEET_CHIP.off} opacity-0 focus-visible:opacity-100 group-hover/tags:opacity-100 [@media(hover:none)]:opacity-100`
                }`}
              >
                {label}
              </Link>
            );
          })}
        </span>

        <span className="ml-2 flex items-center gap-1.5">
        <span className={`mr-1 ${SHEET_CHIP.label}`}>{PRACTICE_SHEET_COPY.modeLabel}</span>
        {([
          ["trace", PRACTICE_SHEET_COPY.modeTrace],
          ["strokes", PRACTICE_SHEET_COPY.modeStrokes],
          ["reference", PRACTICE_SHEET_COPY.modeReference],
        ] as const).map(([id, label]) => (
          <Link
            key={id}
            href={sheetHref(settings, { mode: id })}
            className={`${SHEET_CHIP.base} h-8 px-3 text-xs ${id === mode ? SHEET_CHIP.on : SHEET_CHIP.off}`}
          >
            {label}
          </Link>
        ))}
        </span>

      </nav>

      {/*
        * The second row: every value the active source offers, so a sheet can
        * be changed here instead of going back to the grade page and in
        * again. Which values appear follows the source, since a WaniKani level
        * and a school grade are not the same list.
        */}
      {choosing && !isTaggedPracticeSource(source) ? (
        <nav className="mb-4 flex flex-wrap items-center gap-1.5 border-l-2 border-line pl-3 print:hidden">
          <span className={`mr-1 ${SHEET_CHIP.label}`}>{PRACTICE_SHEET_COPY.chooseLabel}</span>
          {(source === PRACTICE_SOURCES.grade
            ? GRADE_OPTIONS.map((value) => ({ value, label: GRADE_SHORT_LABELS[value] }))
            : source === PRACTICE_SOURCES.jlpt
              ? [
                  ...JLPT_LEVELS.map((value) => ({ value, label: `N${value}` })),
                  ...JLPT_CLASSIC_LEVELS.map(({ classic, modern }) => ({
                    value: modern,
                    label: `Level ${classic}`,
                  })),
                ]
              : Array.from({ length: WANIKANI_MAX_LEVEL }, (_, index) => ({
                  value: index + 1,
                  label: String(index + 1),
                }))
          ).map(({ value, label }) => {
            const current = source === PRACTICE_SOURCES.grade ? grade : level;
            const gradeParam = source === PRACTICE_SOURCES.grade ? value : grade;
            return (
              <Link
                key={label}
                href={sheetHref(settings, {
                  grade: gradeParam,
                  level: value,
                  page: 1,
                  // Choosing what is already chosen means you are finished choosing.
                  choosing: value !== current,
                })}
                className={`${SHEET_CHIP.base} h-7 min-w-7 justify-center px-2 text-[11px] ${
                  value === current ? SHEET_CHIP.on : SHEET_CHIP.off
                }`}
              >
                {label}
                {typeof levelCounts[value] === "number" ? (
                  <span className="ml-1 font-semibold opacity-60">({levelCounts[value]})</span>
                ) : null}
              </Link>
            );
          })}

          <Link
            href={sheetHref(settings, { page: 1, choosing: false })}
            className={`ml-4 ${SHEET_CHIP.base} h-7 px-3 text-[11px] ${SHEET_CHIP.off}`}
          >
            {PRACTICE_SHEET_COPY.closeChooser}
          </Link>
        </nav>
      ) : null}

      <SheetOptionsRow settings={settings} />

      {/*
        * Why the sheet suddenly looks different. The reader asked to print
        * everything and got a page with no pager and several hundred
        * characters on it, which without a word of explanation reads as the
        * pagination having broken.
        */}
      {printAll ? (
        <p className="mb-4 rounded-xl border border-line bg-surface-muted/60 p-3 text-xs text-foreground/70 print:hidden">
          <span className="block font-black text-foreground">
            {pageCount > 1 ? PRACTICE_SHEET_COPY.printingRunsHeading : PRACTICE_SHEET_COPY.printingAllHeading}
          </span>
          {pageCount > 1 ? PRACTICE_SHEET_COPY.printingRunsBody : PRACTICE_SHEET_COPY.printingAllBody}{" "}
          <Link
            href={sheetHref(settings, { printAll: false, page: 1 })}
            className="font-black text-accent underline underline-offset-2"
          >
            {PRACTICE_SHEET_COPY.printAllBack}
          </Link>
        </p>
      ) : null}

      {/*
        * Said plainly rather than shrinking the squares to fit. A square small
        * enough for a phone is too small to write a kanji inside, so the sheet
        * would look right and be useless. Nothing is blocked - it is a notice,
        * not a wall - and it does not print.
        *
        * The reference sheet has no squares and is meant to be read, which a
        * phone does perfectly well, so it is not told to find a bigger screen.
        */}
      {mode === "reference" ? null : (
        <p className="mb-4 rounded-xl border border-line bg-surface-muted/60 p-3 text-xs text-foreground/70 sm:hidden print:hidden">
          <span className="block font-black text-foreground">{PRACTICE_SHEET_COPY.phoneNoticeHeading}</span>
          {PRACTICE_SHEET_COPY.phoneNoticeBody}
        </p>
      )}

      <SurfacePagination
        slot="top"
        placement={pagerPlacement}
        page={page}
        pageCount={pageCount}
        hrefFor={pageHref}
        summary={pagerSummary}
      />

      <SheetBody
        entries={entries}
        source={source}
        mode={mode}
        showModel={showModel}
        showReadings={showReadings}
        showNumbers={showNumbers}
        size={size}
        startIndex={(page - 1) * pageSize + 1}
      />

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] text-foreground/60 print:text-neutral-400">
        <span>{mode === "reference" ? PRACTICE_SHEET_COPY.referenceCredit : PRACTICE_SHEET_COPY.credit}</span>
        <span className="print:hidden">
          {PRACTICE_SHEET_COPY.perPage} {(page - 1) * pageSize + 1}–
          {(page - 1) * pageSize + entries.length} of {total}
        </span>
      </footer>

      <SurfacePagination
        slot="bottom"
        placement={pagerPlacement}
        page={page}
        pageCount={pageCount}
        hrefFor={pageHref}
        summary={pagerSummary}
      />
      </div>
    </div>
  );
}
