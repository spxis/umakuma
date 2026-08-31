import { PAGE_SHELL_PADDING } from "@/app/shared/pageShell";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import SurfacePagination from "@/app/shared/SurfacePagination";
import { toPaginationPlacement } from "@/app/shared/paginationPlacement";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accountUrlKeyWhere } from "@/lib/accountLookup";
import { PRACTICE_SOURCES, isPracticeSource, isTaggedPracticeSource, practiceEntriesFor, practiceLevelCounts } from "@/lib/practiceSource";
import { decodeSelection, encodeSelection, SELECTION_PARAM } from "@/app/shared/subjectSelection";

import { canViewUserPage, resolveViewerMenuInfo } from "../../userPageAuth";
import { GRADE_OPTIONS, GRADE_SHORT_LABELS, gradeHref, parseGradeParam, parsePageParam } from "../gradeExplorerView";
import PrintButton from "./PrintButton";
import { JLPT_CLASSIC_LEVELS, JLPT_LEVELS, PRACTICE_PAGE_SIZE, PRACTICE_SHEET_COPY, toSheetSize, WANIKANI_MAX_LEVEL } from "./practiceCopy";
import SheetOptionsRow from "./SheetOptionsRow";
import { PRACTICE_PAGINATION_DEFAULT, sheetHref, type SheetSettings } from "./sheetLink";
import TracingSheet, { type SheetMode, type TraceEntry } from "./TracingSheet";

type PageProps = {
  params: Promise<{ nickname: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function GradePracticePage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  const { nickname } = await params;
  const query = await searchParams;
  const modeParam = typeof query.mode === "string" ? query.mode : null;
  const mode: SheetMode = modeParam === "strokes" ? "strokes" : "trace";
  /*
   * The chooser is a URL state, not component state, so the page stays a
   * server component and a chosen sheet is still a link somebody can send or
   * print. Selecting the active source toggles it.
   */
  const choosing = firstValue(query.pick) === "1";
  /*
   * The model column defaults on and the readings default off, which is the
   * sheet as it printed before these became choices. Neither is a judgement
   * about which is better - that is what the checkboxes are for.
   */
  const showModel = firstValue(query.model) !== "0";
  const showReadings = firstValue(query.readings) === "1";
  /*
   * Both ends by default here, unlike the shared component's own default. A
   * sheet is a page of tracing squares: reaching page four meant scrolling past
   * three of them to find the only Next link on the page.
   */
  const placement = toPaginationPlacement(firstValue(query.pager), PRACTICE_PAGINATION_DEFAULT);
  const size = toSheetSize(firstValue(query.size));

  const account = await prisma.account.findFirst({
    where: accountUrlKeyWhere(decodeURIComponent(nickname)),
    select: { id: true, wkUsername: true, wkLevel: true, lastSyncedAt: true, lastActivityAt: true },
  });
  if (!account) {
    notFound();
  }
  if (!canViewUserPage({
    viewerEmail,
    viewerMenuInfo,
    targetWkUsername: decodeURIComponent(nickname),
    targetSlug: decodeURIComponent(nickname),
  })) {
    redirect("/join?access=denied");
  }

  /*
   * A hand-picked sheet carries its characters in the URL rather than in the
   * database. That keeps a chosen set shareable and printable before anything
   * has been saved - which is the whole point of choosing being a surface
   * control rather than a feature of one page.
   */
  const picked = decodeSelection(firstValue(query[SELECTION_PARAM]));

  const grade = parseGradeParam(firstValue(query.grade));
  const page = parsePageParam(firstValue(query.page));

  const viewerWkLevel = account.wkLevel ?? 1;
  const rawSource = firstValue(query.source) ?? PRACTICE_SOURCES.grade;
  const source = isPracticeSource(rawSource) ? rawSource : PRACTICE_SOURCES.grade;
  const level = source === PRACTICE_SOURCES.grade ? grade : Number(firstValue(query.level) ?? "1");

  // Only fetched while the chooser is open, so a closed sheet pays nothing.
  const levelCounts = choosing && !isTaggedPracticeSource(source)
    ? await practiceLevelCounts(source)
    : {};

  const { entries, total } = await practiceEntriesFor(
    source,
    Number.isFinite(level) ? level : 1,
    page,
    PRACTICE_PAGE_SIZE,
    account.id,
    picked,
  );

  const settings: SheetSettings = {
    picked: encodeSelection(picked),
    source,
    grade,
    level,
    page,
    mode,
    showModel,
    showReadings,
    placement,
    size,
    choosing,
  };

  const pageCount = Math.max(1, Math.ceil(total / PRACTICE_PAGE_SIZE));
  const pageHref = (next: number) => sheetHref(settings, { page: next });

  const sheetLabel =
    source === PRACTICE_SOURCES.picked
      ? PRACTICE_SHEET_COPY.fromPicked
      : source === PRACTICE_SOURCES.trouble
      ? PRACTICE_SHEET_COPY.fromTrouble
      : source === PRACTICE_SOURCES.favorite
        ? PRACTICE_SHEET_COPY.fromFavourite
        : source === PRACTICE_SOURCES.wanikani
          ? `WaniKani L${level}`
          : source === PRACTICE_SOURCES.jlpt
            ? `JLPT N${level}`
            : GRADE_SHORT_LABELS[grade];

  return (
    <div className={`w-full bg-white text-neutral-900 ${PAGE_SHELL_PADDING} print:px-0 print:py-0`}>
      {/* Site chrome on screen, gone on paper - a printed sheet is not a web page. */}
      <AppTopMenuRow
        viewerMenuInfo={viewerMenuInfo}
        primaryWkUsername={decodeURIComponent(nickname)}
        accountId={account.id}
        showAdminActions={isAdminEmail(viewerEmail)}
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
            {PRACTICE_SHEET_COPY.heading} · {sheetLabel}
          </h1>
          <p className="text-xs text-neutral-500">{PRACTICE_SHEET_COPY.subtitle}</p>
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

        <div className="flex items-center gap-2 print:hidden">
          <Link
            href={gradeHref(decodeURIComponent(nickname), grade)}
            className="inline-flex h-9 items-center rounded-full border border-neutral-300 px-4 text-xs font-bold uppercase tracking-[0.08em] text-neutral-600 transition hover:bg-neutral-100"
          >
            {PRACTICE_SHEET_COPY.back}
          </Link>
          <PrintButton />
        </div>
      </header>

      <nav className="mb-4 flex flex-wrap items-center gap-1.5 print:hidden">
        <span className="mr-1 text-[11px] font-black uppercase tracking-[0.08em] text-neutral-400">
          {PRACTICE_SHEET_COPY.sourceLabel}
        </span>
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
              className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-bold transition ${
                active
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {label} {target}
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
                className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-bold transition ${
                  active
                    ? "border-neutral-900 bg-neutral-900 text-white opacity-100"
                    : "border-neutral-300 text-neutral-600 opacity-0 hover:bg-neutral-100 focus-visible:opacity-100 group-hover/tags:opacity-100 [@media(hover:none)]:opacity-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </span>

        <span className="ml-2 mr-1 text-[11px] font-black uppercase tracking-[0.08em] text-neutral-400">
          {PRACTICE_SHEET_COPY.modeLabel}
        </span>
        {([
          ["trace", PRACTICE_SHEET_COPY.modeTrace],
          ["strokes", PRACTICE_SHEET_COPY.modeStrokes],
        ] as const).map(([id, label]) => (
          <Link
            key={id}
            href={sheetHref(settings, { mode: id })}
            className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-bold transition ${
              id === mode
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {label}
          </Link>
        ))}

      </nav>

      {/*
        * The second row: every value the active source offers, so a sheet can
        * be changed here instead of going back to the grade page and in
        * again. Which values appear follows the source, since a WaniKani level
        * and a school grade are not the same list.
        */}
      {choosing && !isTaggedPracticeSource(source) ? (
        <nav className="mb-4 flex flex-wrap items-center gap-1.5 border-l-2 border-neutral-200 pl-3 print:hidden">
          <span className="mr-1 text-[11px] font-black uppercase tracking-[0.08em] text-neutral-400">
            {PRACTICE_SHEET_COPY.chooseLabel}
          </span>
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
                className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-[11px] font-bold transition ${
                  value === current
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {label}
                {typeof levelCounts[value] === "number" ? (
                  <span className="ml-1 font-semibold text-neutral-400">({levelCounts[value]})</span>
                ) : null}
              </Link>
            );
          })}

          <Link
            href={sheetHref(settings, { page: 1, choosing: false })}
            className="ml-4 inline-flex h-7 items-center rounded-full border border-neutral-400 px-3 text-[11px] font-bold text-neutral-600 transition hover:bg-neutral-100"
          >
            {PRACTICE_SHEET_COPY.closeChooser}
          </Link>
        </nav>
      ) : null}

      <SheetOptionsRow settings={settings} />

      {/*
        * Said plainly rather than shrinking the squares to fit. A square small
        * enough for a phone is too small to write a kanji inside, so the sheet
        * would look right and be useless. Nothing is blocked - it is a notice,
        * not a wall - and it does not print.
        */}
      <p className="mb-4 rounded-xl border border-neutral-300 bg-neutral-50 p-3 text-xs text-neutral-600 sm:hidden print:hidden">
        <span className="block font-black text-neutral-800">{PRACTICE_SHEET_COPY.phoneNoticeHeading}</span>
        {PRACTICE_SHEET_COPY.phoneNoticeBody}
      </p>

      <SurfacePagination
        slot="top"
        placement={placement}
        page={page}
        pageCount={pageCount}
        hrefFor={pageHref}
      />

      {entries.length === 0 ? (
        <p className="rounded-xl border border-neutral-300 p-4 text-sm">
          {isTaggedPracticeSource(source) ? PRACTICE_SHEET_COPY.emptyTagged : PRACTICE_SHEET_COPY.empty}
        </p>
      ) : (
        <TracingSheet entries={entries} mode={mode} showModel={showModel} showReadings={showReadings} size={size} />
      )}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-400">
        <span>{PRACTICE_SHEET_COPY.credit}</span>
        <span className="print:hidden">
          {PRACTICE_SHEET_COPY.perPage} {(page - 1) * PRACTICE_PAGE_SIZE + 1}–
          {(page - 1) * PRACTICE_PAGE_SIZE + entries.length} of {total}
        </span>
      </footer>

      <SurfacePagination
        slot="bottom"
        placement={placement}
        page={page}
        pageCount={pageCount}
        hrefFor={pageHref}
      />
      </div>
    </div>
  );
}
