import { expect, test, type Browser, type Page } from "@playwright/test";
import fs from "node:fs";

import { STORAGE_STATE } from "./sessionState";

/**
 * Search, exercised rather than merely loaded.
 *
 * Seven releases went into this page - suggestions, romaji folding, ghost
 * completion, paging, remembered searches - and the only check it had was that
 * nothing stuck out sideways at three widths. Every regression that could
 * matter here is behavioural: the suggestions never arriving, Enter not
 * reaching the results, the next page never appending, the header vanishing
 * again. So this asks the page to do those things.
 *
 * The assertions hold whether or not a session is loaded, because the local
 * suite runs signed in and the build suite runs signed out. Where the two
 * genuinely differ - a signed-out reader is offered the public kanji page - the
 * test opens its own anonymous context and says so.
 */

const PAGE_INPUT = "#search-page-input";
const PAGE_SUGGEST = "#search-page-suggest";
const PAGE_SUBMIT = `form:has(${PAGE_INPUT}) button[type=submit]`;
const HEADER_SUBMIT = "form:has(#global-search) button[type=submit]";
const RESULT_ROW = "[data-search-result-row]";

/** A character every catalogue holds, so the row count never depends on level. */
const COMMON_KANJI = "水";

/*
 * Errors are collected per page and asserted by `finish`, not from a close
 * handler: a failed expect inside an event callback runs after the test has
 * ended, where nobody is listening, and an assertion nobody reads is worse
 * than none at all.
 */
const pageErrors = new WeakMap<Page, string[]>();

async function openPage(browser: Browser, url: string): Promise<Page> {
  /*
   * A context carrying whatever session the run has, because
   * `browser.newPage()` builds a fresh one and ignores the project's
   * `storageState` - so the local suite was browsing signed out while its own
   * header comment said it ran signed in.
   */
  const context = await browser.newContext(
    fs.existsSync(STORAGE_STATE) ? { storageState: STORAGE_STATE } : {},
  );
  const page = await context.newPage();
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  return page;
}

async function finish(page: Page): Promise<void> {
  expect(pageErrors.get(page) ?? [], `page errors for ${page.url()}`).toEqual([]);
  await page.close();
}

test("search results keep the site navigation", async ({ browser, baseURL }) => {
  const page = await openPage(browser, `${baseURL}/search?query=${encodeURIComponent(COMMON_KANJI)}`);

  /* The results page once dropped the chrome entirely, ending every search at a dead end. */
  await expect(page.locator("#global-search")).toBeVisible();
  await expect(page.getByRole("link", { name: "Leaderboard" }).first()).toBeVisible();
  await expect(page.locator(RESULT_ROW).first()).toBeVisible();

  await finish(page);
});

test("typing offers suggestions without leaving the page", async ({ browser, baseURL }) => {
  const page = await openPage(browser, `${baseURL}/search`);

  await page.locator(PAGE_INPUT).click();
  await page.locator(PAGE_INPUT).type("water", { delay: 40 });

  const options = page.locator(`${PAGE_SUGGEST} [role=option]`);
  await expect(options.first()).toBeVisible({ timeout: 10_000 });
  expect(await options.count()).toBeGreaterThan(1);
  expect(new URL(page.url()).searchParams.get("query")).toBeNull();

  await finish(page);
});

test("romaji reaches the kana behind it", async ({ browser, baseURL }) => {
  /* "watashi" found nothing at all until the query was folded into わたし. */
  const page = await openPage(browser, `${baseURL}/search?query=watashi`);

  await expect(page.locator(RESULT_ROW).first()).toBeVisible();
  await expect(page.locator(RESULT_ROW).first()).toContainText("私");

  await finish(page);
});

test("the magnifier searches what was typed", async ({ browser, baseURL }) => {
  const page = await openPage(browser, `${baseURL}/search`);

  await page.locator(PAGE_INPUT).click();
  await page.locator(PAGE_INPUT).type(COMMON_KANJI, { delay: 40 });
  await page.locator(PAGE_SUBMIT).click();

  await page.waitForURL(`**/search?query=**`, { timeout: 10_000 });
  await expect(page.locator(RESULT_ROW).first()).toBeVisible();

  await finish(page);
});

test("an empty box opens the search page", async ({ browser, baseURL }) => {
  const page = await openPage(browser, `${baseURL}/`);

  await page.locator(HEADER_SUBMIT).first().click();

  await page.waitForURL("**/search**", { timeout: 10_000 });
  await expect(page.locator(PAGE_INPUT)).toBeVisible();

  await finish(page);
});

test("the results list pages as the reader reaches the end", async ({ browser, baseURL }) => {
  /* A single common character matches far more than one page across three catalogues. */
  const page = await openPage(browser, `${baseURL}/search?query=${encodeURIComponent(COMMON_KANJI)}`);

  const rows = page.locator(RESULT_ROW);
  await expect(rows.first()).toBeVisible();
  const firstPage = await rows.count();

  /*
   * Asserted rather than skipped when the button is missing. A smoke test that
   * quietly skips is how this suite once reported green while exercising
   * almost nothing; 水 matches well past one page in all three catalogues, so
   * its absence is a regression worth failing on.
   */
  const more = page.getByRole("button", { name: "Show more results" });
  await expect(more).toBeVisible();
  await more.click();
  await expect.poll(async () => rows.count(), { timeout: 10_000 }).toBeGreaterThan(firstPage);

  await finish(page);
});

test("a search is remembered for next time", async ({ browser, baseURL }) => {
  const page = await openPage(browser, `${baseURL}/search?query=${encodeURIComponent(COMMON_KANJI)}`);

  /*
   * Wait for the results before leaving the page.
   *
   * A search is remembered by an effect that runs after hydration, and
   * `openPage` returns at `domcontentloaded` - so navigating away immediately
   * raced the write and usually won. The test then reported that the feature
   * was broken when all it had done was leave too early.
   */
  await expect(page.locator(RESULT_ROW).first()).toBeVisible({ timeout: 15_000 });

  /* Remembered per browser, so the second visit is what proves it was kept. */
  await page.goto(`${baseURL}/search`, { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Recent searches" })).toBeVisible({ timeout: 10_000 });
  const remembered = page.getByRole("link", { name: COMMON_KANJI, exact: true });
  await expect(remembered.first()).toBeVisible();

  await finish(page);
});

test("a signed-out reader is offered the public kanji page", async ({ browser, baseURL }) => {
  /* The explorers are behind the sign-in wall; without this every row is dead text. */
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await page.goto(`${baseURL}/search?query=${encodeURIComponent(COMMON_KANJI)}`, {
    waitUntil: "domcontentloaded",
  });

  const kanjiLink = page.locator(`a[href^="/kanji/"]`);
  await expect(kanjiLink.first()).toBeVisible({ timeout: 10_000 });

  await context.close();
});
