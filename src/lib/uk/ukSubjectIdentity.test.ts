import { describe, expect, it } from "vitest";

import { MAP_SUBJECT_ID_BASE } from "@/lib/japanPrefectures";

import { UK_SUBJECT_ID_BASE, isUkOnlySubjectId, ukSubjectIdFromIdentity, ukSubjectIdentity } from "./ukSubjectIdentity";

describe("what a subject on our ladder is called", () => {
  it("answers to the WaniKani id where WaniKani teaches it", () => {
    expect(ukSubjectIdentity({ id: 8252, wkSubjectId: 689 })).toBe(689);
  });

  it("takes a reserved id above WaniKani's range where they never did", () => {
    const id = ukSubjectIdentity({ id: 9100, wkSubjectId: null });
    expect(id).toBe(UK_SUBJECT_ID_BASE + 9100);
    expect(isUkOnlySubjectId(id)).toBe(true);
    expect(ukSubjectIdFromIdentity(id)).toBe(9100);
  });

  it("never mistakes a WaniKani id or a prefecture for one of ours", () => {
    expect(isUkOnlySubjectId(8252)).toBe(false);
    expect(ukSubjectIdFromIdentity(689)).toBeNull();
    expect(isUkOnlySubjectId(MAP_SUBJECT_ID_BASE + 13)).toBe(false);
    expect(UK_SUBJECT_ID_BASE).toBeLessThan(MAP_SUBJECT_ID_BASE);
  });
});
