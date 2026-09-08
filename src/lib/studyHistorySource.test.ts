import { describe, expect, it } from "vitest";

import { normalizeStudyHistorySource } from "./studyHistorySource";

describe("normalizeStudyHistorySource", () => {
  it("passes each of the three sources through", () => {
    expect(normalizeStudyHistorySource("umakuma", "wanikani")).toBe("umakuma");
    expect(normalizeStudyHistorySource("custom", "wanikani")).toBe("custom");
    expect(normalizeStudyHistorySource("wanikani", "umakuma")).toBe("wanikani");
  });

  it("falls back for anything else, including nothing", () => {
    expect(normalizeStudyHistorySource(null, "umakuma")).toBe("umakuma");
    expect(normalizeStudyHistorySource(undefined, "umakuma")).toBe("umakuma");
    expect(normalizeStudyHistorySource("wanikani-old", "umakuma")).toBe("umakuma");
    expect(normalizeStudyHistorySource("", "wanikani")).toBe("wanikani");
  });
});
