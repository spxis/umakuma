import { describe, expect, it } from "vitest";

import { describeFreshness, formatCount } from "./sourceReport";

/**
 * When a source last came in, in words a reader can weigh.
 *
 * "3 months ago" is what somebody checks a borrowed fact against; the exact
 * date sits beside it for the reader who wants it. A source with no stamp says
 * so rather than inventing one.
 */
describe("how fresh an import is", () => {
  const now = Date.parse("2026-09-01T20:00:00Z");

  it("says today and yesterday in those words", () => {
    expect(describeFreshness("2026-09-01T03:00:00Z", now)).toBe("today");
    expect(describeFreshness("2026-08-31T03:00:00Z", now)).toBe("yesterday");
  });

  it("counts days while days still mean something", () => {
    expect(describeFreshness("2026-08-20T03:00:00Z", now)).toBe("12 days ago");
  });

  it("turns to months once they do not", () => {
    expect(describeFreshness("2026-06-13T11:52:12Z", now)).toBe("2 months ago");
  });

  it("does not pretend to a date it has not got", () => {
    expect(describeFreshness(null, now)).toBe("not recorded");
    expect(describeFreshness("not a date", now)).toBe("not recorded");
  });
});

describe("a count on the page", () => {
  it("separates thousands the way the rest of the site does", () => {
    expect(formatCount(10384)).toBe("10,384");
    expect(formatCount(80)).toBe("80");
  });
});
