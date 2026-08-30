import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accountUrlKeyWhere } from "@/lib/accountLookup";
import { PRACTICE_SOURCES, isPracticeSource, practiceEntriesFor } from "@/lib/practiceSource";

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
    where: accountUrlKeyWhere(decodeURIComponent(nickname)),
    select: { id: true, wkUsername: true, wkLevel: true, lastSyncedAt: true, lastActivityAt: true },
  });
  if (!account) {
    notFound();
  }
  if (!canViewUserPage({ viewerEmail, viewerMenuInfo, targetWkUsername: decodeURIComponent(nickname) })) {
    redirect("/join?access=denied");
  }

  const grade = parseGradeParam(firstValue(query.grade));
  const page = parsePageParam(firstValue(query.page));

  const viewerWkLevel = account.wkLevel ?? 1;
  const rawSource = firstValue(query.source) ?? PRACTICE_SOURCES.grade;
  const source = isPracticeSource(rawSource) ? rawSource : PRACTICE_SOURCES.grade;
  const level = source === PRACTICE_SOURCES.grade ? grade : Number(firstValue(query.level) ?? "1");

  const { entries, total } = await practiceEntriesFor(
    source,
    Number.isFinite(level) ? level : 1,
    page,
    PRACTICE_PAGE_SIZE,
  );

  const sheetLabel =
    source === PRACTICE_SOURCES.wanikani
      ? `WaniKani L${level}`
      : source === PRACTICE_SOURCES.jlpt
        ? `JLPT N${level}`
        : GRADE_SHORT_LABELS[grade];

  return (
    <div className="mx-auto w-full max-w-4xl bg-white px-5 py-6 text-neutral-900 print:max-w-none print:px-0 print:py-0">
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

      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 print:mb-2">
        <div className="min-w-0">
          <h1 className="text-xl font-black">
            {PRACTICE_SHEET_COPY.heading} · {sheetLabel}
          </h1>
          <p className="text-xs text-neutral-500">{PRACTICE_SHEET_COPY.subtitle}</p>
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
              href={`?source=${id}&grade=${grade}&level=${target}`}
              className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-bold transition ${
                active
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {label} {target}
            </Link>
          );
        })}
      </nav>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-neutral-300 p-4 text-sm">{PRACTICE_SHEET_COPY.empty}</p>
      ) : (
        <TracingSheet entries={entries} />
      )}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-400">
        <span>{PRACTICE_SHEET_COPY.credit}</span>
        <span className="print:hidden">
          {PRACTICE_SHEET_COPY.perPage} {(page - 1) * PRACTICE_PAGE_SIZE + 1}–
          {(page - 1) * PRACTICE_PAGE_SIZE + entries.length} of {total}
        </span>
      </footer>

      <nav className="mt-3 flex items-center justify-between gap-3 print:hidden">
        {page > 1 ? (
          <Link href={`?source=${source}&grade=${grade}&level=${level}&page=${page - 1}`} className="text-xs font-bold uppercase tracking-[0.08em] text-neutral-600 underline">
            Previous
          </Link>
        ) : <span />}
        {page * PRACTICE_PAGE_SIZE < total ? (
          <Link href={`?source=${source}&grade=${grade}&level=${level}&page=${page + 1}`} className="text-xs font-bold uppercase tracking-[0.08em] text-neutral-600 underline">
            Next
          </Link>
        ) : <span />}
      </nav>
    </div>
  );
}
