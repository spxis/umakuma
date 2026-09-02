import { describe, expect, it } from "vitest";

import {
  MEMBER_CAPABILITIES,
  MEMBER_CAPABILITY_DEFINITIONS,
  canUseCapability,
  capabilitiesNeedingWanikani,
  capabilitiesWithoutWanikani,
} from "./memberCapabilities";

const CONNECTED = { hasWanikani: true };
const UNCONNECTED = { hasWanikani: false };

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

  it("splits the whole registry between the two lists", () => {
    expect(capabilitiesNeedingWanikani().length + capabilitiesWithoutWanikani().length).toBe(
      Object.values(MEMBER_CAPABILITIES).length,
    );
  });
});

describe("canUseCapability", () => {
  it("opens everything to a connected member", () => {
    for (const id of Object.values(MEMBER_CAPABILITIES)) {
      expect(canUseCapability(id, CONNECTED), id).toBe(true);
    }
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
