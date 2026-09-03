import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const HOOK = join(process.cwd(), "src/app/users/[nickname]/jlpt-explorer/lib/useSelectedKanjiDetails.ts");
const CONTENT = join(process.cwd(), "src/app/users/[nickname]/jlpt-explorer/components/JlptExplorerContent.tsx");
const source = () => readFileSync(HOOK, "utf8") + readFileSync(CONTENT, "utf8");

/**
 * Which account the review history is asked about.
 *
 * The component takes `accountId` as a prop and uses it for its other fetches,
 * but the history request built its own from `window.location`: the first
 * segment after `/users/` is the member's nickname or slug, never their
 * account id. Every request went to `/api/study/<nickname>/...` and answered
 * 404, so Show review stats could never fill in.
 *
 * The mistake is invisible in behaviour - the panel shows nothing either way -
 * so this reads the source, the way the kanji index tests do.
 */
describe("the review history request", () => {
  it("asks under the account id the component was given", () => {
    expect(source()).toContain("`/api/study/${accountId}/subjects/${subjectId}/history");
  });

  it("does not go back to reading an id out of the address bar", () => {
    const text = source();
    expect(text).not.toContain("getAccountIdFromUrl");
    expect(text).not.toContain("window.location.pathname.match");
  });
});
