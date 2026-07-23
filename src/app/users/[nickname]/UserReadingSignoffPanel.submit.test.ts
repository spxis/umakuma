import { describe, expect, it } from "vitest";

import { buildCheckinSavedMessage } from "./UserReadingSignoffPanel.submit";

describe("buildCheckinSavedMessage", () => {
  it("does not confirm zero-review credit on a reading-only check-in", () => {
    expect(buildCheckinSavedMessage({
      waniKaniCreditRequested: false,
      waniKaniCreditGranted: false,
      pendingReviewsAtSave: 0,
    })).toBe("Check-in saved.");
  });

  it("keeps the normal message when no WaniKani credit was requested or granted", () => {
    expect(buildCheckinSavedMessage({
      waniKaniCreditRequested: false,
      waniKaniCreditGranted: false,
      pendingReviewsAtSave: 4,
    })).toBe("Check-in saved.");
  });

  it("reports when today's WaniKani credit was already counted", () => {
    expect(buildCheckinSavedMessage({
      waniKaniCreditRequested: true,
      waniKaniCreditGranted: false,
      waniKaniCreditAlreadyGranted: true,
      pendingReviewsAtSave: 0,
    })).toBe("Check-in saved. Today's 0-review credit was already counted.");
  });
});