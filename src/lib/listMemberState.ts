import "server-only";

import { LIST_ITEM_KINDS, type StudyTag } from "./domainConstants";
import type { MemberState } from "./listPageItems";
import type { StudyListItemRef } from "./studyListRules";
import { loadAssignmentFacts } from "./studySubjectItems";
import { fetchStudyTagRows } from "./studySubjectTags";

/**
 * What the viewer's own account says about a set of subjects.
 *
 * Read for whoever is looking rather than for whoever owns the list, because
 * that is the useful answer: opening a friend's list should show how far *you*
 * have got with what is on it. A visitor with no account gets nothing, and
 * every item reads as locked and untagged.
 */
export async function loadMemberState(accountId: string | null): Promise<Map<number, MemberState>> {
  const state = new Map<number, MemberState>();
  if (!accountId) return state;

  const [assignments, tagRows] = await Promise.all([loadAssignmentFacts(accountId), fetchStudyTagRows(accountId)]);
  for (const [subjectId, facts] of assignments.entries()) {
    state.set(subjectId, {
      srsStage: facts.srsStage,
      unlocked: Boolean(facts.unlockedAt),
      studyTags: { favorite: false, trouble: false, burned: false },
    });
  }
  for (const row of tagRows) {
    const current = state.get(row.subjectId);
    const studyTags = { favorite: row.favorite, trouble: row.trouble, burned: row.burned };
    if (current) current.studyTags = studyTags;
    else state.set(row.subjectId, { srsStage: 0, unlocked: false, studyTags });
  }
  return state;
}

/**
 * The subjects this member has tagged one way, as a list's items.
 *
 * Named by their subject id, since that is what a tag hangs off; the kind and
 * the characters come from the catalogue when the rows are built, so a tagged
 * radical is drawn as a radical.
 */
export async function tagListItems(accountId: string, tag: StudyTag): Promise<StudyListItemRef[]> {
  const rows = await fetchStudyTagRows(accountId);
  return rows
    .filter((row) => row[tag])
    .map((row) => ({ kind: LIST_ITEM_KINDS.kanji, key: String(row.subjectId), subjectId: row.subjectId }));
}
