"use client";

import Link from "next/link";

import SubjectFilerCell from "@/app/shared/SubjectFilerCell";
import { useSubjectFiler } from "@/app/shared/useSubjectFiler";
import { SUBJECT_FILER_COPY } from "@/app/shared/studyListCopy";
import type { FilerHit } from "@/lib/subjectFiler";

import { SUBJECT_PAGE_COPY } from "./SubjectPage.constants";

/**
 * The strip under a subject's card: keep this one.
 *
 * A member could file a kanji from a search row and then, having opened its
 * page, had no way to do the same thing - which is backwards, since the page
 * is where you decide a character is worth keeping. The marks are the ones
 * the search column uses, so trouble, favourite and the saved lists read the
 * same wherever a subject is shown.
 *
 * Its own client island rather than a prop through the page: the pages are
 * public, and everything above this bar is the same for every reader. The
 * lists are fetched here, for one subject, only for a reader who has an
 * account to fetch them for.
 */
export default function SubjectFilingBar({
  hit,
  accountId,
  label,
}: {
  hit: FilerHit;
  /** The reader's own account, or null for a visitor. */
  accountId: string | null;
  /** What the subject is called, for the line offered to a signed-out reader. */
  label: string;
}) {
  const filer = useSubjectFiler(accountId, [hit], Boolean(accountId));

  return (
    <section className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-line bg-surface-muted px-4 py-2.5">
      <p className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
        {accountId ? SUBJECT_FILER_COPY.open : SUBJECT_PAGE_COPY.filingSignedOut(label)}
      </p>

      {accountId ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {filer.lists?.length === 0 ? (
            <span className="text-[11px] font-semibold text-foreground/60">{SUBJECT_FILER_COPY.noLists}</span>
          ) : null}
          <SubjectFilerCell hit={hit} filer={filer} variant="strip" />
          {filer.error ? <span className="text-[11px] font-bold text-red-700">{filer.error}</span> : null}
        </div>
      ) : (
        <Link
          href="/join"
          className="inline-flex h-8 items-center rounded-full bg-accent px-4 text-[11px] font-black uppercase tracking-[0.08em] text-white transition hover:brightness-95"
        >
          {SUBJECT_PAGE_COPY.filingJoin}
        </Link>
      )}
    </section>
  );
}
