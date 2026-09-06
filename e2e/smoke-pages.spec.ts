import { expect, test, type Browser } from "@playwright/test";
import fs from "node:fs";

import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { CONNECT_COPY } from "@/app/users/[nickname]/wanikani/connectCopy";
import { STUDY_PANEL_TEXT } from "@/app/users/[nickname]/study-explorer/components/StudyExplorer.constants";
import { XP_BOARD_COPY } from "@/app/xp/xpBoardCopy";
import { XP_HISTORY_COPY } from "@/app/users/[nickname]/xp/xpHistoryCopy";
import { XP_RANK_COPY } from "@/app/users/[nickname]/settings/profileCopy";

import { STORAGE_STATE } from "./sessionState";

type TabDef = {
  key: "study" | "level" | "jlpt";
  /** The route the old ?tab= query redirects to. */
  path: string;
  /** What the page it lands on calls itself. */
  heading: RegExp;
};

const tabs: TabDef[] = [
  { key: "study", path: "study", heading: /Study/i },
  /* The page names itself; the library it is showing is context below it. */
  { key: "level", path: "library-explorer", heading: /Library Explorer/i },
  { key: "jlpt", path: "jlpt-explorer", heading: /JLPT Explorer/i },
];

const fallbackUsers = ["johnmorrisdotca"];
let smokeUsers = [...fallbackUsers];
let accessibleStudyUser: string | null = null;

const USER_ACCESS_GATE_TEXT = "You do not have access to that user page yet.";

/*
 * The study explorer's filters, addressed the way it actually builds them.
 *
 * These were written when each filter was a loose `button` labelled
 * "All Levels (143)" or "kanji (52)". They are now tabs inside four named
 * tablists, labelled without the spaces - "All(429)", "KANJI(108)". Every
 * assertion below went stale at once when that changed, and each one had to be
 * re-derived from the page rather than from the old string, so they live here
 * as one mapping instead of twenty literals.
 */
const levelFilters = (page: import("@playwright/test").Page) =>
  page.getByRole("tablist", { name: "Level filters" });
const groupingFilters = (page: import("@playwright/test").Page) =>
  page.getByRole("tablist", { name: "Grouping filters" });
const statusFilters = (page: import("@playwright/test").Page) =>
  page.getByRole("tablist", { name: "Status filters" });

/**
 * A filter tab by its label and count: "All (429)", "KANJI (108)", "guru (188)".
 *
 * The space is optional because the two ways of reading the tab disagree. Its
 * `textContent` is "All(429)" - label and count are adjacent spans with only a
 * CSS gap between them - while the accessible name Playwright matches on is
 * "All (429)", because the accessible-name algorithm joins the two spans with
 * one. Matching either keeps the same regex usable for both.
 */
const filterTab = (label: string) => new RegExp(`^${label}\\s*\\(\\d[\\d,]*\\)$`, "i");

/**
 * The count the explorer prints for what it is showing.
 *
 * Was "Showing 40 matching items · 431 total in queue"; reads
 * "SHOWING 431/431 ITEMS" now. Both numbers still mean the same two things, so
 * the tests comparing a chip count against the visible total still hold - they
 * just had to be pointed at the new shape.
 */
const QUEUE_SUMMARY = /SHOWING\s+([\d,]+)\s*\/\s*([\d,]+)\s+ITEMS/i;

/**
 * Wait for the study list itself, not just for the page to stop talking.
 *
 * The explorer renders its cards into a container it keeps hidden behind a
 * skeleton until the queue arrives, so the cards are in the DOM - and countable
 * - a good while before any of them can be seen or clicked. `networkidle` does
 * not cover it either, because the page keeps polling. Every card test that
 * looked flaky was really this: asserting against a list that was still
 * loading.
 */
async function studyCards(page: import("@playwright/test").Page) {
  /*
   * Addressed by the shared card's own class, not by
   * `data-explorer-card-subject-id`.
   *
   * Both surfaces render `UnifiedExplorerCard`, but only the library explorer
   * passes it a subject id to stamp on the element - the study explorer does
   * not, so on this page there are 431 cards a member can see and zero the old
   * selector could find. The forty it did find belong to a second, hidden
   * explorer panel, which is why the assertion failed as "exists but hidden"
   * rather than as "missing".
   */
  const cards = page.locator('[class*="group/explorer-card"]:visible');
  await expect(cards.first()).toBeVisible({ timeout: 30_000 });
  return cards;
}
const countIn = (text: string, pattern: RegExp, group = 1) =>
  Number((text.match(pattern)?.[group] ?? "0").replace(/,/g, ""));

function extractUsernames(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const candidateRows = (payload as { rows?: unknown; leaderboard?: unknown }).rows
    ?? (payload as { rows?: unknown; leaderboard?: unknown }).leaderboard
    ?? payload;

  if (!Array.isArray(candidateRows)) {
    return [];
  }

  const users: string[] = [];
  for (const row of candidateRows) {
    if (!row || typeof row !== "object") {
      continue;
    }

    const candidate = (row as { wkUsername?: unknown; username?: unknown; nickname?: unknown }).wkUsername
      ?? (row as { wkUsername?: unknown; username?: unknown; nickname?: unknown }).username
      ?? (row as { wkUsername?: unknown; username?: unknown; nickname?: unknown }).nickname;

    if (typeof candidate === "string" && candidate.trim().length > 0) {
      users.push(candidate.trim());
    }

    if (users.length >= 3) {
      break;
    }
  }

  return users;
}

async function assertPageLoads(
  browser: Browser,
  url: string,
  checks: (page: import("@playwright/test").Page) => Promise<void>,
): Promise<void> {
  /*
   * A context carrying the signed-in state, not a bare page.
   *
   * `browser.newPage()` builds its own context from scratch and ignores the
   * project's `storageState`, so every check routed through this helper - most
   * of the suite - browsed anonymously while the run reported itself as signed
   * in. The session cookie was minted correctly and then thrown away here,
   * which is why these tests failed against a UI that was rendering fine.
   */
  const context = await browser.newContext(
    fs.existsSync(STORAGE_STATE) ? { storageState: STORAGE_STATE } : {},
  );
  const page = await context.newPage();
  const badResponses: string[] = [];
  const pageErrors: string[] = [];

  page.on("response", (response) => {
    const status = response.status();
    if (status >= 500) {
      badResponses.push(`${status} ${response.url()}`);
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(String(error));
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {
    // Some pages keep lightweight polling alive; proceed with assertions.
  });

  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  await expect(page.getByText("Internal Server Error")).toHaveCount(0);

  await checks(page);

  expect(pageErrors, `page errors for ${url}`).toEqual([]);
  expect(badResponses, `500+ responses for ${url}`).toEqual([]);

  await context.close();
}

test.beforeAll(async ({ request }) => {
  const response = await request.get("/api/leaderboard");
  if (!response.ok()) {
    return;
  }

  const payload = (await response.json()) as unknown;
  const extracted = extractUsernames(payload);
  if (extracted.length > 0) {
    smokeUsers = extracted;
  }

  for (const user of smokeUsers) {
    const probe = await request.get(`/users/${encodeURIComponent(user)}/study?mode=review`);
    if (!probe.ok()) {
      continue;
    }

    const html = await probe.text();
    if (!html.includes(USER_ACCESS_GATE_TEXT)) {
      accessibleStudyUser = user;
      break;
    }
  }
});

test("home page loads", async ({ browser, baseURL }) => {
  const url = `${baseURL}/`;
  await assertPageLoads(browser, url, async (page) => {
    await expect(page.locator("body")).toContainText("UmaKuma");
  });
});

test("a shared kanji page lists the words it appears in", async ({ browser, baseURL }) => {
  /*
   * The page every search result lands on. It used to know less about 水 than
   * the study viewer behind the sign-in wall - no compounds, no radicals - so
   * the check is for the depth, not only that it loads: the JLPT table holds
   * twelve words for 水, and the first of them should be on the page.
   */
  const url = `${baseURL}/kanji/${encodeURIComponent("水")}`;
  await assertPageLoads(browser, url, async (page) => {
    await expect(page.getByRole("heading", { name: "Used in words", exact: true })).toBeVisible();
    /* The kanji inside a compound link to their own pages; the word does not. */
    const chip = page.locator('a[href^="/kanji/"]').first();
    await expect(chip).toBeVisible();
  });
});

test("one part of a kanji page opens at its own address", async ({ browser, baseURL }) => {
  /*
   * The reason the address exists: sending somebody the compounds of 水
   * without the rest of the page. The section is there, the stroke order is
   * not, and the other parts this character has are one link away.
   */
  const url = `${baseURL}/kanji/${encodeURIComponent("\u6c34")}/words`;
  await assertPageLoads(browser, url, async (page) => {
    await expect(page.getByRole("heading", { name: "Used in words", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Replay" })).toHaveCount(0);

    await page.getByRole("link", { name: "Stroke order", exact: true }).click();
    await expect(page).toHaveURL(/\/kanji\/.+\/stroke$/);
    await expect(page.getByRole("button", { name: "Show one stroke" })).toBeVisible();
  });
});

test("a segment that names no part of a character is not a page", async ({ browser, baseURL }) => {
  /* A broken link that renders something looks like a working one. */
  const context = await browser.newContext();
  const page = await context.newPage();
  const response = await page.goto(`${baseURL}/kanji/${encodeURIComponent("\u6c34")}/nonsense`);
  expect(response?.status()).toBe(404);
  await context.close();
});

test("the sources page lists every source and opens one", async ({ browser, baseURL }) => {
  /* Every credit on the site leads here first; the page must answer for all of them. */
  await assertPageLoads(browser, `${baseURL}/sources`, async (page) => {
    await expect(page.getByRole("navigation", { name: "Sources" })).toBeVisible();
    await page.getByRole("link", { name: "KanjiVG", exact: true }).first().click();
    await expect(page).toHaveURL(/\/sources\/kanjivg$/);
    await expect(page.getByRole("heading", { level: 1, name: "KanjiVG" })).toBeVisible();
  });
});

test("news reader page loads", async ({ browser, baseURL }) => {
  const url = `${baseURL}/news`;
  await assertPageLoads(browser, url, async (page) => {
    /*
     * "News moved to user dashboards" was the notice shown while the move was
     * happening. The move is done: /news resolves to the reader's own news
     * page, so the check is that it lands somewhere real rather than that it
     * still apologises for itself.
     */
    await expect(page).toHaveURL(/\/news/);
    await expect(page.getByRole("heading", { name: "News", exact: true })).toBeVisible();
  });
});

test("user drilldown tabs load", async ({ browser, baseURL }) => {
  /*
   * Three users times three explorers is nine full page loads, each in its own
   * context. That fitted the default timeout only while the pages were
   * redirecting straight to the access gate; now that they render, it does not.
   */
  test.setTimeout(180_000);

  for (const user of smokeUsers) {
    for (const tab of tabs) {
      /* Each explorer is its own route now; `tab.path` is that route. */
      const url = `${baseURL}/users/${encodeURIComponent(user)}/${tab.path}#explorer`;
      await assertPageLoads(browser, url, async (page) => {
        if (page.url().includes("/join?access=denied")) {
          await expect(page.getByText(USER_ACCESS_GATE_TEXT)).toBeVisible();
          return;
        }

        await expect(page.locator("h1")).toContainText(/.+/);
        const accessGate = page.getByText(USER_ACCESS_GATE_TEXT);
        if ((await accessGate.count()) > 0) {
          await expect(accessGate).toBeVisible();
          return;
        }

        /*
         * There is no "Explorer tabs" tablist any more: ?tab=study, ?tab=level
         * and ?tab=jlpt each redirect to a route of their own. The behaviour
         * worth protecting is unchanged - the old query still reaches the
         * right explorer - so that is what is asserted, and a broken redirect
         * now fails here rather than silently landing on the dashboard.
         */
        await expect(page).toHaveURL(new RegExp(`/${tab.path}(\\?|#|$)`));
        await expect(page.locator("h1")).toContainText(tab.heading);
      });
    }
  }
});

test("user history page loads", async ({ browser, baseURL }) => {
  const user = smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/study/history`;

  await assertPageLoads(browser, url, async (page) => {
    if (page.url().includes("/join?access=denied")) {
      await expect(page.getByText(USER_ACCESS_GATE_TEXT)).toBeVisible();
      return;
    }

    /*
     * The back link went when every page gained the shared top menu, and the
     * page is headed "History" rather than "Study Submission History". What it
     * is here to prove is unchanged: the history route renders its own page
     * with attempts on it, and is reachable from the nav.
     */
    await expect(page.getByRole("heading", { name: "History", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Study attempts" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Study", exact: true }).first()).toBeVisible();
  });
});

test("user read history tab loads", async ({ browser, baseURL }) => {
  const user = smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/read?read=history`;

  await assertPageLoads(browser, url, async (page) => {
    if (page.url().includes("/join?access=denied")) {
      await expect(page.getByText(USER_ACCESS_GATE_TEXT)).toBeVisible();
      return;
    }

    /*
     * The read surface is two panels switched by buttons now, not a tablist,
     * and there is no History panel among them - reading history lives on the
     * news pages. The route still has to render both panels it does have.
     */
    await expect(page.getByRole("heading", { name: "Read", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Challenge", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Check-ins", exact: true })).toBeVisible();
  });
});

test("read check-ins campaign selector switches campaign fetch", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for read check-in campaign checks in this environment.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/read`;

  await assertPageLoads(browser, url, async (page) => {
    const accessGate = page.getByText(USER_ACCESS_GATE_TEXT);
    if ((await accessGate.count()) > 0) {
      await expect(accessGate).toBeVisible();
      return;
    }

    /*
     * Check-ins is no longer the panel the page opens on, so the selector this
     * test is about is not on screen until it is asked for.
     */
    await page.getByRole("button", { name: "Check-ins", exact: true }).click();

    const campaignSelect = page.locator("label:has-text('Campaign') select").first();
    await expect(campaignSelect).toBeVisible();

    const optionCount = await campaignSelect.locator("option").count();
    if (optionCount <= 1) {
      return;
    }

    const currentValue = await campaignSelect.inputValue();
    const nextValue = await campaignSelect.locator("option").nth(1).getAttribute("value");
    if (!nextValue || nextValue === currentValue) {
      return;
    }

    const responsePromise = page.waitForResponse((response) => {
      if (!response.url().includes("/api/reading-signoffs?")) {
        return false;
      }

      const params = new URL(response.url()).searchParams;
      return params.get("challengeId") === nextValue;
    });

    await campaignSelect.selectOption(nextValue);
    await responsePromise;
    await expect(campaignSelect).toHaveValue(nextValue);
  });
});

test("study keeps all type filter on reload", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for study filter checks in this environment.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/study?srs=all&jlpt=all&review=all&sticky=0&recent=0#explorer`;

  await assertPageLoads(browser, url, async (page) => {
    const allLevels = levelFilters(page).getByRole("tab", { name: filterTab("All") });
    await expect(allLevels).toBeVisible();

    await allLevels.click();
    await expect.poll(() => new URL(page.url()).searchParams.get("type")).not.toBe("radical");
    await page.waitForTimeout(150);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {
      // Some pages keep lightweight polling alive; proceed with assertions.
    });

    const typeFilter = new URL(page.url()).searchParams.get("type");
    expect(typeFilter, "type filter should stay all/empty after reload").not.toBe("radical");
  });
});

test("study keeps explicit level and vocab type on reload", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for study filter checks in this environment.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/study#explorer`;

  /*
   * Chosen by clicking, not by arriving with the filter in the address.
   *
   * The old version pinned `level=10&type=vocabulary` in the URL and asserted
   * both came back. It went stale the moment the param was renamed to `levels`
   * - and it failed silently in the sense that mattered: the page was fine, the
   * test was describing a query string the app had stopped using. Driving the
   * controls tests the behaviour that is actually promised - a filter you pick
   * survives a reload - without asserting the spelling of the query, which is
   * the app's business and has changed twice.
   */
  await assertPageLoads(browser, url, async (page) => {
    const vocabTab = groupingFilters(page).getByRole("tab", { name: filterTab("VOCAB") });
    await expect(vocabTab).toBeVisible();
    await vocabTab.click();
    await expect(vocabTab).toHaveClass(/bg-vocabulary/);

    const chosenLevel = levelFilters(page)
      .getByRole("tab", { name: /^\d+\s*\(\d[\d,]*\)$/ })
      .last();
    await expect(chosenLevel).toBeVisible();
    /*
     * Just the number, not the whole label. The count beside it is
     * filter-aware, so "17 (16)" becomes "17 (4)" the moment a type is chosen
     * as well - matching the label whole would assert the count had not moved,
     * which is the opposite of what this page promises.
     */
    const levelLabel = (((await chosenLevel.textContent()) ?? "").match(/^\d+/) ?? [""])[0];
    await chosenLevel.click();
    await expect(chosenLevel).toHaveClass(/bg-accent/);

    const before = page.url();

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {
      // Some pages keep lightweight polling alive; proceed with assertions.
    });

    expect(page.url(), "the address should survive a reload unchanged").toBe(before);

    /* And the controls should still show the same thing chosen. */
    await expect(groupingFilters(page).getByRole("tab", { name: filterTab("VOCAB") })).toHaveClass(
      /bg-vocabulary/,
    );
    await expect(
      levelFilters(page).getByRole("tab", { name: filterTab(levelLabel) }),
    ).toHaveClass(/bg-accent/);
  });
});

test("study keeps srs stage filter on reload", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for study filter checks in this environment.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/study#explorer`;

  await assertPageLoads(browser, url, async (page) => {
    const guruTab = statusFilters(page).getByRole("tab", { name: filterTab("guru") });
    await expect(guruTab).toBeVisible();
    await guruTab.click();
    /*
     * `aria-selected`, not a class. Each status carries its own colour - guru
     * is violet, master is its own - so there is no one class that means
     * "chosen" across the row, and asserting `bg-accent` only ever passed for
     * whichever status happened to use the accent.
     */
    await expect(guruTab).toHaveAttribute("aria-selected", "true");

    /*
     * The stage tabs are the point of this test: choosing a status reveals the
     * numbered stages inside it, and one of those has to survive a reload too.
     */
    const stageTab = statusFilters(page)
      .getByRole("tab", { name: /^\d+\s*\(\d[\d,]*\)$/ })
      .first();
    await expect(stageTab).toBeVisible();
    const stageLabel = (((await stageTab.textContent()) ?? "").match(/^\d+/) ?? [""])[0];
    await stageTab.click();
    await expect(stageTab).toHaveAttribute("aria-selected", "true");

    const before = page.url();

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {
      // Some pages keep lightweight polling alive; proceed with assertions.
    });

    expect(page.url(), "status and stage should survive a reload").toBe(before);
    await expect(statusFilters(page).getByRole("tab", { name: filterTab("guru") })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      statusFilters(page).getByRole("tab", { name: filterTab(stageLabel) }),
    ).toHaveAttribute("aria-selected", "true");
  });
});

test("study keeps srsStage on fresh reload for full query shape", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for study filter checks in this environment.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/study?mode=review`;

  /*
   * The point of this one is that a reload is not a reset - the explorer
   * rewrites the address on first load, and that rewritten address has to be
   * stable. It used to assert particular parameter names, which is how it went
   * stale: `level` became `levels`, `recent` went away, and the test failed
   * while the behaviour it was guarding still worked.
   */
  await assertPageLoads(browser, url, async (page) => {
    await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {});
    const settled = page.url();

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {
      // Some pages keep lightweight polling alive; proceed with assertions.
    });

    expect(page.url(), "a reload should not change the settled address").toBe(settled);

    /* And the mode it was asked for is still the mode it is in. */
    expect(new URL(page.url()).searchParams.get("mode")).toBe("review");
  });
});

test("study review all-level type count matches total queue", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for study filter checks in this environment.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/study?mode=review&srs=all&type=all&recent=0#explorer`;

  await assertPageLoads(browser, url, async (page) => {
    const summary = page.getByText(QUEUE_SUMMARY).first();
    await expect(summary).toBeVisible();

    /* "SHOWING 431/431 ITEMS" - the second number is the whole queue. */
    const summaryText = (await summary.textContent()) ?? "";
    const totalInQueue = countIn(summaryText, QUEUE_SUMMARY, 2);
    expect(totalInQueue, "total in queue value should be present").toBeGreaterThan(0);

    const allTypeButton = groupingFilters(page).getByRole("tab", { name: filterTab("All") });
    await expect(allTypeButton).toBeVisible();
    const allTypeCount = countIn((await allTypeButton.textContent()) ?? "", /\(([\d,]+)\)/);
    expect(allTypeCount, "all type count should be present").toBeGreaterThan(0);

    expect(allTypeCount, "default review all-type count should match total queue count").toBe(totalInQueue);
  });
});

[
  { label: "Radical", tabLabel: "RADICAL" },
  { label: "Kanji", tabLabel: "KANJI" },
  { label: "Vocab", tabLabel: "VOCAB" },
].forEach(({ label, tabLabel }) => {
  test(`study ${label.toLowerCase()} chip count matches matching items when selected`, async ({ browser, baseURL }) => {
    test.skip(!accessibleStudyUser, `No accessible user page for study ${label.toLowerCase()} count checks in this environment.`);
    const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
    const url = `${baseURL}/users/${encodeURIComponent(user)}/study?mode=review&srs=all&type=all&recent=0#explorer`;

    await assertPageLoads(browser, url, async (page) => {
      const accessGate = page.getByText(USER_ACCESS_GATE_TEXT);
      if ((await accessGate.count()) > 0) {
        await expect(accessGate).toBeVisible();
        return;
      }

      const typeButton = groupingFilters(page).getByRole("tab", { name: filterTab(tabLabel) });
      await expect(typeButton).toBeVisible();
      await typeButton.click();

      /*
       * Read the count back off the tab after selecting it, not before: the
       * counts are filter-aware, so choosing a type can change what the tab
       * itself claims.
       */
      await expect.poll(async () => new URL(page.url()).searchParams.get("type")).toBeTruthy();
      const selectedTypeCount = countIn((await typeButton.textContent()) ?? "", /\(([\d,]+)\)/);

      const summary = page.getByText(QUEUE_SUMMARY).first();
      await expect(summary).toBeVisible();
      const summaryText = (await summary.textContent()) ?? "";
      const matchingCount = countIn(summaryText, QUEUE_SUMMARY, 1);

      expect(matchingCount, `selected ${label} chip count should equal visible matching-item count`).toBe(selectedTypeCount);
    });
  });
});

/*
 * Removed: "study review keeps recent and hide-locked toggles on reload".
 *
 * It clicked a "Hide Locked" and a "Recent Only" button and checked the pair
 * survived a reload. Neither control exists any more - `STUDY_EXPLORER_COPY`
 * still carries a `recentOnly` string but no JSX reads it, and nothing on the
 * study explorer renders either toggle. `hideLocked` still rides along in the
 * address, so the state outlived its controls.
 *
 * Deleted rather than re-pointed at something else, because there is nothing
 * left for it to protect. Re-add it with the toggles if they come back.
 */
test("study lesson mode hides review-only filters", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for study filter checks in this environment.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/study?mode=review&srs=all&type=all#explorer`;

  await assertPageLoads(browser, url, async (page) => {
    const lessonModeButton = page.getByRole("tab", { name: /^Lessons\s+\((\d+|\.\.\.)\)$/i });
    await expect(lessonModeButton).toBeVisible();
    await lessonModeButton.click();

    await expect.poll(() => new URL(page.url()).searchParams.get("mode")).toBe("lesson");
    await expect(lessonModeButton).toHaveAttribute("aria-selected", "true");

    await expect(page.getByRole("button", { name: /^All SRS Stages$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Recent Only$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^(Hide|Show) Locked$/i })).toHaveCount(0);
  });
});

test("level explorer keeps total count while visible list is paged", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for level explorer checks in this environment.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/library-explorer#explorer`;

  await assertPageLoads(browser, url, async (page) => {
    const accessGate = page.getByText(USER_ACCESS_GATE_TEXT);
    if ((await accessGate.count()) > 0) {
      await expect(accessGate).toBeVisible();
      return;
    }

    const VISIBLE_OF_TOTAL = /Showing\s+([\d,]+)\s+of\s+([\d,]+)\s+items/i;
    const summary = page.getByText(VISIBLE_OF_TOTAL).first();
    await expect(summary).toBeVisible();

    const readSummary = async () => (await summary.textContent()) ?? "";

    /*
     * The all-levels count is global; the list is scoped to whichever level is
     * selected. The explorer opens on the member's own level, so on arrival
     * the count only bounds the list.
     */
    const allLevelsButton = levelFilters(page).getByRole("tab", { name: filterTab("All") });
    await expect(allLevelsButton).toBeVisible();
    const allLevelsCount = countIn((await allLevelsButton.textContent()) ?? "", /\(([\d,]+)\)/);

    const summaryText = await readSummary();
    const visibleCount = countIn(summaryText, VISIBLE_OF_TOTAL, 1);
    const filteredCount = countIn(summaryText, VISIBLE_OF_TOTAL, 2);

    expect(allLevelsCount, "the all-levels count should be global, not the filtered list")
      .toBeGreaterThanOrEqual(filteredCount);
    expect(filteredCount, "the filtered total should be a real count").toBeGreaterThan(0);
    expect(visibleCount, "visible level items should never exceed filtered total").toBeLessThanOrEqual(filteredCount);

    /*
     * And choosing All has to actually reach every level.
     *
     * This is backlog item 39: the tab used to reselect the member's own level,
     * so the address kept `levels=17`, the same list stayed on screen, and the
     * count described a view nothing could open.
     *
     * Asserted on the address and on the list growing, not on the final total.
     * Levels are fetched a few at a time and a cold one goes to WaniKani, so
     * arriving at the full 2,922 takes longer than a smoke test should sit
     * there - but the selection is written synchronously, which is the part
     * that was broken.
     */
    await allLevelsButton.click();

    await expect
      .poll(() => new URL(page.url()).searchParams.get("levels")?.split(",").length ?? 0, {
        message: "choosing All should put every level in the address",
      })
      .toBeGreaterThan(1);

    await expect
      .poll(async () => countIn(await readSummary(), VISIBLE_OF_TOTAL, 2), {
        message: "choosing All should widen the list past the single opening level",
      })
      .toBeGreaterThan(filteredCount);
  });
});

test("jlpt explorer keeps global counts with partial visible data", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for JLPT explorer checks in this environment.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  /* Its own route since the explorers were split apart; no tab to click. */
  const url = `${baseURL}/users/${encodeURIComponent(user)}/jlpt-explorer`;

  await assertPageLoads(browser, url, async (page) => {
    const accessGate = page.getByText(USER_ACCESS_GATE_TEXT);
    if ((await accessGate.count()) > 0) {
      await expect(accessGate).toBeVisible();
      return;
    }

    const jlptLevels = page.getByRole("tablist", { name: "JLPT level filters" });
    await expect(jlptLevels).toBeVisible();

    const RESULTS = /Showing\s+([\d,]+)\s+of\s+([\d,]+)\s+results/i;
    const summary = page.getByText(RESULTS).first();
    await expect(summary).toBeVisible();
    const readResults = async () => (await summary.textContent()) ?? "";

    /* The JLPT filters are buttons inside their tablist, not tabs. */
    const allJlptButton = jlptLevels.getByRole("button", { name: filterTab("All") });
    await expect(allJlptButton).toBeVisible();
    const allJlptCount = countIn((await allJlptButton.textContent()) ?? "", /\(([\d,]+)\)/);

    const n5Button = jlptLevels.getByRole("button", { name: filterTab("N5") });
    await expect(n5Button).toBeVisible();
    const n5Count = countIn((await n5Button.textContent()) ?? "", /\(([\d,]+)\)/);

    const resultsText = await readResults();
    const visibleCount = countIn(resultsText, RESULTS, 1);
    const filteredCount = countIn(resultsText, RESULTS, 2);

    /*
     * Global counts beside a narrowed list is the point of this page: the
     * chips say how much exists, the list shows what was asked for. So the
     * chip count bounds the list rather than equalling it.
     */
    expect(allJlptCount, "the JLPT all chip should count the whole catalogue")
      .toBeGreaterThanOrEqual(filteredCount);
    expect(visibleCount, "visible JLPT cards should never exceed filtered total").toBeLessThanOrEqual(filteredCount);
    expect(n5Count, "N5 chip count should be global and non-zero").toBeGreaterThan(0);

    /*
     * Choosing N5 narrows the list. It does not change the address: the JLPT
     * explorer keeps its filter state entirely in the component, so there is
     * no link that opens "N5" for somebody else - which is the linking problem
     * behind backlog item 35. Assert the narrowing, which is what works, and
     * leave the URL to that item.
     */
    await n5Button.click();
    await expect
      .poll(async () => countIn(await readResults(), RESULTS, 2), { timeout: 15_000 })
      .toBeLessThan(filteredCount);
  });
});

test("study keeps disabled level ranges grouped after toggling Kanji", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for study regrouping checks in this environment.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/study?mode=review&type=all&srs=all#explorer`;

  await assertPageLoads(browser, url, async (page) => {
    const accessGate = page.getByText(USER_ACCESS_GATE_TEXT);
    if ((await accessGate.count()) > 0) {
      await expect(accessGate).toBeVisible();
      return;
    }

    const kanjiButton = groupingFilters(page).getByRole("tab", { name: filterTab("KANJI") });
    await expect(kanjiButton).toBeVisible();

    await kanjiButton.click();
    await kanjiButton.click();

    /*
     * Ranges lost their "L" when the chips became tabs: "L1-L7" is "1-7". They
     * are still how the row keeps its length manageable when whole stretches
     * of levels have nothing in them, which is what this is here to protect.
     */
    const groupedLevels = levelFilters(page).getByRole("tab", { name: /^\d+-\d+(\s*\([\d,]+\))?$/ });
    await expect(groupedLevels.first()).toBeVisible();
  });
});

test("study pagination loads more on scroll reach", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for study pagination checks in this environment.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/study?mode=review&type=all&srs=all#explorer`;

  await assertPageLoads(browser, url, async (page) => {
    const accessGate = page.getByText(USER_ACCESS_GATE_TEXT);
    if ((await accessGate.count()) > 0) {
      await expect(accessGate).toBeVisible();
      return;
    }

    const summary = page.getByText(QUEUE_SUMMARY).first();
    await expect(summary).toBeVisible();

    const beforeText = (await summary.textContent()) ?? "";
    const beforeShown = countIn(beforeText, QUEUE_SUMMARY, 1);
    const total = countIn(beforeText, QUEUE_SUMMARY, 2);
    if (beforeShown >= total) {
      return;
    }

    const sentinel = page
      .locator("div")
      .filter({ hasText: /Scroll to load more|Loading more/i })
      .first();
    await expect(sentinel).toBeVisible();
    await sentinel.scrollIntoViewIfNeeded();

    await expect.poll(async () => {
      const text = (await summary.textContent()) ?? "";
      const match = text.match(/Showing\s+(\d+)\s+matching items\s+·\s+(\d+)\s+total in queue/i);
      return Number(match?.[1] ?? "0");
    }).toBeGreaterThan(beforeShown);
  });
});

test("study does not keep zero-count status selected", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for study zero-status checks in this environment.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/study?mode=review&level=14&type=kanji&srs=master#explorer`;

  await assertPageLoads(browser, url, async (page) => {
    const accessGate = page.getByText(USER_ACCESS_GATE_TEXT);
    if ((await accessGate.count()) > 0) {
      await expect(accessGate).toBeVisible();
      return;
    }

    await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {
      // Some pages keep lightweight polling alive; proceed with assertions.
    });

    const selectedZeroStatus = page.locator("button.bg-accent").filter({
      hasText: /^(APPR|GURU|MASTER|ENLIGHTENED|BURNED|LOCKED)\s*\(0\)$/i,
    });
    await expect(selectedZeroStatus).toHaveCount(0);
  });
});

test("study does not keep zero-count level selected for active type", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for study zero-level checks in this environment.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/study?mode=review&level=9&type=kanji&srs=all#explorer`;

  await assertPageLoads(browser, url, async (page) => {
    const accessGate = page.getByText(USER_ACCESS_GATE_TEXT);
    if ((await accessGate.count()) > 0) {
      await expect(accessGate).toBeVisible();
      return;
    }

    await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {
      // Some pages keep lightweight polling alive; proceed with assertions.
    });

    const selectedZeroLevel = page.locator("button.bg-accent").filter({ hasText: /^L\d+\s*\(0\)$/i });
    await expect(selectedZeroLevel).toHaveCount(0);
  });
});

test("study selected level still groups unavailable ranges", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for selected-level grouping checks in this environment.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/study?mode=review&level=10&type=all&srs=all#explorer`;

  await assertPageLoads(browser, url, async (page) => {
    const accessGate = page.getByText(USER_ACCESS_GATE_TEXT);
    if ((await accessGate.count()) > 0) {
      await expect(accessGate).toBeVisible();
      return;
    }

    await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {
      // Some pages keep lightweight polling alive; proceed with assertions.
    });

    const selectedLevel = levelFilters(page).getByRole("tab", { selected: true }).first();
    await expect(selectedLevel).toBeVisible();

    /*
     * Ranges lost their "L" when the chips became tabs: "L1-L7" is "1-7". They
     * are still how the row keeps its length manageable when whole stretches
     * of levels have nothing in them, which is what this is here to protect.
     */
    const groupedLevels = levelFilters(page).getByRole("tab", { name: /^\d+-\d+(\s*\([\d,]+\))?$/ });
    await expect(groupedLevels.first()).toBeVisible();
  });
});

test("study clicking high level chip stays on that level", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for high-level click checks in this environment.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/study?mode=review&type=all&srs=all#explorer`;

  await assertPageLoads(browser, url, async (page) => {
    const accessGate = page.getByText(USER_ACCESS_GATE_TEXT);
    if ((await accessGate.count()) > 0) {
      await expect(accessGate).toBeVisible();
      return;
    }

    /* The highest level tab that carries a count - "17 (40)" rather than "L17". */
    const highestLevel = levelFilters(page).getByRole("tab", { name: /^\d+\s*\([\d,]+\)$/ }).last();
    await expect(highestLevel).toBeVisible();
    const levelNumber = (((await highestLevel.textContent()) ?? "").match(/^\d+/) ?? [""])[0];
    await highestLevel.click();

    /*
     * Asserted on the tab rather than on a query param: the param has been
     * `level` and is now `levels`, and what a member cares about is that the
     * level they clicked is the one that stays chosen.
     */
    await expect(
      levelFilters(page).getByRole("tab", { name: filterTab(levelNumber) }),
    ).toHaveAttribute("aria-selected", "true");
  });
});

test("study first-load groups zero levels for narrowed review filters", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for first-load level grouping checks in this environment.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/study?mode=review&type=all&srs=master&srsStage=8#explorer`;

  await assertPageLoads(browser, url, async (page) => {
    const accessGate = page.getByText(USER_ACCESS_GATE_TEXT);
    if ((await accessGate.count()) > 0) {
      await expect(accessGate).toBeVisible();
      return;
    }

    await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {
      // Some pages keep lightweight polling alive; proceed with assertions.
    });

    /*
     * Ranges lost their "L" when the chips became tabs: "L1-L7" is "1-7". They
     * are still how the row keeps its length manageable when whole stretches
     * of levels have nothing in them, which is what this is here to protect.
     */
    const groupedLevels = levelFilters(page).getByRole("tab", { name: /^\d+-\d+(\s*\([\d,]+\))?$/ });
    await expect(groupedLevels.first()).toBeVisible();
  });
});

test("study desktop card click opens modal and shows item data", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for desktop click/view checks in this environment.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/study?mode=review&type=all&srs=all#explorer`;

  await assertPageLoads(browser, url, async (page) => {
    const accessGate = page.getByText(USER_ACCESS_GATE_TEXT);
    if ((await accessGate.count()) > 0) {
      await expect(accessGate).toBeVisible();
      return;
    }

    const firstCard = (await studyCards(page)).first();

    const glyphHitbox = firstCard.locator("[data-explorer-glyph-hitbox='true']").first();
    await expect(glyphHitbox).toBeVisible();
    await glyphHitbox.click();

    const studyModal = page.locator("div.fixed.inset-0.z-50").first();
    await expect(studyModal).toBeVisible();
    await expect(studyModal.getByRole("button", { name: "Close", exact: true })).toBeVisible();
    await expect(studyModal.getByText(/Show answer|Primary reading/i).first()).toBeVisible();
  });
});

test("study mode menu exposes and persists all review modes", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for study mode checks in this environment.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/study?mode=review&studyMode=session#explorer`;

  await assertPageLoads(browser, url, async (page) => {
    const modeButton = page.getByRole("button", { name: "MODE", exact: true });
    await expect(modeButton).toBeVisible();
    await modeButton.click();

    for (const label of ["Session", "Quick", "Side-by-Side", "Game"]) {
      /*
       * Not exact: each entry now carries its one-line explanation in the same
       * element, so the accessible name reads "SessionReview visible items in
       * one session". The label is still the start of it.
       */
      await expect(page.getByRole("menuitemradio", { name: new RegExp(`^${label}`) })).toBeVisible();
    }
    await expect(page.getByRole("menuitemradio", { name: "OFF", exact: true })).toHaveCount(0);

    await page.getByRole("menuitemradio", { name: /^Side-by-Side/ }).click();
    /*
     * One parameter became two: `studyMode` is now the on/off switch and
     * `studyModeBehavior` carries which mode it is.
     */
    await expect(page).toHaveURL(/studyModeBehavior=side-by-side/);
    await page.reload({ waitUntil: "domcontentloaded" });
    await modeButton.click();
    await expect(page.getByRole("menuitemradio", { name: /^Side-by-Side/ })).toHaveAttribute("aria-checked", "true");
  });
});

test("study mobile trouble/favorite clicks do not open modal and card tap still opens", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for mobile click/view checks in this environment.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/study?mode=review&type=all&srs=all#explorer`;

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const badResponses: string[] = [];
  const pageErrors: string[] = [];

  page.on("response", (response) => {
    if (response.status() >= 500) {
      badResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(String(error));
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {
    // Some pages keep lightweight polling alive; proceed with assertions.
  });

  const accessGate = page.getByText(USER_ACCESS_GATE_TEXT);
  if ((await accessGate.count()) > 0) {
    await expect(accessGate).toBeVisible();
    await context.close();
    return;
  }

  const firstCard = (await studyCards(page)).first();

  const troubleButton = firstCard.getByRole("button", { name: STUDY_PANEL_TEXT.toggleTrouble, exact: true }).first();
  await expect(troubleButton).toBeVisible();
  await troubleButton.click();
  await expect(page.locator("div.fixed.inset-0.z-50")).toHaveCount(0);

  const favoriteButton = firstCard.getByRole("button", { name: STUDY_PANEL_TEXT.toggleFavorite, exact: true }).first();
  await expect(favoriteButton).toBeVisible();
  await favoriteButton.click();
  await expect(page.locator("div.fixed.inset-0.z-50")).toHaveCount(0);

  const glyphHitbox = firstCard.locator("[data-explorer-glyph-hitbox='true']").first();
  await expect(glyphHitbox).toBeVisible();
  await glyphHitbox.click();

  const studyModal = page.locator("div.fixed.inset-0.z-50").first();
  await expect(studyModal).toBeVisible();
  await expect(studyModal.getByRole("button", { name: "Close", exact: true })).toBeVisible();
  await expect(studyModal.getByText(/Show answer|Primary reading/i).first()).toBeVisible();

  expect(pageErrors, "mobile study click flow page errors").toEqual([]);
  expect(badResponses, "mobile study click flow 500+ responses").toEqual([]);
  await context.close();
});


/**
 * Saved lists is a route, so it gets a route check.
 *
 * Deliberately does not save anything: a smoke run against production must not
 * write to a member's account. It checks the page renders, is reachable from
 * the Explore nav, and distinguishes "no lists yet" from "failed to load" -
 * which is the failure mode that would otherwise look like an empty page.
 */
test("saved lists page renders and is reachable from the nav", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for the saved lists check.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/lists`;

  await assertPageLoads(browser, url, async (page) => {
    const accessGate = page.getByText(USER_ACCESS_GATE_TEXT);
    if ((await accessGate.count()) > 0) {
      await expect(accessGate).toBeVisible();
      return;
    }

    /*
     * From the copy module, not typed out here. The heading was "Saved lists"
     * when this was written and is "Your lists" now, because Trouble and
     * Favourites joined the page - and nothing noticed, because a smoke run is
     * not part of `quality:check`. A stale assertion in a suite nobody runs on
     * every commit is worse than no assertion: it reports a real regression and
     * a rewording identically.
     */
    await expect(page.getByRole("heading", { name: STUDY_LIST_COPY.heading })).toBeVisible();

    /*
     * Either some cards or the empty state - never neither, which is exactly
     * what a failed load looks like from outside. Trouble and Favourites are
     * always rendered, so in practice the cards branch is the live one.
     */
    if ((await page.locator("ul li h2").count()) === 0) {
      await expect(page.getByText(STUDY_LIST_COPY.empty, { exact: false })).toBeVisible();
    }

    await expect(page.getByRole("link", { name: "Lists", exact: true }).first()).toBeVisible();
  });
});

test("wanikani connection page renders for a member", async ({ browser, baseURL }) => {
  test.skip(!accessibleStudyUser, "No accessible user page for the connection check.");
  const user = accessibleStudyUser ?? smokeUsers[0] ?? fallbackUsers[0];
  const url = `${baseURL}/users/${encodeURIComponent(user)}/wanikani`;

  await assertPageLoads(browser, url, async (page) => {
    const accessGate = page.getByText(USER_ACCESS_GATE_TEXT);
    if ((await accessGate.count()) > 0) {
      await expect(accessGate).toBeVisible();
      return;
    }

    /*
     * The page has two states, and which one the smoke user is in is not this
     * suite's to decide: whoever tops the leaderboard is connected, a run
     * against a fresh local database is not. Assert whichever branch rendered,
     * and the section both states share.
     */
    const connected = await page.getByRole("heading", { name: CONNECT_COPY.connectedHeading }).count();
    if (connected > 0) {
      await expect(page.getByRole("button", { name: CONNECT_COPY.replace })).toBeVisible();
    } else {
      await expect(page.getByRole("heading", { name: CONNECT_COPY.heading })).toBeVisible();
      await expect(page.getByLabel(CONNECT_COPY.tokenLabel)).toBeVisible();
      await expect(page.getByRole("link", { name: CONNECT_COPY.stepsAction })).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: CONNECT_COPY.keepsHeading })).toBeVisible();
  });
});

/*
 * A region - Tohoku, the Prairies - has an address of its own, under an
 * explicit word because Japan has a region and a prefecture both called
 * Hokkaido. Opening one lights it and frames the map on it; a province named
 * under a region it is not in is a wrong claim about the map and does not open.
 */
test("a map region opens at its own address, lit", async ({ browser, baseURL }) => {
  await assertPageLoads(browser, `${baseURL}/maps/canada/region/west-coast`, async (page) => {
    await expect(page.getByRole("heading", { name: "Maps" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "West Coast", pressed: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open West Coast" })).toBeVisible();
  });
});

test("a province chosen inside a region keeps the region in its address", async ({ browser, baseURL }) => {
  await assertPageLoads(browser, `${baseURL}/maps/japan/region/tohoku/aomori`, async (page) => {
    await expect(page.getByRole("heading", { name: /Aomori/ }).first()).toBeVisible();
    await expect(page).toHaveURL(/\/maps\/japan\/region\/tohoku\/aomori$/);
  });
});

test("a province named under the wrong region is a 404", async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const response = await page.goto(`${baseURL}/maps/canada/region/prairies/ontario`);
  expect(response?.status()).toBe(404);
  await context.close();
});

/*
 * The XP board is the first one the whole family can appear on: it ranks
 * `Account.xp`, which everybody starts earning on their first day, rather than
 * WaniKani numbers, which a member without a connected account has none of. It
 * has to answer for a signed-out visitor too - `listableTo` decides who is
 * listed, and an empty board is a state, not a failure.
 */
test("the XP board loads and names its own ranking", async ({ browser, baseURL }) => {
  await assertPageLoads(browser, `${baseURL}/xp`, async (page) => {
    await expect(page.getByRole("heading", { name: XP_BOARD_COPY.title })).toBeVisible();
    await expect(page.getByText(XP_BOARD_COPY.blurb)).toBeVisible();
  });
});

/* A member's own XP history: owner-only, the way Study history is. */
test("the member XP history page loads", async ({ browser, baseURL }) => {
  const user = smokeUsers[0] ?? fallbackUsers[0];

  await assertPageLoads(browser, `${baseURL}/users/${encodeURIComponent(user)}/xp`, async (page) => {
    if (page.url().includes("/join?access=denied")) {
      await expect(page.getByText(USER_ACCESS_GATE_TEXT)).toBeVisible();
      return;
    }

    await expect(page.getByRole("heading", { name: XP_HISTORY_COPY.title, exact: true })).toBeVisible();
    /* The standing card, shared with the profile page, is always drawn. */
    await expect(page.getByRole("heading", { name: XP_RANK_COPY.heading })).toBeVisible();
    await expect(page.getByRole("link", { name: XP_HISTORY_COPY.board })).toBeVisible();
  });
});
