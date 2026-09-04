import { expect, test } from "@playwright/test";

/**
 * Admin endpoints answer nobody who has not signed in.
 *
 * The catalogue gap names internal subject ids and, by their absence, what the
 * app is asking WaniKani for. It is not sensitive the way a token is, but it is
 * operator data, and every route under /api/admin owes the same answer to an
 * anonymous caller.
 */
test.describe("admin api", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the catalogue gap refuses an anonymous request", async ({ request }) => {
    const response = await request.get("/api/admin/wk-catalog/gap");

    expect(response.status()).toBe(401);
  });
});
