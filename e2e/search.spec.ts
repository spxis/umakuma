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
const ERA_ANSWER = '[data-search-answer="era"]';
const MONEY_ANSWER = '[data-search-answer="currency"]';
const MONEY_HISTORY = "[data-search-answer-history]";

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

test("a column opens that catalogue in full", async ({ browser, baseURL }) => {
  /* A single common character matches far more than one column shows. */
  const page = await openPage(browser, `${baseURL}/search?query=${encodeURIComponent(COMMON_KANJI)}`);

  const rows = page.locator(RESULT_ROW);
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  const preview = await rows.count();

  /*
   * Asserted rather than skipped when the link is missing. A smoke test that
   * quietly skips is how this suite once reported green while exercising
   * almost nothing; 水 matches well past one column in WaniKani alone, so its
   * absence is a regression worth failing on.
   */
  const more = page.getByRole("link", { name: /\d+ more/ }).first();
  await expect(more).toBeVisible();
  await more.click();
  await page.waitForLoadState("domcontentloaded");

  await expect.poll(async () => rows.count(), { timeout: 15_000 }).toBeGreaterThan(preview);
  expect(new URL(page.url()).searchParams.get("from")).toBeTruthy();

  await finish(page);
});

/**
 * The filter row.
 *
 * Two axes, two ways to get it wrong quietly: a chip that reads as on while
 * its rows are hidden, and a click that empties the page with no way to tell
 * that from a search that found nothing.
 */
test("turning a kind off removes those rows and says so", async ({ browser, baseURL }) => {
  const page = await openPage(browser, `${baseURL}/search?query=${encodeURIComponent("中")}`);
  await expect(page.locator(RESULT_ROW).first()).toBeVisible({ timeout: 15_000 });

  const words = page.getByRole("link", { name: /^Words/ });
  await expect(words).toHaveAttribute("aria-pressed", "true");
  await words.click();
  await page.waitForLoadState("domcontentloaded");

  await expect(page.getByRole("link", { name: /^Words/ })).toHaveAttribute("aria-pressed", "false");
  expect(new URL(page.url()).searchParams.get("kinds")).toBe("kanji,radicals");

  /* The count stays on the chip, so a hidden kind reads as hidden rather than absent. */
  await expect(page.getByRole("link", { name: /^Words \d/ })).toBeVisible();

  await finish(page);
});

test("the arrows cross between columns", async ({ browser, baseURL }) => {
  const page = await openPage(browser, `${baseURL}/search?query=${encodeURIComponent("中")}`);
  await expect(page.locator(RESULT_ROW).first()).toBeVisible({ timeout: 15_000 });

  const cell = () =>
    page.evaluate(() => {
      const el = document.activeElement;
      return el ? `${el.getAttribute("data-search-col")}:${el.getAttribute("data-search-row")}` : "none";
    });

  await page.locator(PAGE_INPUT).click();
  await page.keyboard.press("ArrowDown");
  expect(await cell()).toBe("0:0");

  await page.keyboard.press("ArrowDown");
  expect(await cell()).toBe("0:1");

  /* 中 answers from more than one catalogue, so there is a column to cross into. */
  await page.keyboard.press("ArrowRight");
  expect(await cell()).toBe("1:0");

  await page.keyboard.press("ArrowLeft");
  expect((await cell()).startsWith("0:")).toBe(true);

  await page.keyboard.press("Escape");
  await expect(page.locator(PAGE_INPUT)).toBeFocused();

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

  await expect(page.getByRole("heading", { name: "Recent items" })).toBeVisible({ timeout: 10_000 });
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

/**
 * Selecting a result, which is the only reason to search.
 *
 * Everything above proves the results arrive. These prove they lead somewhere,
 * because for a while they did not: 水泡 - a real word, shown with its meaning
 * and its level - opened the library explorer, which answered "No item matched
 * 水泡". The explorer stops at the member's own level and the word is at 46, so
 * it had nowhere to put it. Nothing on the results page could have warned
 * anyone; the row looked like every row that works.
 *
 * A word, a kanji and a radical, because those are the three things WaniKani
 * teaches and each used to be addressed differently.
 */

/** What a page says when it was asked for something it cannot show. */
const EMPTY_ANSWERS = /No item matched|No items match|not found/i;

async function openFirstResult(page: Page): Promise<string> {
  const row = page.locator(RESULT_ROW).first();
  await expect(row).toBeVisible({ timeout: 15_000 });

  /* The glyph is the row's own answer to what it is; the destination has to show it. */
  const glyph = (await row.locator("span").first().innerText()).trim();
  await row.click();
  await page.waitForLoadState("domcontentloaded");
  return glyph;
}

test("a word result opens that word, whatever level it is", async ({ browser, baseURL }) => {
  /* Level 46, and the member the local suite runs as is nowhere near it. */
  const page = await openPage(browser, `${baseURL}/search?query=${encodeURIComponent("水泡")}`);

  const glyph = await openFirstResult(page);
  expect(glyph).toBe("水泡");

  await expect(page.getByText(EMPTY_ANSWERS)).toHaveCount(0);
  await expect(page.getByText("水泡").first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/foam/i).first()).toBeVisible();

  await finish(page);
});

test("a kanji result opens that kanji", async ({ browser, baseURL }) => {
  const page = await openPage(browser, `${baseURL}/search?query=${encodeURIComponent(COMMON_KANJI)}`);

  await page.locator(`a[href^="/kanji/"]`).first().click();
  await page.waitForLoadState("domcontentloaded");

  await expect(page.getByText(EMPTY_ANSWERS)).toHaveCount(0);
  await expect(page.getByText(COMMON_KANJI).first()).toBeVisible({ timeout: 10_000 });

  await finish(page);
});

test("a radical result opens that radical", async ({ browser, baseURL }) => {
  /*
   * Radicals are the awkward third: many are drawn rather than written, so the
   * row shows the radical's name where a kanji row shows a character. An
   * address built from what the row displays would be a search for a character
   * that does not exist.
   */
  const page = await openPage(browser, `${baseURL}/search?query=ground`);

  const radical = page.locator(`a[href^="/radicals/"]`).first();
  await expect(radical).toBeVisible({ timeout: 15_000 });
  await radical.click();
  await page.waitForLoadState("domcontentloaded");

  await expect(page.getByText(EMPTY_ANSWERS)).toHaveCount(0);
  await expect(page.getByText(/ground/i).first()).toBeVisible({ timeout: 10_000 });

  await finish(page);
});

/**
 * Getting back out of the results.
 *
 * Arrowing down loads the next stretch as it nears the end, so the list grows
 * under you. Forty rows into 中 the search box is far off the top of the
 * screen and the only route back was ArrowUp forty times - and overshooting
 * downward on the way loaded more rows to climb. It reads as the arrows having
 * no way out, because that is what it was.
 */
test("one key comes back from anywhere in the results", async ({ browser, baseURL }) => {
  const page = await openPage(browser, `${baseURL}/search?query=${encodeURIComponent("中")}`);
  await expect(page.locator(RESULT_ROW).first()).toBeVisible({ timeout: 15_000 });

  await page.locator(PAGE_INPUT).click();
  for (let step = 0; step < 12; step += 1) {
    await page.keyboard.press("ArrowDown");
  }

  /* Deep enough that walking back would be the bug, not the fix. */
  const deep = await page.evaluate((attr) => document.activeElement?.getAttribute(attr), "data-search-row");
  expect(Number(deep)).toBeGreaterThan(5);

  await page.keyboard.press("Escape");
  await expect(page.locator(PAGE_INPUT)).toBeFocused();

  await finish(page);
});

test("Home reaches the first result, then the box", async ({ browser, baseURL }) => {
  const page = await openPage(browser, `${baseURL}/search?query=${encodeURIComponent("中")}`);
  await expect(page.locator(RESULT_ROW).first()).toBeVisible({ timeout: 15_000 });

  await page.locator(PAGE_INPUT).click();
  for (let step = 0; step < 8; step += 1) {
    await page.keyboard.press("ArrowDown");
  }

  await page.keyboard.press("Home");
  expect(
    await page.evaluate((attr) => document.activeElement?.getAttribute(attr), "data-search-row"),
  ).toBe("0");

  await page.keyboard.press("Home");
  await expect(page.locator(PAGE_INPUT)).toBeFocused();

  await finish(page);
});

test("what you open is remembered, not only what you typed", async ({ browser, baseURL }) => {
  /*
   * The history kept the question and threw away the answer: searching for a
   * word, reading down the rows and opening one left the typed words
   * remembered and the word itself forgotten.
   */
  const page = await openPage(browser, `${baseURL}/search?query=${encodeURIComponent("水兵")}`);

  const row = page.locator(`a${RESULT_ROW}`).first();
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.click();
  await page.waitForLoadState("domcontentloaded");

  /* Remembered per browser, so the second visit is what proves it was kept. */
  await page.goto(`${baseURL}/search`, { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Recent items" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("link", { name: /水兵/ }).first()).toBeVisible();

  await finish(page);
});

test("no result is dead text", async ({ browser, baseURL }) => {
  /*
   * A row with no address renders as a plain div: it looks like the rows
   * around it, highlights on hover like them, and does nothing. Signed out,
   * every word and every radical was one of these.
   */
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await page.goto(`${baseURL}/search?query=${encodeURIComponent(COMMON_KANJI)}`, {
    waitUntil: "domcontentloaded",
  });

  const rows = page.locator(RESULT_ROW);
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  const total = await rows.count();
  const linked = await page.locator(`a${RESULT_ROW}`).count();
  expect(linked, "every result row must be a link").toBe(total);

  await context.close();
});

test("an era year is answered, not just searched for", async ({ browser, baseURL }) => {
  /*
   * "Heisei 3" is a request to be told a number, and no catalogue holds one.
   * The search answered with rows about the digit three and never with 1991.
   */
  const page = await openPage(browser, `${baseURL}/search?query=${encodeURIComponent("Heisei 3")}`);

  const answer = page.locator(ERA_ANSWER);
  await expect(answer).toBeVisible({ timeout: 15_000 });
  await expect(answer).toContainText("1991");
  await expect(answer).toContainText("平成3年");

  await finish(page);
});

test("an era answer outlives a query the catalogues cannot match", async ({ browser, baseURL }) => {
  /*
   * The answer is worked out rather than looked up, so it has to survive the
   * page saying nothing matched - which is the case it exists for.
   */
  const page = await openPage(browser, `${baseURL}/search?query=${encodeURIComponent("Taisho 5")}`);

  const answer = page.locator(ERA_ANSWER);
  await expect(answer).toBeVisible({ timeout: 15_000 });
  await expect(answer).toContainText("1916");
  await expect(answer).toContainText("大正5年");

  await finish(page);
});

/*
 * The two money tests reach a third-party rate source through the page, which
 * is the point of them: the parsing and the arithmetic are covered by unit
 * tests, and what is left to check is that a real request reaches a real rate
 * and lands on the page. A failure here means the currency answer is not
 * working right now, which is worth being told.
 */
test("an amount of money is answered in yen", async ({ browser, baseURL }) => {
  const page = await openPage(browser, `${baseURL}/search?query=${encodeURIComponent("14.40 CAD")}`);

  const answer = page.locator(MONEY_ANSWER);
  await expect(answer).toBeVisible({ timeout: 20_000 });
  await expect(answer).toContainText("CA$14.40");
  await expect(answer).toContainText("円");
  /* The day the rates were published, so the number is never read as live. */
  await expect(answer).toContainText(/rates/i);

  await finish(page);
});

test("a yen amount is answered in both home currencies", async ({ browser, baseURL }) => {
  const page = await openPage(browser, `${baseURL}/search?query=${encodeURIComponent("1500円")}`);

  const answer = page.locator(MONEY_ANSWER);
  await expect(answer).toBeVisible({ timeout: 20_000 });
  await expect(answer).toContainText("CA$");
  await expect(answer).toContainText("¥1,500");

  await finish(page);
});

test("a converted amount carries its own history", async ({ browser, baseURL }) => {
  /*
   * Five independent lookbacks, each averaged over a month of published rates.
   * Twenty years back is the one that reaches furthest and fails first, so it
   * is the one worth naming.
   */
  const page = await openPage(browser, `${baseURL}/search?query=${encodeURIComponent("23 EUR")}`);

  const history = page.locator(MONEY_HISTORY);
  await expect(history).toBeVisible({ timeout: 25_000 });
  await expect(history).toContainText("180 days ago");
  await expect(history).toContainText("20 years ago");
  /* The note is what separates an average from a spot rate for the reader. */
  await expect(history).toContainText(/averages the \d+ days/);

  await finish(page);
});

test("a bare dollar sign is not guessed at", async ({ browser, baseURL }) => {
  /*
   * It names the Canadian dollar and the American one, and the site is written
   * for both - so an answer here would be wrong for half the people who typed
   * it. Nothing is the honest answer, and the catalogues still run.
   */
  const page = await openPage(browser, `${baseURL}/search?query=${encodeURIComponent("$20")}`);

  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(MONEY_ANSWER)).toHaveCount(0);

  await finish(page);
});
