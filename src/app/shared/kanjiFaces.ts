import { STROKE_ANIMATION_COPY } from "./strokeAnimationCopy";

/**
 * The faces a kanji is shown in beside its stroke order.
 *
 * Four, because each answers a different question a learner has. Gothic is
 * what a screen shows: every stroke at one weight. Mincho is what a book
 * shows: tapered strokes and triangular stops. The textbook face is what a
 * child is taught to write, the handwriting standard every Japanese school
 * uses, and where a printed form and the written form part ways (the hook
 * on 令, the joined strokes of 心) this is the one to copy. The brush face is
 * where the printed forms came from.
 *
 * In reading order for a two-by-two grid: printed faces on the top row,
 * written faces beneath.
 *
 * Only the families live here. The element that draws them is PrintedGlyph,
 * which marks itself translate="no" - a translator offered a lone kanji in a
 * Japanese face replaces it with an English word.
 */
export type KanjiFace = {
  id: "gothic" | "mincho" | "textbook" | "brush";
  /** The face's name, said on hover rather than printed under it. */
  label: string;
  fontFamily: string;
};

export const KANJI_FACES: readonly KanjiFace[] = [
  { id: "gothic", label: STROKE_ANIMATION_COPY.gothic, fontFamily: "var(--font-jp-sans), sans-serif" },
  { id: "mincho", label: STROKE_ANIMATION_COPY.mincho, fontFamily: "var(--font-jp-serif), serif" },
  { id: "textbook", label: STROKE_ANIMATION_COPY.textbook, fontFamily: "var(--font-jp-textbook), sans-serif" },
  { id: "brush", label: STROKE_ANIMATION_COPY.brush, fontFamily: "var(--font-jp-brush), serif" },
];
