/**
 * The look-alike warning a member gets while they are studying.
 *
 * The pairs file answers "which characters are confusable"; this answers
 * "which of them is worth saying to *this* member *now*". John, asking for it:
 * "it's good to know that the kanji you're looking at could be confused with
 * something else later, so I can keep this in mind" - and, in the same breath,
 * "it's not as irrelevant if they were on a very far level and you haven't
 * been there yet, so you wouldn't even care about that at that time."
 *
 * So a twin is worth naming when the member has already been taught it, and
 * worth flagging when it is close enough ahead to be the next collision. Past
 * that it is dropped: a warning that fires on every character trains a reader
 * to skip warnings.
 *
 * Levels come from the ladder file, which carries both numbers for every
 * character, so the caller says which ladder its surface is on rather than
 * looking anything up itself.
 */
import { confusablesFor } from "./kanjiConfusables";
import {
  CONFUSABLE_STANDINGS,
  type ConfusableStanding,
  type ConfusableWarning,
} from "./kanjiConfusableWarning.types";
import { getKanjiDictionaryEntry } from "./kanjiDictionary";
import { kanjiPlacement } from "./kanjiLadder";
import { LEVEL_SYSTEMS, type LevelSystem } from "./levelBadge";

/**
 * How far ahead a twin still counts as coming.
 *
 * The study surfaces hide related items more than two levels ahead, which is
 * right for a list of things to go and read and too tight for a warning: the
 * whole value of "there is a look-alike coming" is having heard it before the
 * level it arrives on. Five levels is roughly a month of study at the ladder's
 * own pace, which is long enough to be a heads-up and short enough that it is
 * still about the character in front of them.
 */
export const CONFUSABLE_LOOKAHEAD_LEVELS = 5;

function standingOf(twinLevel: number | null, viewerLevel: number): ConfusableStanding | null {
  /*
   * No level on this ladder means the surface cannot place it: the 134 joyo
   * kanji WaniKani never teaches have no WaniKani level, and a warning that
   * cannot say when the twin arrives is one a member cannot act on.
   */
  if (typeof twinLevel !== "number") return null;
  if (twinLevel <= viewerLevel) return CONFUSABLE_STANDINGS.known;
  return twinLevel <= viewerLevel + CONFUSABLE_LOOKAHEAD_LEVELS ? CONFUSABLE_STANDINGS.ahead : null;
}

/**
 * The twins worth warning this member about, the ones they know first.
 *
 * A character they have met is the sharper warning - the mistake is available
 * to them today - so it leads, and the file's own ranking breaks the tie.
 */
export function confusableWarnings(
  character: string,
  viewerLevel: number | null,
  system: LevelSystem = LEVEL_SYSTEMS.wanikani,
): ConfusableWarning[] {
  if (typeof viewerLevel !== "number") return [];

  const warnings: ConfusableWarning[] = [];
  for (const neighbour of confusablesFor(character)) {
    const placement = kanjiPlacement(neighbour.kanji);
    const wkLevel = placement?.waniKaniLevel ?? null;
    const ukLevel = placement?.level ?? null;
    const standing = standingOf(system === LEVEL_SYSTEMS.wanikani ? wkLevel : ukLevel, viewerLevel);
    if (!standing) continue;

    const entry = getKanjiDictionaryEntry(neighbour.kanji);
    const reading = entry?.readings.on[0] ?? entry?.readings.kun[0] ?? null;
    warnings.push({
      kanji: neighbour.kanji,
      meaning: entry?.primaryMeaning ?? null,
      /* KANJIDIC2 marks okurigana with a dot; a reader wants the reading. */
      reading: reading ? reading.replace(/\./g, "") : null,
      wkLevel,
      ukLevel,
      standing,
    });
  }

  return warnings.sort((one, other) =>
    one.standing === other.standing ? 0 : one.standing === CONFUSABLE_STANDINGS.known ? -1 : 1,
  );
}

export { CONFUSABLE_STANDINGS };
export type { ConfusableStanding, ConfusableWarning };
