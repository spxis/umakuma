import { expect, test } from "@playwright/test";

import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";

import { STORAGE_STATE } from "./sessionState";

/**
 * A list at its own address.
 *
 * The Lists page names each saved list, and the name leads to the list's page:
 * `/users/<member>/lists/<name-as-slug>`. The page carries the name as its
 * heading and the items under it, and the owner sees the share controls.
 */
test.use({ storageState: STORAGE_STATE });

test("a saved list opens at its own address", async ({ page }) => {
  await page.goto("/users/testkuma/lists");
  /*
   * A saved list rather than whichever card is first. Trouble and Favourites
   * lead the shelf and are built in - they have no visibility to set, so the
   * share controls this checks for are rightly absent on them.
   */
  const listLink = page
    .locator("h2 a[href*='/lists/']")
    .filter({ hasNotText: /^(Trouble|Favourites|Burned)$/ })
    .first();
  test.skip((await listLink.count()) === 0, "The local member has no saved lists to open.");

  const name = (await listLink.textContent())?.trim() ?? "";
  await listLink.click();

  await expect(page).toHaveURL(/\/users\/testkuma\/lists\/[^/?]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page.getByRole("link", { name: STUDY_LIST_COPY.backToLists })).toBeVisible();
  /* The owner decides who may see it, from the page itself. */
  await expect(page.getByRole("group", { name: STUDY_LIST_COPY.visibilityLabel })).toBeVisible();
});

/**
 * The worksheet, from the page that shows the list.
 *
 * A list could be turned into a writing sheet only from its card on the shelf,
 * and only as a sheet of hand-picked characters carried in the query string.
 * The list's own page now offers it, the sheet is addressed by the list's name,
 * and it is titled with that name so a printout says which list it is.
 */
test("a list opens its own worksheet, named after the list", async ({ page }) => {
  await page.goto("/users/testkuma/lists");
  /* A saved list, not a built-in one: those are addressed by their tag instead. */
  const listLink = page
    .locator("h2 a[href*='/lists/']")
    .filter({ hasNotText: /^(Trouble|Favourites|Burned)$/ })
    .first();
  test.skip((await listLink.count()) === 0, "The local member has no saved lists to open.");
  /* Read from the link, which is the list's name, before anything navigates. */
  const name = (await listLink.textContent())?.trim() ?? "";
  await listLink.click();
  await expect(page).toHaveURL(/\/lists\/[^/?]+$/);

  const worksheet = page.getByRole("link", { name: STUDY_LIST_COPY.worksheet }).first();
  test.skip((await worksheet.count()) === 0, "That list holds no kanji to trace.");
  await worksheet.click();

  await expect(page).toHaveURL(/\/practice\/list\/[^/?]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
});
