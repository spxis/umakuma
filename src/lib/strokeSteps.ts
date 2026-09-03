/**
 * Walking a character one stroke at a time.
 *
 * The picker shows the numbers, and following a character stroke by stroke
 * meant finding a different target for every step - on a twenty-stroke kanji,
 * hunting through a wrapped block of numerals. Previous and next make it one
 * repeated press.
 *
 * The ends join up rather than stopping. Somebody pressing next through a
 * character wants to watch it built again, and a control that goes dead on the
 * last stroke asks them to go back and find "1" - which is the hunting this
 * exists to remove. Symmetric, so previous from the first stroke is the last.
 */
export function stepStroke(current: number, count: number, direction: 1 | -1): number {
  if (count < 1) return 1;
  /* +count before the modulo, because -1 % n is negative in JavaScript. */
  return ((current - 1 + direction + count) % count) + 1;
}
