import { describe, expect, it } from "vitest";

import {
  MEMBER_CAPABILITIES,
  MEMBER_CAPABILITY_DEFINITIONS,
  canUseCapability,
  capabilitiesNeedingWanikani,
  capabilitiesWithoutWanikani,
} from "./memberCapabilities";

const CONNECTED = { hasWanikani: true, internal: true };
const UNCONNECTED = { hasWanikani: false, internal: true };
const OUTSIDER = { hasWanikani: true, internal: false };

describe("the capability registry", () => {
  it("defines every capability it names", () => {
    for (const id of Object.values(MEMBER_CAPABILITIES)) {
      expect(MEMBER_CAPABILITY_DEFINITIONS[id]?.id, id).toBe(id);
    }
  });

  it("gives every capability something a member can read", () => {
    for (const capability of Object.values(MEMBER_CAPABILITY_DEFINITIONS)) {
      expect(capability.label.length, capability.id).toBeGreaterThan(3);
      expect(capability.detail.length, capability.id).toBeGreaterThan(10);
    }
  });

  /*
   * The four that read WaniKani's own data. Adding a fifth is a real decision
   * - it takes something away from every member without a connection - so it
   * changes this list rather than passing quietly.
   */
  it("asks for WaniKani only where WaniKani's own data is what is read", () => {
    expect(capabilitiesNeedingWanikani().map((capability) => capability.id)).toEqual([
      MEMBER_CAPABILITIES.studyQueue,
      MEMBER_CAPABILITIES.wanikaniLibrary,
      MEMBER_CAPABILITIES.wanikaniProgress,
      MEMBER_CAPABILITIES.leaderboardRank,
    ]);
  });

  it("leaves the app's own surfaces open to everybody", () => {
    const open = capabilitiesWithoutWanikani().map((capability) => capability.id);
    expect(open).toContain(MEMBER_CAPABILITIES.games);
    expect(open).toContain(MEMBER_CAPABILITIES.maps);
    expect(open).toContain(MEMBER_CAPABILITIES.jlptStudy);
    expect(open).toContain(MEMBER_CAPABILITIES.customLibraries);
    expect(open).toContain(MEMBER_CAPABILITIES.lists);
  });

  /*
   * Every capability is on one list or the other, except the internal-only
   * ones: the connection page is about what WaniKani adds, and naming a page
   * most members will never be offered answers a question nobody asked.
   */
  it("splits the whole registry between the two lists, bar the internal ones", () => {
    const internalOnly = Object.values(MEMBER_CAPABILITY_DEFINITIONS).filter(
      (capability) => capability.requiresInternal,
    ).length;
    expect(capabilitiesNeedingWanikani().length + capabilitiesWithoutWanikani().length + internalOnly).toBe(
      Object.values(MEMBER_CAPABILITIES).length,
    );
    expect(internalOnly).toBe(1);
  });
});

describe("canUseCapability", () => {
  it("opens everything to a connected member who is one of us", () => {
    for (const id of Object.values(MEMBER_CAPABILITIES)) {
      expect(canUseCapability(id, CONNECTED), id).toBe(true);
    }
  });

  /*
   * The reading challenge is a household's arrangement about pocket money.
   * A member with every WaniKani surface open to them is still not offered it.
   */
  it("keeps the reading challenge from a member who is not internal", () => {
    expect(canUseCapability(MEMBER_CAPABILITIES.readingChallenge, OUTSIDER)).toBe(false);
    expect(canUseCapability(MEMBER_CAPABILITIES.readingChallenge, CONNECTED)).toBe(true);
    expect(canUseCapability(MEMBER_CAPABILITIES.newsReader, OUTSIDER)).toBe(true);
  });

  it("treats a member with nothing said about them as an ordinary one", () => {
    expect(canUseCapability(MEMBER_CAPABILITIES.readingChallenge, { hasWanikani: true })).toBe(false);
  });

  it("keeps the WaniKani-shaped surfaces from a member with no connection", () => {
    expect(canUseCapability(MEMBER_CAPABILITIES.studyQueue, UNCONNECTED)).toBe(false);
    expect(canUseCapability(MEMBER_CAPABILITIES.wanikaniLibrary, UNCONNECTED)).toBe(false);
    expect(canUseCapability(MEMBER_CAPABILITIES.wanikaniProgress, UNCONNECTED)).toBe(false);
    expect(canUseCapability(MEMBER_CAPABILITIES.leaderboardRank, UNCONNECTED)).toBe(false);
  });

  it("leaves the rest of the site to a member with no connection", () => {
    for (const capability of capabilitiesWithoutWanikani()) {
      expect(canUseCapability(capability.id, UNCONNECTED), capability.id).toBe(true);
    }
  });
});
