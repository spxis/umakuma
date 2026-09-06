import { describe, expect, it } from "vitest";

import { LADDER_STREAMS } from "@/lib/ladder/ladderStreams";

import { COHORT_COUNTRIES, inventName } from "./cohortNames";
import { seededRandom } from "@/lib/gameRandom";
import {
  cohortEmail,
  COHORT_DEFAULT_MIX,
  countriesForCohort,
  countryFromEmail,
  derivePersona,
  inventCohort,
  personaFor,
} from "./cohortPersona";

const NOW = new Date("2026-09-06T18:00:00Z");

describe("countriesForCohort", () => {
  it("splits thirty-two the way the default mix says, with nothing lost to rounding", () => {
    const countries = countriesForCohort(32);
    expect(countries).toHaveLength(32);
    const counts = Object.fromEntries(COHORT_COUNTRIES.map((c) => [c, countries.filter((x) => x === c).length]));
    expect(counts).toEqual(COHORT_DEFAULT_MIX);
  });

  it("still adds up for an awkward count", () => {
    expect(countriesForCohort(7)).toHaveLength(7);
    expect(countriesForCohort(0)).toEqual([]);
  });
});

describe("inventCohort", () => {
  it("is the same cohort for the same seed, and a different one for another", () => {
    const first = inventCohort({ count: 10, seed: "a", taken: new Set(), now: NOW });
    const again = inventCohort({ count: 10, seed: "a", taken: new Set(), now: NOW });
    const other = inventCohort({ count: 10, seed: "b", taken: new Set(), now: NOW });
    expect(again).toEqual(first);
    expect(other.map((m) => m.slug)).not.toEqual(first.map((m) => m.slug));
  });

  it("never reuses a slug, its own or one already on the site", () => {
    const taken = new Set(["emily-tremblay", "jack-thompson"]);
    const members = inventCohort({ count: 32, seed: "crowd", taken, now: NOW });
    const slugs = members.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(taken.has(slug)).toBe(false);
  });

  it("dates every join inside the window and before now", () => {
    const members = inventCohort({ count: 32, seed: "when", taken: new Set(), now: NOW, joinWindowDays: 90 });
    for (const member of members) {
      const daysAgo = (NOW.getTime() - member.createdAt.getTime()) / 86_400_000;
      expect(daysAgo).toBeGreaterThanOrEqual(1);
      expect(daysAgo).toBeLessThanOrEqual(91);
    }
    /* Not all on the same day: a cohort that joined together looks seeded. */
    expect(new Set(members.map((m) => m.createdAt.toISOString().slice(0, 10))).size).toBeGreaterThan(10);
  });

  it("gives every member an address that carries their country and cannot resolve", () => {
    for (const member of inventCohort({ count: 12, seed: "mail", taken: new Set(), now: NOW })) {
      expect(member.email).toBe(cohortEmail(member.slug, member.country));
      expect(member.email.endsWith(".umakuma.invalid")).toBe(true);
      expect(countryFromEmail(member.email)).toBe(member.country);
    }
    expect(countryFromEmail("john@example.com")).toBeNull();
    expect(countryFromEmail("x@zz.umakuma.invalid")).toBeNull();
  });
});

describe("derivePersona", () => {
  it("is a pure function of the slug", () => {
    const input = { slug: "minh-anh-nguyen", displayName: "Minh Anh Nguyen", country: "VN" as const, joinedAt: NOW };
    expect(derivePersona(input)).toEqual(derivePersona(input));
    expect(derivePersona({ ...input, slug: "other" }).accuracy).not.toBe(derivePersona(input).accuracy);
  });

  it("keeps every number inside the range the simulation was designed for", () => {
    for (let index = 0; index < 200; index += 1) {
      const persona = derivePersona({ slug: `member-${index}`, displayName: "M", country: "CA", joinedAt: NOW });
      expect(persona.accuracy).toBeGreaterThanOrEqual(0.78);
      expect(persona.accuracy).toBeLessThanOrEqual(0.95);
      expect(persona.lessonsPerDay).toBeGreaterThanOrEqual(2);
      expect(persona.lessonsPerDay).toBeLessThanOrEqual(15);
      expect(persona.sessionHours.length).toBeGreaterThanOrEqual(1);
      expect(persona.sessionHours.length).toBeLessThanOrEqual(2);
      expect([1, 5, 10, 15, 20, 25, 30]).toContain(persona.placementFloor);
      expect([LADDER_STREAMS.un, LADDER_STREAMS.ug]).toContain(persona.stream);
      expect([-7, -4, -5, -6]).toContain(persona.utcOffsetHours);
    }
  });

  it("puts both ladders in the cohort", () => {
    const streams = new Set(
      Array.from({ length: 40 }, (_, i) => derivePersona({ slug: `s-${i}`, displayName: "S", country: "FR", joinedAt: NOW }).stream),
    );
    expect(streams).toEqual(new Set([LADDER_STREAMS.un, LADDER_STREAMS.ug]));
  });
});

describe("personaFor", () => {
  it("recovers the persona from an account row and refuses a row that is not ours", () => {
    const persona = personaFor({
      slug: "camille-l", displayName: "Camille L.", nickname: "Camille L.",
      joinedByEmail: "camille-l@fr.umakuma.invalid", createdAt: NOW,
    });
    expect(persona?.country).toBe("FR");
    expect(persona?.utcOffsetHours).toBe(2);
    expect(personaFor({ slug: "john", displayName: null, nickname: "John", joinedByEmail: "john@gmail.com", createdAt: NOW })).toBeNull();
  });
});

describe("inventName", () => {
  it("writes a third of names as handles and the rest as names", () => {
    const random = seededRandom("names");
    const styles = Array.from({ length: 300 }, () => inventName("US", random).style);
    const handles = styles.filter((s) => s === "handle").length;
    expect(handles).toBeGreaterThan(60);
    expect(handles).toBeLessThan(120);
  });

  it("makes handles lower-case ASCII, whatever the name carried", () => {
    const random = seededRandom("accents");
    for (let index = 0; index < 100; index += 1) {
      const name = inventName("FR", random);
      if (name.style === "handle") expect(name.displayName).toMatch(/^[a-z0-9._]+$/);
    }
  });
});
