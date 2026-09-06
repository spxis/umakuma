import { slugify, uniqueSlug } from "@/lib/accountIdentity";
import { ACCOUNT_VISIBILITY, type AccountVisibility } from "@/lib/accountVisibility";
import { seededRandom, type RandomSource } from "@/lib/gameRandom";
import { LADDER_STREAMS, type LadderStreamValue } from "@/lib/ladder/ladderStreams";

import { COHORT_UTC_OFFSETS, inventName, isCohortCountry, type CohortCountry } from "./cohortNames";

/**
 * Who a simulated member is, derived rather than stored.
 *
 * A persona is everything the simulation needs to know about a member - how
 * often they turn up, when in their day, how many lessons they take, how
 * accurate they are, what they play - and none of it lives in a table. It is
 * a pure function of the account's slug and country, so `pnpm cohort play`
 * can be run on any machine, any day, and pick up exactly the member it left,
 * and a registry file that could drift from the rows is never needed.
 *
 * The country is the one fact that cannot be derived from a name, so it
 * rides in the sign-in email: `<slug>@<cc>.umakuma.invalid`. `.invalid` is
 * the TLD reserved for addresses that can never resolve, which is what makes
 * it safe - sign-in matches the session's email against `joinedByEmail`, and
 * an address nobody can own is an account nobody can walk into. Every other
 * fact comes out of a random source seeded with the slug.
 */

export const COHORT_EMAIL_DOMAIN = "umakuma.invalid";

/** How many of a default cohort come from each country, as weights. */
export const COHORT_DEFAULT_MIX: Record<CohortCountry, number> = { CA: 8, US: 8, VN: 5, TH: 3, FR: 4, AU: 4 };

/**
 * Five shapes of learner. The weights are a guess at a real sign-up page:
 * most people are steady or daily, a few study only at weekends, a few in
 * bursts, and one in ten drifts off.
 */
export const COHORT_ARCHETYPES = ["daily", "steady", "weekender", "bursty", "drifter"] as const;
export type CohortArchetype = (typeof COHORT_ARCHETYPES)[number];

/** The placement rungs a member who arrives knowing some Japanese lands on. */
const PLACEMENT_FLOORS = [5, 5, 5, 10, 10, 15, 15, 20, 25, 30] as const;

const AGE_BANDS = { adult: "18_plus", teen: "13_17" } as const;

export type CohortPersona = {
  slug: string;
  displayName: string;
  email: string;
  country: CohortCountry;
  /** Which ladder they follow. Recorded here and applied wherever the site lets a member choose. */
  stream: LadderStreamValue;
  archetype: CohortArchetype;
  utcOffsetHours: number;
  /** Local hours a session tends to start. One or two of them. */
  sessionHours: number[];
  /** Chance of turning up on a weekday, and at the weekend. */
  weekdayRate: number;
  weekendRate: number;
  /** Chance a given week is skipped altogether - a bursty member's gap. */
  weekOffRate: number;
  lessonsPerDay: number;
  /** Most reviews answered in one session; the backlog past it waits. */
  reviewCap: number;
  /** Base recall on a review. */
  accuracy: number;
  gameAccuracy: number;
  /** Median time to answer a game tile. */
  gameSpeedMs: number;
  /** Mean games on an active day. */
  gamesPerDay: number;
  /** Bias toward harder boards: 0 plays two tiles, 1 plays four. */
  hardness: number;
  visibility: AccountVisibility;
  ageBand: string;
  /** 1 for a member starting from nothing. */
  placementFloor: number;
  joinedAt: Date;
};

export function cohortEmail(slug: string, country: CohortCountry): string {
  return `${slug}@${country.toLowerCase()}.${COHORT_EMAIL_DOMAIN}`;
}

/** The country an address carries, or null for an address that is not ours. */
export function countryFromEmail(email: string | null | undefined): CohortCountry | null {
  const match = /^[^@]+@([a-z]{2})\.umakuma\.invalid$/i.exec(email ?? "");
  const code = match?.[1]?.toUpperCase() ?? "";
  return isCohortCountry(code) ? code : null;
}

function between(random: RandomSource, low: number, high: number): number {
  return low + random() * (high - low);
}

function pick<T>(items: readonly T[], random: RandomSource): T {
  return items[Math.floor(random() * items.length)]!;
}

function pickArchetype(random: RandomSource): CohortArchetype {
  const roll = random();
  if (roll < 0.3) return "daily";
  if (roll < 0.6) return "steady";
  if (roll < 0.75) return "weekender";
  if (roll < 0.9) return "bursty";
  return "drifter";
}

/** Evenings mostly, because that is when students study. */
const SESSION_HOURS = [7, 8, 12, 13, 18, 19, 20, 21, 21, 22, 22, 23] as const;

type Habits = Pick<CohortPersona, "weekdayRate" | "weekendRate" | "weekOffRate" | "lessonsPerDay">;

function habitsFor(archetype: CohortArchetype, random: RandomSource): Habits {
  switch (archetype) {
    case "daily":
      return { weekdayRate: 0.97, weekendRate: 0.9, weekOffRate: 0.02, lessonsPerDay: Math.round(between(random, 8, 15)) };
    case "steady":
      return { weekdayRate: 0.8, weekendRate: 0.6, weekOffRate: 0.05, lessonsPerDay: Math.round(between(random, 5, 10)) };
    case "weekender":
      return { weekdayRate: 0.3, weekendRate: 0.92, weekOffRate: 0.08, lessonsPerDay: Math.round(between(random, 6, 14)) };
    case "bursty":
      return { weekdayRate: 0.7, weekendRate: 0.7, weekOffRate: 0.3, lessonsPerDay: Math.round(between(random, 4, 15)) };
    case "drifter":
      return { weekdayRate: 0.45, weekendRate: 0.3, weekOffRate: 0.35, lessonsPerDay: Math.round(between(random, 2, 6)) };
  }
}

/**
 * The persona an account row implies. Null for a row that is not one of ours,
 * which is any row whose email does not carry a country.
 */
export function personaFor(account: {
  slug: string | null;
  displayName: string | null;
  nickname: string;
  joinedByEmail: string | null;
  createdAt: Date;
}): CohortPersona | null {
  const country = countryFromEmail(account.joinedByEmail);
  if (!country || !account.slug) return null;
  return derivePersona({
    slug: account.slug,
    displayName: account.displayName ?? account.nickname,
    country,
    joinedAt: account.createdAt,
  });
}

/** Everything about a member that is not their name, from the slug alone. */
export function derivePersona({
  slug,
  displayName,
  country,
  joinedAt,
}: {
  slug: string;
  displayName: string;
  country: CohortCountry;
  joinedAt: Date;
}): CohortPersona {
  const random = seededRandom(`cohort:${slug}`);
  const archetype = pickArchetype(random);
  const habits = habitsFor(archetype, random);
  const firstSession = pick(SESSION_HOURS, random);
  const secondSession = random() < 0.45 ? pick(SESSION_HOURS.filter((hour) => Math.abs(hour - firstSession) >= 5), random) : null;

  return {
    slug,
    displayName,
    email: cohortEmail(slug, country),
    country,
    stream: random() < 0.6 ? LADDER_STREAMS.un : LADDER_STREAMS.ug,
    archetype,
    utcOffsetHours: pick(COHORT_UTC_OFFSETS[country], random),
    sessionHours: secondSession === null ? [firstSession] : [firstSession, secondSession].sort((a, b) => a - b),
    ...habits,
    reviewCap: Math.round(between(random, 60, 200)),
    accuracy: between(random, 0.78, 0.95),
    gameAccuracy: between(random, 0.6, 0.95),
    gameSpeedMs: Math.round(between(random, 1300, 3800)),
    gamesPerDay: between(random, 0.3, 2.5),
    hardness: random(),
    visibility: random() < 0.7 ? ACCOUNT_VISIBILITY.public : ACCOUNT_VISIBILITY.family,
    ageBand: random() < 0.75 ? AGE_BANDS.adult : AGE_BANDS.teen,
    placementFloor: random() < 0.55 ? 1 : pick(PLACEMENT_FLOORS, random),
    joinedAt,
  };
}

export type NewCohortMember = {
  displayName: string;
  slug: string;
  country: CohortCountry;
  email: string;
  createdAt: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Countries for `count` members in the mix's proportions, largest weights first. */
export function countriesForCohort(count: number, mix: Record<CohortCountry, number> = COHORT_DEFAULT_MIX): CohortCountry[] {
  const entries = (Object.entries(mix) as [CohortCountry, number][]).filter(([, weight]) => weight > 0);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0 || count <= 0) return [];

  /* Largest remainder, so eight of thirty-two come from Canada rather than
     seven or nine depending on rounding luck. */
  const shares = entries.map(([country, weight]) => ({ country, exact: (count * weight) / total }));
  const floors = shares.map((share) => ({ ...share, whole: Math.floor(share.exact) }));
  let left = count - floors.reduce((sum, share) => sum + share.whole, 0);
  const byRemainder = [...floors].sort((a, b) => (b.exact - b.whole) - (a.exact - a.whole));
  for (const share of byRemainder) {
    if (left <= 0) break;
    share.whole += 1;
    left -= 1;
  }

  return floors.flatMap((share) => Array.from({ length: share.whole }, () => share.country));
}

/**
 * Invents `count` members: names, slugs, addresses and the day each joined.
 *
 * Joins are spread over the window with a lean toward recently, the way a
 * site that is starting to be found fills up. Slugs are made unique against
 * what is already taken, using the same rule the sign-up page uses.
 */
export function inventCohort({
  count,
  seed,
  taken,
  now,
  joinWindowDays = 120,
  mix,
}: {
  count: number;
  seed: string;
  taken: ReadonlySet<string>;
  now: Date;
  joinWindowDays?: number;
  mix?: Record<CohortCountry, number>;
}): NewCohortMember[] {
  const random = seededRandom(`cohort-invent:${seed}`);
  const claimed = new Set(taken);
  const members: NewCohortMember[] = [];

  for (const country of countriesForCohort(count, mix)) {
    let slug: string | null = null;
    let displayName = "";
    for (let attempt = 0; attempt < 50 && slug === null; attempt += 1) {
      const name = inventName(country, random);
      const preferred = slugify(name.displayName);
      if (!preferred) continue;
      const candidate = uniqueSlug(preferred, claimed);
      /* A numbered slug means the name is already on the site; try another
         name first, and only fall back to the suffix when the pool is thin. */
      if (candidate !== preferred && attempt < 40) continue;
      slug = candidate;
      displayName = name.displayName;
    }
    if (slug === null) continue;
    claimed.add(slug);

    const daysAgo = 2 + Math.floor((joinWindowDays - 2) * Math.pow(random(), 1.4));
    const hour = pick(SESSION_HOURS, random);
    const joined = new Date(now.getTime() - daysAgo * DAY_MS);
    joined.setUTCHours(hour, Math.floor(random() * 60), Math.floor(random() * 60), 0);

    members.push({ displayName, slug, country, email: cohortEmail(slug, country), createdAt: joined });
  }

  return members;
}
