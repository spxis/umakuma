import { describe, expect, it } from "vitest";

import { RELEASES_HREF } from "./releaseLink";

describe("the releases link", () => {
  /*
   * The link was admin-only while the only release list was the admin
   * timeline. The updates page is public, so the version number is a live link
   * for everyone rather than plain text for most people - which is why the
   * viewer-dependent helper this test used to exercise is gone.
   */
  it("points at the public updates page", () => {
    expect(RELEASES_HREF).toBe("/releases");
  });
});
