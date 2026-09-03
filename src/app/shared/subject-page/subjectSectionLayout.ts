import type { SubjectSection } from "./subjectSectionAddress";

/**
 * Where the filing strip goes among the blocks.
 *
 * "Keep this on a list" belongs to the subject rather than to any one block,
 * and each page had already settled on a place for it: under the drawing on a
 * kanji page, under the card on a radical or word page - which is above the
 * example sentences, not below them.
 *
 * So the page names the block it wants the strip under, and this returns the
 * last block actually shown that is no further down the page than that one. A
 * subject with no related group still gets the strip above its sentences, and
 * a section page, which shows one block, gets it under that block.
 */
export function filingStripIndex(
  shown: readonly SubjectSection[],
  order: readonly SubjectSection[],
  preferred: SubjectSection,
): number {
  if (shown.length === 0) return -1;

  const limit = order.indexOf(preferred);
  if (limit < 0) return 0;

  let at = 0;
  shown.forEach((id, index) => {
    const rank = order.indexOf(id);
    if (rank >= 0 && rank <= limit) at = index;
  });
  return at;
}
