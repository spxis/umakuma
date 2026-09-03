/**
 * Who on a shared list knows what.
 *
 * The family use, and the reason for sharing a list at all: a parent wants to
 * see, at a glance, who has this week's kanji down and who needs a hand. Three
 * standings rather than the nine SRS stages, because that is the question -
 * "has she got it yet", not "is she at Guru II".
 *
 * Guru is the line. WaniKani draws it there itself: a subject at Guru has been
 * answered correctly across days rather than minutes, and it is what unlocks
 * the next thing. Apprentice is somebody in the middle of learning it, which
 * is a different answer from either "not yet" or "yes".
 */

export const LIST_STANDINGS = {
  /** Never unlocked, or unlocked and not yet answered right. */
  none: "none",
  /** Apprentice: in hand, not held. */
  learning: "learning",
  /** Guru and above. */
  known: "known",
} as const;

export type ListStanding = (typeof LIST_STANDINGS)[keyof typeof LIST_STANDINGS];

export const LIST_STANDING_VALUES = Object.values(LIST_STANDINGS) as ListStanding[];

/** What one member's account says about one subject. */
export type StandingFacts = { srsStage: number; unlocked: boolean } | undefined;

export function standingFor(facts: StandingFacts): ListStanding {
  if (!facts || !facts.unlocked || facts.srsStage <= 0) return LIST_STANDINGS.none;
  return facts.srsStage >= 5 ? LIST_STANDINGS.known : LIST_STANDINGS.learning;
}

export type StandingCounts = Record<ListStanding, number>;

export const NO_STANDINGS: StandingCounts = { none: 0, learning: 0, known: 0 };

/**
 * One member's standing across the list, and how far along that is.
 *
 * Only the items the catalogue names are counted. A list may hold a word
 * somebody typed in that WaniKani never taught, and there is no SRS stage for
 * it in anybody's account - counting those as "not started" would mark every
 * member down for an item none of them can ever be marked up for. They are
 * reported separately instead, the way the burned count is.
 */
export type MemberStandings = {
  accountId: string;
  name: string;
  counts: StandingCounts;
  /** Of the trackable items, the share at Guru or above, 0-1. */
  known: number;
};

export function memberStandings(
  member: { accountId: string; name: string },
  subjectIds: readonly number[],
  factsFor: (subjectId: number) => StandingFacts,
): MemberStandings {
  const counts: StandingCounts = { ...NO_STANDINGS };
  for (const subjectId of subjectIds) counts[standingFor(factsFor(subjectId))] += 1;
  const total = subjectIds.length;
  return {
    accountId: member.accountId,
    name: member.name,
    counts,
    known: total === 0 ? 0 : counts.known / total,
  };
}

/**
 * The members ordered as a reader wants to read them.
 *
 * Furthest along first, so the answer to "who needs a hand" is at the end
 * where it is easy to find, and the name breaks ties so the order does not
 * shuffle between two people on the same count.
 */
export function byProgress(members: readonly MemberStandings[]): MemberStandings[] {
  return [...members].sort((a, b) => b.known - a.known || a.name.localeCompare(b.name, "en"));
}

/**
 * Whether the overlay is worth drawing.
 *
 * One member is not a comparison - it is the reader's own progress, which the
 * item cards already show - and no trackable items is a row of dashes.
 */
export function worthShowing(members: readonly MemberStandings[], trackable: number): boolean {
  return members.length > 1 && trackable > 0;
}
