import { gradePlacement } from "@/lib/gradeLadder";
import { kanjiPlacement } from "@/lib/kanjiLadder";

import { LADDER_STREAMS, type LadderStreamValue } from "./ladderStreams";

/**
 * A kanji's level on the reader's ladder, and null on the other.
 *
 * Two columns rather than one number with a system beside it, so a chip can
 * never print a UN number under a UG prefix: `SubjectPill` labels `unLevel`
 * `UN` and `ugLevel` `UG`, and a caller that fills only one of them has said
 * which ladder it meant. A visitor with no stream reads the exam ladder, the
 * site's headline ordering.
 *
 * Every row of chips on a kanji page asks this - the words it is used in,
 * the characters it is confused with, the groups WaniKani links it to. It
 * lived inside the page model and the other two rows called the UN ladder
 * directly, so one page drew UG under one heading and UN under the next.
 */
export function ourLevels(
  character: string,
  stream: LadderStreamValue | null,
): { unLevel: number | null; ugLevel: number | null } {
  if (stream === LADDER_STREAMS.ug) {
    return { unLevel: null, ugLevel: gradePlacement(character)?.level ?? null };
  }
  return { unLevel: kanjiPlacement(character)?.level ?? null, ugLevel: null };
}
