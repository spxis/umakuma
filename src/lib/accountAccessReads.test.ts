import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/*
 * The busiest routes in the app, and what they cost per call.
 *
 * Each of these checked access with one database read and then read the same
 * row again for the member's WaniKani token. Counts and queue are what the
 * study page asks for on a timer and review is asked once per answer, so that
 * second read was the single most repeated query in the product. The columns
 * an access decision needs are three small ones; adding them to a read the
 * route was making anyway costs nothing and removes the round trip.
 */
const STUDY_ROUTES = [
  "src/app/api/study/[accountId]/counts/route.ts",
  "src/app/api/study/[accountId]/queue/route.ts",
  "src/app/api/study/[accountId]/review/route.ts",
  "src/app/api/study/[accountId]/upcoming/route.ts",
  "src/app/api/study/[accountId]/lesson/start/route.ts",
];

describe("what a study request reads", () => {
  it.each(STUDY_ROUTES)("%s reads the account once", (path) => {
    const source = read(path);
    expect(source).toContain("loadStudyAccount");
    /*
     * No second lookup of the same row. A route that needs something else
     * from the account should widen the shared select rather than add a query
     * that runs on every poll.
     */
    expect(source).not.toContain("prisma.account.findUnique");
  });

  /*
   * The two answers stay separate. A permitted request for an account that has
   * since been deleted is a 404, not a 401, and collapsing them would tell a
   * member they are unauthorised for their own missing account.
   */
  it("keeps permission and existence as different answers", () => {
    const access = read("src/lib/accountAccess.ts");
    expect(access).toContain("allowed: boolean");
    expect(access).toContain("account: StudyAccountRow | null");
  });

  /*
   * The admin bypass answers without reading anything at all, which is both
   * cheaper and the existing behaviour: reviewing an account is how a
   * rejection gets reconsidered.
   */
  it("lets an admin through without a query", () => {
    const access = read("src/lib/accountAccess.ts");
    const fn = access.slice(access.indexOf("export async function canAccessAccount"));
    const adminReturn = fn.indexOf("return true;");
    const firstQuery = fn.indexOf("prisma.account.findUnique");
    expect(adminReturn).toBeGreaterThan(-1);
    expect(adminReturn).toBeLessThan(firstQuery);
  });

  /* Still one decision, made in one place, for both entry points. */
  it("shares the access decision between both helpers", () => {
    const access = read("src/lib/accountAccess.ts");
    expect(access.match(/decideAccess\(/g)?.length).toBeGreaterThanOrEqual(3);
  });
});
