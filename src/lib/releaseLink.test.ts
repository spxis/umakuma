import { describe, expect, it } from "vitest";

import { RELEASES_HREF, releasesHrefForViewer } from "./releaseLink";

describe("releasesHrefForViewer", () => {
  /*
   * The link was admin-only while the only release list was the admin
   * timeline. The updates page is public, so the version number is a live link
   * for everyone rather than plain text for most people.
   */
  it("sends everyone to the public updates page", () => {
    expect(releasesHrefForViewer(true)).toBe(RELEASES_HREF);
    expect(releasesHrefForViewer(false)).toBe(RELEASES_HREF);
  });

  it("points at the public updates page", () => {
    expect(RELEASES_HREF).toBe("/releases");
  });
});
