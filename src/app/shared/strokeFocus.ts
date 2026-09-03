/**
 * One stroke held still, with the rest of the character around it.
 *
 * The animation answers "how is this written"; it cannot answer "what exactly
 * is that third stroke", because by the time you have found it the pen has
 * moved on. Holding one stroke still is a different question and it needs
 * three states at once: what is already down, the one being drawn now, and
 * what has not been reached yet.
 *
 * The faint whole-character outline the animation draws underneath is left off
 * while a stroke is being studied. It is a fourth thing on the page, and its
 * effect is to make every stroke look half-drawn - which is exactly what the
 * three states are for distinguishing.
 */

export const STROKE_FOCUS_STATES = { done: "done", current: "current", ahead: "ahead" } as const;

export type StrokeFocusState = (typeof STROKE_FOCUS_STATES)[keyof typeof STROKE_FOCUS_STATES];

/**
 * How the stroke at `index` is drawn, given the stroke being studied.
 *
 * `index` is where the path sits in the character, counted from zero, and
 * `selected` is the number a reader pressed, counted from one - the two are
 * different scales on purpose, because a stroke number is something a person
 * says out loud and an index never is.
 */
export function strokeFocusState(index: number, selected: number): StrokeFocusState {
  if (index + 1 === selected) return STROKE_FOCUS_STATES.current;
  return index + 1 < selected ? STROKE_FOCUS_STATES.done : STROKE_FOCUS_STATES.ahead;
}

/**
 * The same three states, with what is already down taken away.
 *
 * Holding a stroke still answers where in the character it falls; it does not
 * answer what the stroke is, because on a twenty-two stroke character the one
 * you asked about is a coloured mark inside a nearly finished glyph. Hiding
 * the finished strokes leaves the answer on its own - and `done` becomes
 * `ahead` rather than a fourth state, because "not on the page" is already
 * what `ahead` means and the animation already knows how to leave it wound
 * back.
 */
export function strokeFocusStateFor(
  index: number,
  selected: number,
  solo: boolean,
): StrokeFocusState {
  const state = strokeFocusState(index, selected);
  return solo && state === STROKE_FOCUS_STATES.done ? STROKE_FOCUS_STATES.ahead : state;
}

/**
 * The colour each state is drawn in.
 *
 * Set on the path rather than the group, so it overrides the group's colour
 * the way any nearer rule does. `ahead` is transparent rather than absent:
 * dropping the path would renumber every ref the animation holds.
 */
export const STROKE_FOCUS_CLASS: Record<StrokeFocusState, string> = {
  /* The site's floor for grey on white; the colour, not the paleness, is what marks the current stroke. */
  done: "text-foreground/60",
  current: "text-kanji",
  ahead: "text-transparent",
};

/** The stroke numbers of a character, as a reader counts them: 1 to N. */
export function strokeNumbers(count: number): number[] {
  return count > 0 ? Array.from({ length: count }, (_, index) => index + 1) : [];
}

/**
 * Whether a number the panel is holding still names a stroke of this character.
 *
 * The panel outlives one character - a modal opened on 一 and then on 魔 is
 * the same panel - so a stroke picked on a long character must not survive
 * onto a short one, where it would name nothing and leave the drawing blank.
 */
export function strokeIsInCharacter(selected: number | null, count: number): boolean {
  return selected !== null && selected >= 1 && selected <= count;
}
