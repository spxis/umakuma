import { describe, expect, it } from "vitest";

import { RELEASES_HREF, releasesHrefForViewer } from "./releaseLink";

describe("releasesHrefForViewer", () => {
  it("sends an admin to the release timeline", () => {
    expect(releasesHrefForViewer(true)).toBe(RELEASES_HREF);
  });

  /*
   * The timeline is admin-only, so a member offered the link would just be
   * bounced off the authorization wall - the same complaint as a header full of
   * links to /join.
   */
  it("leaves the version as plain text for everyone else", () => {
    expect(releasesHrefForViewer(false)).toBeNull();
  });

  it("points at the admin releases page", () => {
    expect(RELEASES_HREF).toBe("/admin/releases");
  });
});
