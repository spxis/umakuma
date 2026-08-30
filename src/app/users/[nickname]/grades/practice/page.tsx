import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { querySchoolGradeCatalog } from "@/lib/schoolGrades";
import { withOfficialReadings } from "@/lib/gradeReadings";
import { getStrokeOrder } from "@/lib/strokeOrder";

import { canViewUserPage, resolveViewerMenuInfo } from "../../userPageAuth";
import { GRADE_SHORT_LABELS, gradeHref, parseGradeParam, parsePageParam } from "../gradeExplorerView";
import PrintButton from "./PrintButton";
import { PRACTICE_PAGE_SIZE, PRACTICE_SHEET_COPY } from "./practiceCopy";
import TracingSheet, { type TraceEntry } from "./TracingSheet";

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

  const account = await prisma.account.findFirst({
    where: { wkUsername: decodeURIComponent(nickname) },
    select: { wkUsername: true },
  });
  if (!account) {
    notFound();
  }
  if (!canViewUserPage({ viewerEmail, viewerMenuInfo, targetWkUsername: account.wkUsername })) {
    redirect("/join?access=denied");
  }

  const grade = parseGradeParam(firstValue(query.grade));
  const page = parsePageParam(firstValue(query.page));

  const catalog = querySchoolGradeCatalog({
    page,
    pageSize: PRACTICE_PAGE_SIZE,
    grade,
    search: null,
    sortBy: "grade",
    sortDir: "asc",
  });

  /*
   * Only characters with stroke data can be traced, and a sheet of empty
   * squares would be worse than a shorter sheet.
   */
  const entries: TraceEntry[] = withOfficialReadings(catalog.items)
    .map((item) => {
      const strokes = getStrokeOrder(item.kanji, item.grade);
      if (!strokes) {
        return null;
      }

      return {
        kanji: item.kanji,
        meaning: item.primaryMeaning ?? null,
        strokes: strokes.strokes,
        strokeCount: strokes.strokeCount,
        viewBox: strokes.viewBox,
      };
    })
    .filter((entry): entry is TraceEntry => entry !== null);

  return (
    <div className="mx-auto w-full max-w-4xl bg-white px-5 py-6 text-neutral-900 print:max-w-none print:px-0 print:py-0">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 print:mb-2">
        <div className="min-w-0">
          <h1 className="text-xl font-black">
            {PRACTICE_SHEET_COPY.heading} · {GRADE_SHORT_LABELS[grade]}
          </h1>
          <p className="text-xs text-neutral-500">{PRACTICE_SHEET_COPY.subtitle}</p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <Link
            href={gradeHref(account.wkUsername, grade)}
            className="inline-flex h-9 items-center rounded-full border border-neutral-300 px-4 text-xs font-bold uppercase tracking-[0.08em] text-neutral-600 transition hover:bg-neutral-100"
          >
            {PRACTICE_SHEET_COPY.back}
          </Link>
          <PrintButton />
        </div>
      </header>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-neutral-300 p-4 text-sm">{PRACTICE_SHEET_COPY.empty}</p>
      ) : (
        <TracingSheet entries={entries} />
      )}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-400">
        <span>{PRACTICE_SHEET_COPY.credit}</span>
        <span className="print:hidden">
          {PRACTICE_SHEET_COPY.perPage} {(page - 1) * PRACTICE_PAGE_SIZE + 1}–
          {(page - 1) * PRACTICE_PAGE_SIZE + entries.length} of {catalog.pagination.totalItems}
        </span>
      </footer>

      <nav className="mt-3 flex items-center justify-between gap-3 print:hidden">
        {catalog.pagination.hasPrevPage ? (
          <Link href={`?grade=${grade}&page=${page - 1}`} className="text-xs font-bold uppercase tracking-[0.08em] text-neutral-600 underline">
            Previous
          </Link>
        ) : <span />}
        {catalog.pagination.hasNextPage ? (
          <Link href={`?grade=${grade}&page=${page + 1}`} className="text-xs font-bold uppercase tracking-[0.08em] text-neutral-600 underline">
            Next
          </Link>
        ) : <span />}
      </nav>
    </div>
  );
}
