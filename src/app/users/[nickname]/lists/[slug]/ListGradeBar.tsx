"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { asPercent, markIsStale, type ListGrade } from "@/lib/listGrade";

/**
 * How this list is going, and the owner's word on whether it is finished.
 *
 * Two facts side by side because they answer differently: how much of the list
 * the reader knows, which the system works out, and whether the owner
 * considers it done, which only they can say. A list can be fully known and
 * still open because more is going on it next week, or marked done while
 * somebody is still working through it.
 *
 * The reader's own progress, not the owner's - the same choice every other
 * per-member reading on this page makes. Opening a friend's list should say
 * how far *you* have got with what is on it.
 */

const TONE: Record<ListGrade, string> = {
  untouched: "border-line bg-surface-muted text-foreground/60",
  starting: "border-line bg-surface-muted text-foreground/75",
  getting: "border-amber-300 bg-amber-50 text-amber-900",
  nearly: "border-emerald-300 bg-emerald-50 text-emerald-900",
  solid: "border-emerald-500 bg-emerald-500 text-white",
};

export default function ListGradeBar({
  accountId,
  listId,
  canMark,
  studiedAt,
  updatedAt,
  grade,
}: {
  /** The reader's own account; null for a visitor, who is offered no mark. */
  accountId: string | null;
  listId: string;
  /** Only the owner says whether their list is finished. */
  canMark: boolean;
  studiedAt: string | null;
  updatedAt: string;
  grade: { grade: ListGrade; known: number; trackable: number; accuracy: number | null; attempts: number } | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * Not optimistic, on purpose.
   *
   * Whether the mark is stale is `updatedAt > studiedAt`, and both of those
   * have to come from the same clock. Showing the mark straight away meant
   * standing a browser-generated timestamp next to a server-generated one -
   * and the server's write lands after the browser reads its own clock, so
   * the list read "Studied, then changed" the instant it was marked.
   *
   * Marking a list done is a deliberate thing somebody does once. It can wait
   * for the server to answer, and then every time on this bar comes from the
   * server.
   */
  async function toggle() {
    if (!accountId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/study/${accountId}/lists`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: listId, studied: studiedAt === null }),
      });
      if (!response.ok) throw new Error("mark failed");
      router.refresh();
    } catch {
      setError(STUDY_LIST_COPY.editFailed);
    } finally {
      setBusy(false);
    }
  }

  const marked = studiedAt;
  const stale = markIsStale(studiedAt, updatedAt);

  return (
    <section className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-surface px-4 py-2.5">
      {grade ? (
        <>
          <span className={`inline-flex h-7 items-center rounded-full border px-3 text-[11px] font-black uppercase tracking-[0.08em] ${TONE[grade.grade]}`}>
            {STUDY_LIST_COPY.gradeLabels[grade.grade]}
          </span>
          <span className="text-[11px] font-semibold text-foreground/70">
            {STUDY_LIST_COPY.gradeKnown(grade.known, grade.trackable)}
            {/*
              * Said only when somebody has actually answered. No attempts is
              * not nought per cent - telling a member they are at 0% on a list
              * they have never sat down with is a different, wrong claim.
              */}
            {grade.accuracy !== null ? ` · ${STUDY_LIST_COPY.gradeAccuracy(asPercent(grade.accuracy), grade.attempts)}` : ""}
          </span>
        </>
      ) : (
        <span className="text-[11px] font-semibold text-foreground/60">{STUDY_LIST_COPY.gradeNothingTracked}</span>
      )}

      <span className="ml-auto flex items-center gap-2">
        {marked ? (
          <span className={`text-[11px] font-bold uppercase tracking-[0.08em] ${stale ? "text-amber-700" : "text-emerald-700"}`}>
            {stale ? STUDY_LIST_COPY.studiedStale : STUDY_LIST_COPY.studiedDone}
          </span>
        ) : null}
        {canMark ? (
          <button
            type="button"
            onClick={() => void toggle()}
            disabled={busy}
            aria-pressed={marked !== null}
            className="inline-flex h-8 items-center rounded-full border border-line bg-surface px-3 text-[11px] font-black uppercase tracking-[0.08em] text-foreground/75 transition hover:bg-surface-muted disabled:opacity-50"
          >
            {busy ? STUDY_LIST_COPY.studiedSaving : marked ? STUDY_LIST_COPY.studiedUnmark : STUDY_LIST_COPY.studiedMark}
          </button>
        ) : null}
        {error ? <span className="text-[11px] font-bold text-rose-600">{error}</span> : null}
      </span>
    </section>
  );
}
