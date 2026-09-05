import { expect, test } from "@playwright/test";

/**
 * The placement routes answer nobody who has not signed in.
 *
 * They matter more than most: between them they raise a member's level floor
 * and write thousands of SRS rows, and the floor is raise-only, so a write
 * made by the wrong caller cannot be taken back. Both check `canAccessAccount`
 * before they read the body, which is what this holds in place.
 */
test.describe("placement api", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const accountId = "not-a-real-account";

  test("starting a placement test refuses an anonymous request", async ({ request }) => {
    const response = await request.post(`/api/uk-study/${accountId}/placement/start`, { data: {} });

    expect(response.status()).toBe(401);
  });

  test("answering a probe refuses an anonymous request", async ({ request }) => {
    /* A ticket that could never verify, to prove the refusal comes from the
       access check rather than from the signature failing later. */
    const response = await request.post(`/api/uk-study/${accountId}/placement/next`, {
      data: { ticket: "not.a.ticket", chosenSubjectIds: [] },
    });

    expect(response.status()).toBe(401);
  });

  test("the placement routes are not readable", async ({ request }) => {
    /* Neither is a GET: both hand out or consume a signed ticket, and one of
       them writes. A GET that worked would be one a link could trigger. */
    const started = await request.get(`/api/uk-study/${accountId}/placement/start`);
    const next = await request.get(`/api/uk-study/${accountId}/placement/next`);

    expect(started.status()).toBe(405);
    expect(next.status()).toBe(405);
  });
});
