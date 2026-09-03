/**
 * Where a character's practice sheet lives.
 *
 * A static segment beside the character page's optional catch-all, which Next
 * resolves first - so `/kanji/水/sheet` is the sheet and `/kanji/水/stroke` is
 * still the stroke-order section.
 *
 * Its own module so a link can be built without dragging the page's imports
 * along, which is the same reason `practiceAddress` sits apart from the sheet
 * that reads it.
 */
export function kanjiSheetHref(character: string): string {
  return `/kanji/${encodeURIComponent(character)}/sheet`;
}
