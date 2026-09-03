"use client";

import SubjectFilerCell from "./SubjectFilerCell";
import { SUBJECT_FILER_COPY } from "./studyListCopy";
import { useSubjectFiler } from "./useSubjectFiler";
import { canList, listHolds } from "@/lib/subjectFiler";

/**
 * Keeping the character you are looking at.
 *
 * The viewer is where a reader actually decides a kanji is worth having: they
 * have opened it, read the meaning, seen the words it appears in. Until now
 * the only way to file it from here was to close the modal, find the same
 * character in a search, and use the column there - so the one surface where
 * the decision is made was the one surface that could not act on it.
 *
 * Lists only. Trouble and favourite are already drawn inside the glyph, where
 * they have been since before filing existed, and a second pair a few
 * centimetres away would read as a different pair meaning something else.
 *
 * Its own island, mounted per open subject, so the modal host does not fetch
 * the reader's lists to show a character to somebody with no account. It also
 * builds the hit, which keeps the host from knowing how a subject is named.
 */
export default function ViewGlyphFilingRow({
  subject,
  accountId,
}: {
  subject: { subjectType?: string | null; characters: string; subjectId: number };
  accountId: string;
}) {
  /*
   * A radical is named on a list by its slug, and the viewer's items do not
   * carry one - they come from queues and explorers, which address a radical
   * by subject id. So a radical gets no strip rather than a strip whose chips
   * cannot do anything, and the day the items carry a slug this reads it.
   */
  const hit = {
    subjectType: subject.subjectType ?? "",
    glyph: subject.characters,
    slug: null,
    subjectId: subject.subjectId,
  };
  const filer = useSubjectFiler(accountId, [hit], canList(hit));

  /* Nothing to say until the lists arrive; an empty strip would just jump. */
  if (!canList(hit) || filer.lists === null) return null;

  /*
   * The lists this character is already on come first.
   *
   * The rail scrolls, and what a reader wants to see without scrolling is
   * where the thing in front of them already lives - both to know it is kept
   * and to take it off again. Everything else keeps the order the shelf uses.
   */
  const held = filer.lists.filter((list) => listHolds(list, hit));
  const rest = filer.lists.filter((list) => !listHolds(list, hit));
  const ordered = { ...filer, lists: [...held, ...rest] };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2 sm:px-4">
      <span className="text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">
        {SUBJECT_FILER_COPY.keepOn}
      </span>
      {filer.lists.length === 0 ? (
        <span className="text-[11px] font-semibold text-foreground/60">{SUBJECT_FILER_COPY.noLists}</span>
      ) : (
        <SubjectFilerCell hit={hit} filer={ordered} variant="rail" marks="lists" />
      )}
      {filer.error ? <span className="text-[11px] font-bold text-red-700">{filer.error}</span> : null}
    </div>
  );
}
