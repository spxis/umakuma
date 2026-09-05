import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";

import { simulatePersona } from "./balanceSimulator";
import { simPersonaById } from "./simPersonas";
import { xpLevelFor } from "./xpCurve";
import { gamesPerDayAt } from "./xpEntitlements";
import { XP_PROPOSED_AWARDS } from "./xpProposedAwards";
import { restDaysAllowedAt, vacationWeeksAllowedAt } from "./xpRest";

/**
 * What an arriving WaniKani member should be given, and what they should not.
 *
 * He is WaniKani 17, imports, lands at UmaKuma 20 and holds no XP at all. The
 * question is whether that is unfair, and the two ladders answer most of it
 * before the simulator does: the curriculum level is knowledge and the XP rank
 * is attendance, and neither may be bought with the other. Paying XP for an
 * import is buying one with the other.
 *
 * The simulation settles the rest, and it settles it against intuition. Three
 * measurements:
 *
 * 1. **What the knowledge would be worth.** A member who earns UmaKuma 20 here
 *    has banked roughly forty thousand XP by the time they get there — rank 62,
 *    ten months of daily study. Scaling an import award by the imported level
 *    hands that over on day one, ahead of members who attended every day for
 *    most of a year. There is no defensible version of that.
 * 2. **What the missing XP actually costs.** Almost nothing, and it decays
 *    inside a month. An importer and a member starting from level 1, doing the
 *    identical day, stand at the same rank after thirty days and every
 *    checkpoint after: rank 14 against 11 at a month, 47 against 48 at six.
 *    XP is dominated by what you did today, not by what you did last year, so
 *    a zero start is a fortnight's disadvantage rather than a permanent one.
 * 3. **What it does cost is capacity.** On arrival the importer has a beginner's
 *    entitlements — two games a day, seven rest days, no vacation — while
 *    carrying a level-20 review queue. That is the real unfairness, it bites
 *    immediately, and it is not fixed by XP.
 *
 * So: a small flat award for the *act* of importing, never scaled by the level
 * imported, and an entitlement floor set separately. The flat award already
 * proposed — connecting plus importing — comes to 250 XP, which is rank 5,
 * which is exactly where the vacation allowance begins. Connecting an account
 * and choosing to import are things somebody did on this site, so paying for
 * them is honest; knowing four hundred kanji is not.
 *
 * The floor is the other half and it is not XP. An importer holds rank 10's
 * entitlements from the first day — three games, twelve rest days, a
 * fortnight's vacation — which `xpCurve.ts` prices at a fortnight of ordinary
 * attendance rather than at the ten months the knowledge would cost. Enough
 * to carry a level-20 queue; nowhere near enough to look like standing
 * somebody else earned.
 */

/**
 * The learner the reference curve is measured on.
 *
 * The deliberate control persona: most days, a modest sitting morning and
 * night, ordinary accuracy. Not the fastest and not the slowest — the point is
 * a defensible "somebody who earned it here", and the fastest learner would
 * make every import look more generous than it is.
 */
export const IMPORT_REFERENCE_PERSONA_ID = "morning-and-night";

const REFERENCE_DAYS = 365 * 6;

let reference: { levelXp: (number | null)[]; levelDays: (number | null)[] } | null = null;

/** XP and days a reference learner had banked on reaching each ladder level. */
export function importReferenceCurve(): { levelXp: (number | null)[]; levelDays: (number | null)[] } {
  if (reference) return reference;
  const persona = simPersonaById(IMPORT_REFERENCE_PERSONA_ID);
  if (!persona) {
    reference = { levelXp: [], levelDays: [] };
    return reference;
  }
  const result = simulatePersona(persona, { days: REFERENCE_DAYS, seed: 5 });
  reference = { levelXp: result.levelXp, levelDays: result.levelDays };
  return reference;
}

/** The flat award for the act, from the proposed set. Never scaled by level. */
export const IMPORT_FLAT_XP = XP_PROPOSED_AWARDS.wanikaniConnected + XP_PROPOSED_AWARDS.wanikaniImported;

/**
 * The rank whose entitlements an importer holds on day one.
 *
 * Ten, not their earned-equivalent rank. A member who reaches UmaKuma 20 here
 * is at rank 60 by then, and floor an importer there and you have handed over
 * ten months of somebody else's attendance in everything but the number. Rank
 * 10 is a fortnight, it is the tier that ends the two-game-a-day beginner
 * allowance, and it is what a level-20 review queue actually needs.
 */
export const IMPORT_ENTITLEMENT_FLOOR_RANK = 10;

export type ImportVerdict = {
  level: number;
  /** XP a reference learner held on reaching this level here. */
  earnedXp: number | null;
  earnedRank: number | null;
  /** Days it took them, which is what the import is skipping. */
  earnedDays: number | null;
  /** What the flat award is worth, and what it buys. */
  flatXp: number;
  flatRank: number;
  /**
   * The rank whose entitlements an importer should hold from day one.
   *
   * Not XP — capacity. Games a day, rest days and vacation weeks are what a
   * level-20 queue actually needs, and withholding them from somebody
   * carrying that queue is the unfairness the XP question was standing in
   * front of. Flat, for the same reason the award is flat.
   */
  entitlementFloorRank: number;
  gamesPerDay: number;
  restDays: number;
  vacationWeeks: number;
};

export function importVerdict(level: number): ImportVerdict {
  const at = Math.min(Math.max(1, Math.trunc(level)), KANJI_LADDER_LEVELS);
  const curve = importReferenceCurve();
  const earnedXp = curve.levelXp[at] ?? null;
  const earnedRank = earnedXp === null ? null : xpLevelFor(earnedXp);
  const entitlementFloorRank = IMPORT_ENTITLEMENT_FLOOR_RANK;
  return {
    level: at,
    earnedXp,
    earnedRank,
    earnedDays: curve.levelDays[at] ?? null,
    flatXp: IMPORT_FLAT_XP,
    flatRank: xpLevelFor(IMPORT_FLAT_XP),
    entitlementFloorRank,
    gamesPerDay: gamesPerDayAt(entitlementFloorRank),
    restDays: restDaysAllowedAt(entitlementFloorRank),
    vacationWeeks: vacationWeeksAllowedAt(entitlementFloorRank),
  };
}

/** The levels an import lands on often enough to be worth pricing. */
export const IMPORT_LEVELS: readonly number[] = [10, 20, 30, 40, 60, 85];

export function importVerdicts(levels: readonly number[] = IMPORT_LEVELS): ImportVerdict[] {
  return levels.map(importVerdict);
}
