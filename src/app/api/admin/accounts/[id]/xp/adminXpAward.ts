/**
 * The two decisions an admin XP award makes before it reaches the database.
 *
 * Pure, and in their own file, so they can be tested without a Prisma client
 * and so the route stays the thin Zod-parse-then-work shape every other admin
 * route has.
 */

/**
 * The largest single award the form will take.
 *
 * A guard against a fat finger, not a policy: nothing about the economy says
 * an award may not be large, and the top rank costs far less than this. It
 * exists so that a stray keypress in a number field cannot hand somebody a
 * hundred ranks before anyone notices.
 */
export const ADMIN_XP_AWARD_MAX = 100_000;

/**
 * What a member reads on their history for an award nobody earned.
 *
 * The admin's words, verbatim, because the whole point of the note is that the
 * type's own sentence is too general - "for turning up to the study session"
 * says something "For finishing a game" cannot. Empty, it falls back to saying
 * plainly that this came from an admin, so a member is never left reading a
 * line that implies they earned something they did not.
 *
 * The admin's own identity is deliberately not in here. `XpEvent.note` is
 * member-facing, so an email in it is a leak; and the row accumulates a whole
 * day of one kind, so a "granted by" written onto it would be overwritten by
 * the next award and would sit on a row that is mostly the member's own study
 * anyway. Recording who granted what wants the separate table the schema
 * comment on `XpEvent` already anticipates.
 */
export const ADMIN_AWARD_DEFAULT_NOTE = "Awarded by an admin.";

export function adminAwardNote(note: string | null | undefined): string {
  const trimmed = note?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : ADMIN_AWARD_DEFAULT_NOTE;
}
