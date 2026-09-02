import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import { authOptions, isAdminEmail } from "@/lib/auth";
import userBanner from "@/images/umakuma-banner1-transparent.png";
import { prisma } from "@/lib/prisma";
import { accountUrlKeyWhere } from "@/lib/accountLookup";
import { getSchoolGradeFile, getSchoolGradeIndex, querySchoolGradeCatalog } from "@/lib/schoolGrades";
import { withOfficialReadings } from "@/lib/gradeReadings";

import { canViewUserPage, resolveViewerMenuInfo } from "../../userPageAuth";
import { viewsOwnPage } from "@/app/shared/viewerAddress";
import { GRADE_EXPLORER_COPY, GRADE_PAGE_SIZE } from "../GradeExplorer.constants";
import GradeKanjiBoard from "../GradeKanjiBoard";
import { gradeSearchSuggestions, GRADE_OPTIONS, GRADE_SHORT_LABELS, gradeHref, pageRange, parseGradeSegment, parsePageParam } from "../gradeExplorerView";
import { noTranslateClass } from "@/app/shared/japaneseText";

/** One id for the suggestion list, since the page renders one search box. */
const SEARCH_LIST_ID = "grade-search-suggestions";

type PageProps = {
  params: Promise<{ nickname: string; grade: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function UserGradesPage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  const { nickname, grade: gradeSegment } = await params;
  const userKey = decodeURIComponent(nickname);
  const query = await searchParams;

  const account = await prisma.account.findFirst({
    where: accountUrlKeyWhere(userKey),
    select: { id: true, nickname: true, wkUsername: true, lastSyncedAt: true, lastActivityAt: true },
  });

  if (!account) {
    notFound();
  }

  if (!canViewUserPage({ viewerEmail, viewerMenuInfo, targetWkUsername: userKey, targetSlug: userKey })) {
    redirect("/join?access=denied");
  }

  /* A segment that names no grade is a wrong link, not grade one. */
  const grade = parseGradeSegment(gradeSegment);
  if (grade === null) {
    notFound();
  }
  const page = parsePageParam(firstValue(query.page));
  const search = (firstValue(query.q) ?? "").trim();

  const catalog = querySchoolGradeCatalog({
    page,
    pageSize: GRADE_PAGE_SIZE,
    grade,
    search: search || null,
    sortBy: "grade",
    sortDir: "asc",
  });

  /*
   * The whole grade, not the page: the search reads the whole grade, so the
   * suggestions have to as well. It is a local catalogue file that is already
   * in memory, so this costs the page nothing but the options themselves.
   */
  const suggestions = gradeSearchSuggestions(getSchoolGradeFile(grade)?.kanji ?? []);

  const index = getSchoolGradeIndex();
  const countsByGrade = new Map((index?.grades ?? []).map((entry) => [entry.grade, entry]));
  const total = catalog.pagination.totalItems;
  const { first, last } = pageRange(page, total);

  return (
    <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
      <AppTopMenuRow
        viewerMenuInfo={viewerMenuInfo}
        primaryWkUsername={userKey}
        accountId={account.id}
        showAdminActions={isAdminEmail(viewerEmail)}
        lastSyncedAt={account.lastSyncedAt?.toISOString() ?? null}
        lastActivityAt={account.lastActivityAt?.toISOString() ?? null}
        className="mb-4"
      />

      <section className="mb-4 overflow-hidden rounded-2xl border border-line bg-surface/90 px-5 py-4 shadow-[0_20px_55px_rgba(8,16,36,0.12)]">
        <div className="flex items-center gap-4">
          <Image src={userBanner} alt="" width={64} height={64} className="hidden h-16 w-16 shrink-0 rounded-xl object-contain sm:block" priority />
          <div className="min-w-0">
            <h1 className="text-xl font-black text-foreground">{GRADE_EXPLORER_COPY.heading}</h1>
            <p className="text-xs uppercase tracking-[0.08em] text-foreground/70">{GRADE_EXPLORER_COPY.subtitle}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface/90 shadow-[0_20px_55px_rgba(8,16,36,0.12)]">
        <header className="border-b border-line bg-surface/90 px-5 py-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
              {GRADE_EXPLORER_COPY.gradeLabel}
            </span>
            {GRADE_OPTIONS.map((option) => {
              const meta = countsByGrade.get(option);
              const active = option === grade;
              return (
                <Link
                  key={option}
                  href={gradeHref(userKey, option, 1, search)}
                  className={`inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-bold transition ${
                    active
                      ? "border-kanji bg-kanji text-white"
                      : "border-line bg-surface text-foreground/75 hover:bg-surface-muted"
                  }`}
                >
                  {GRADE_SHORT_LABELS[option]}
                  <span translate="no" className={noTranslateClass(active ? "text-white/70" : "text-foreground/60")}>
                    {`(${meta?.totalCount ?? 0})`}
                  </span>
                </Link>
              );
            })}
          </div>

          <Link
            href={`/users/${encodeURIComponent(userKey)}/practice/grade/${grade}`}
            className="mt-3 inline-flex h-8 items-center rounded-full border border-kanji/40 bg-kanji/10 px-4 text-xs font-black uppercase tracking-[0.08em] text-kanji transition hover:bg-kanji/20"
          >
            {GRADE_EXPLORER_COPY.practiceSheet}
          </Link>

          {/*
            * Submits to this grade's own address.
            *
            * It used to post to the collection root with the grade as a hidden
            * field, which is the shape from when a grade lived in the query.
            * The root reads no grade any more - it only opens the first one -
            * so searching from grade 3 landed on grade 1 with the search
            * dropped as well. The grade is in the path, so the form posts
            * there and `q` is the only thing it carries.
            */}
          <form
            className="mt-3 flex flex-wrap items-center gap-2"
            action={`/users/${encodeURIComponent(userKey)}/grades/${grade}`}
          >
            {/*
              * Suggests the grade's own kanji as you type, the way every
              * other search here does. Without it the box asked a learner to
              * already know the character they came to look up.
              */}
            <input
              type="search"
              name="q"
              defaultValue={search}
              list={suggestions.length > 0 ? SEARCH_LIST_ID : undefined}
              placeholder={GRADE_EXPLORER_COPY.searchPlaceholder}
              className="h-9 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-sm text-foreground outline-none placeholder:text-foreground/60 focus-visible:ring-2 focus-visible:ring-accent/40"
            />
            {suggestions.length > 0 ? (
              <datalist id={SEARCH_LIST_ID}>
                {suggestions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </datalist>
            ) : null}
            <button type="submit" className="inline-flex h-9 shrink-0 items-center rounded-full bg-accent px-4 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:brightness-95">
              {GRADE_EXPLORER_COPY.search}
            </button>
            {search ? (
              <Link href={gradeHref(userKey, grade)} className="inline-flex h-9 shrink-0 items-center rounded-full border border-line bg-surface px-4 text-xs font-bold uppercase tracking-[0.08em] text-foreground/75 transition hover:bg-surface-muted">
                {GRADE_EXPLORER_COPY.clear}
              </Link>
            ) : null}
          </form>

        </header>
      </section>

      {/*
        * Results in a card of their own, with a gap, matching both explorers.
        * Filters and results shared one card here, divided by a hairline, so
        * the three sibling pages read as two different layouts.
        */}
      <section className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface/90 shadow-[0_20px_55px_rgba(8,16,36,0.12)]">
        <div className="p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60">
            {GRADE_EXPLORER_COPY.showing} {first}-{last} {GRADE_EXPLORER_COPY.of} {total} {GRADE_EXPLORER_COPY.kanjiWord}
            {" · "}
            {GRADE_EXPLORER_COPY.curriculumNote}
          </p>

          <GradeKanjiBoard
            key={`${grade}:${page}:${search}`}
            items={withOfficialReadings(catalog.items)}
            practicePath={`/users/${encodeURIComponent(nickname)}/practice`}
            accountId={viewsOwnPage(viewerMenuInfo, userKey) ? account.id : null}
          />

          {catalog.pagination.totalPages > 1 ? (
            <nav className="mt-4 flex items-center justify-between gap-3">
              {catalog.pagination.hasPrevPage ? (
                <Link href={gradeHref(userKey, grade, page - 1, search)} className="inline-flex h-9 items-center rounded-full border border-line bg-surface px-4 text-xs font-bold uppercase tracking-[0.08em] text-foreground/75 transition hover:bg-surface-muted">
                  {GRADE_EXPLORER_COPY.previous}
                </Link>
              ) : <span />}
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60">
                {GRADE_EXPLORER_COPY.page} {page} {GRADE_EXPLORER_COPY.of} {catalog.pagination.totalPages}
              </span>
              {catalog.pagination.hasNextPage ? (
                <Link href={gradeHref(userKey, grade, page + 1, search)} className="inline-flex h-9 items-center rounded-full border border-line bg-surface px-4 text-xs font-bold uppercase tracking-[0.08em] text-foreground/75 transition hover:bg-surface-muted">
                  {GRADE_EXPLORER_COPY.next}
                </Link>
              ) : <span />}
            </nav>
          ) : null}
        </div>
      </section>
    </div>
  );
}
