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
  const listLink = page.locator("h2 a[href*='/lists/']").first();
  test.skip((await listLink.count()) === 0, "The local member has no saved lists to open.");

  const name = (await listLink.textContent())?.trim() ?? "";
  await listLink.click();

  await expect(page).toHaveURL(/\/users\/testkuma\/lists\/[^/?]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page.getByRole("link", { name: STUDY_LIST_COPY.backToLists })).toBeVisible();
  /* The owner decides who may see it, from the page itself. */
  await expect(page.getByRole("group", { name: STUDY_LIST_COPY.visibilityLabel })).toBeVisible();
});
