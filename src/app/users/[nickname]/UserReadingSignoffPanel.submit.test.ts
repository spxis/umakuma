import { describe, expect, it } from "vitest";

import { buildCheckinSavedMessage } from "./UserReadingSignoffPanel.submit";

describe("buildCheckinSavedMessage", () => {
  it("confirms automatic zero-review credit on a reading-only check-in", () => {
    expect(buildCheckinSavedMessage({
      waniKaniCreditRequested: false,
      waniKaniCreditGranted: true,
      pendingReviewsAtSave: 0,
    })).toBe("Check-in saved. 0-review credit confirmed.");
  });

  it("keeps the normal message when no WaniKani credit was requested or granted", () => {
    expect(buildCheckinSavedMessage({
      waniKaniCreditRequested: false,
      waniKaniCreditGranted: false,
      pendingReviewsAtSave: 4,
    })).toBe("Check-in saved.");
  });
});