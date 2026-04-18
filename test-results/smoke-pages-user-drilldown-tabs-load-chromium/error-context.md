# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke-pages.spec.ts >> user drilldown tabs load
- Location: e2e/smoke-pages.spec.ts:106:5

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByRole('tab', { name: 'WaniKani Explorer' })
Expected: "true"
Received: "false"
Timeout:  8000ms

Call log:
  - Expect "toHaveAttribute" with timeout 8000ms
  - waiting for getByRole('tab', { name: 'WaniKani Explorer' })
    12 × locator resolved to <button role="tab" type="button" aria-selected="false" class="rounded-full border border-line bg-surface px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground hover:bg-surface-muted">WaniKani Explorer</button>
       - unexpected value "false"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - main [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e7]:
            - generic [ref=e8]:
              - paragraph [ref=e9]: User detail
              - link "Leaderboard" [ref=e10] [cursor=pointer]:
                - /url: /
            - tablist "User dashboard tabs" [ref=e12]:
              - tab "Main Data" [selected] [ref=e13]
              - tab "Item Spread" [ref=e14]
              - tab "Level Progress" [ref=e15]
          - generic [ref=e16]:
            - heading "John" [level=1] [ref=e18]
            - generic [ref=e19]:
              - paragraph [ref=e20]:
                - generic [ref=e21]: "Rank #1"
                - generic [ref=e22]: of 7
              - generic [ref=e23]:
                - link "Previous user Emi" [ref=e24] [cursor=pointer]:
                  - /url: /users/emimcinnes
                  - text: < Emi
                - link "Next user Kamiko" [ref=e25] [cursor=pointer]:
                  - /url: /users/KanjiMasterKami123
                  - text: Kamiko >
          - generic [ref=e26]:
            - paragraph [ref=e27]:
              - text: "@johnmorrisdotca"
              - generic [ref=e28]: · john@johnmorris.ca
            - paragraph [ref=e29]:
              - generic [ref=e30]: Updated Apr 15, 4:41 AM (4 minutes ago)|Active Apr 15, 3:48 AM (57 minutes ago)
        - tabpanel [ref=e31]:
          - generic [ref=e32]:
            - article [ref=e33]:
              - paragraph [ref=e34]: Level
              - paragraph [ref=e35]: "17"
            - article [ref=e36]:
              - paragraph [ref=e37]: Learned Kanji
              - paragraph [ref=e38]: "8"
              - paragraph [ref=e39]: of 35 in this level
            - article [ref=e40]:
              - paragraph [ref=e41]: Remaining (Level)
              - paragraph [ref=e42]: "27"
              - paragraph [ref=e43]: "locked: 17"
            - article [ref=e44]:
              - paragraph [ref=e45]: Total Learned
              - paragraph [ref=e46]: "562"
              - paragraph [ref=e47]: all kanji at Guru+
            - article [ref=e48]:
              - paragraph [ref=e49]: Est. Time Remaining
              - paragraph [ref=e50]: Unknown
              - paragraph [ref=e51]: Until 90% level kanji at Guru+
          - generic [ref=e52]:
            - 'link "Apprentice: 122" [ref=e53] [cursor=pointer]':
              - /url: "?srs=apprentice#explorer"
              - generic [ref=e54]: "Apprentice:"
              - generic [ref=e55]: "122"
            - 'link "Guru: 368" [ref=e56] [cursor=pointer]':
              - /url: "?srs=guru#explorer"
              - generic [ref=e57]: "Guru:"
              - generic [ref=e58]: "368"
            - 'link "Master: 242" [ref=e59] [cursor=pointer]':
              - /url: "?srs=master#explorer"
              - generic [ref=e60]: "Master:"
              - generic [ref=e61]: "242"
            - 'link "Enlightened: 634" [ref=e62] [cursor=pointer]':
              - /url: "?srs=enlightened#explorer"
              - generic [ref=e63]: "Enlightened:"
              - generic [ref=e64]: "634"
            - 'link "Burned: 1,359" [ref=e65] [cursor=pointer]':
              - /url: "?srs=burned#explorer"
              - generic [ref=e66]: "Burned:"
              - generic [ref=e67]: 1,359
            - generic [ref=e68]:
              - generic [ref=e69]: "Radicals:"
              - generic [ref=e70]: "309"
            - generic [ref=e71]:
              - generic [ref=e72]: "Kanji:"
              - generic [ref=e73]: "594"
            - generic [ref=e74]:
              - generic [ref=e75]: "Vocab:"
              - generic [ref=e76]: 1,767
      - generic [ref=e77]:
        - generic [ref=e78]:
          - tablist "Explorer tabs" [ref=e79]:
            - tab "WaniKani Explorer" [ref=e80]
            - tab "Study" [selected] [ref=e81]
            - tab "JLPT Explorer" [ref=e82]
          - generic [ref=e83]:
            - tablist "Study queue mode" [ref=e84]:
              - tab "Reviews (...)" [selected] [ref=e85]
              - tab "Lessons (...)" [ref=e86]
            - button "Study Mode Off" [ref=e87]
        - generic [ref=e89]:
          - generic [ref=e90]:
            - generic [ref=e91]:
              - generic [ref=e92]:
                - heading "Study" [level=2] [ref=e93]
                - paragraph [ref=e94]: Reviews due now and pending lessons across all levels
              - generic [ref=e97]:
                - searchbox "Search study explorer" [ref=e98]
                - button "Search" [disabled] [ref=e99]
                - status "Search idle" [ref=e100]
            - generic [ref=e102]:
              - button "All Levels" [ref=e103]
              - button "L1" [disabled] [ref=e104]
              - button "L2" [disabled] [ref=e105]
              - button "L3" [disabled] [ref=e106]
              - button "L4" [disabled] [ref=e107]
              - button "L5" [disabled] [ref=e108]
              - button "L6" [disabled] [ref=e109]
              - button "L7" [disabled] [ref=e110]
              - button "L8" [disabled] [ref=e111]
              - button "L9" [disabled] [ref=e112]
              - button "L10" [disabled] [ref=e113]
              - button "L11" [disabled] [ref=e114]
              - button "L12" [disabled] [ref=e115]
              - button "L13" [disabled] [ref=e116]
              - button "L14" [disabled] [ref=e117]
              - button "L15" [disabled] [ref=e118]
              - button "L16" [disabled] [ref=e119]
              - button "L17" [disabled] [ref=e120]
            - generic [ref=e121]:
              - generic [ref=e122]:
                - button "All Levels (0)" [ref=e123]
                - button "radical (0)" [ref=e124]
                - button "kanji (0)" [ref=e125]
                - button "vocab (0)" [ref=e126]
              - generic [ref=e127]:
                - button "All (0)" [ref=e128]
                - button "Appr (0)" [ref=e129]
                - button "guru (0)" [ref=e130]
                - button "master (0)" [ref=e131]
                - button "Enlight (0)" [ref=e132]
          - generic [ref=e133]:
            - generic [ref=e134]:
              - paragraph [ref=e135]: Showing 0 loaded items · 0 total in queue
              - generic [ref=e136]:
                - button "Show English" [ref=e137]
                - button "Hide Locked" [ref=e138]
                - button "Recent Only" [ref=e139]
            - generic [ref=e143]: Loading study queue...
  - contentinfo [ref=e169]:
    - generic [ref=e170]:
      - paragraph [ref=e171]: WaniRanks. Built for steady daily progress.
      - generic [ref=e172]:
        - generic [ref=e173]: Theme
        - button "Dark" [ref=e174]
        - generic [ref=e175]: JP Font
        - button "Sans" [ref=e176]
        - link "Admin" [ref=e177] [cursor=pointer]:
          - /url: /admin
        - button "Login" [ref=e178]
```

# Test source

```ts
  12  | ];
  13  | 
  14  | const fallbackUsers = ["johnmorrisdotca"];
  15  | let smokeUsers = [...fallbackUsers];
  16  | 
  17  | function extractUsernames(payload: unknown): string[] {
  18  |   if (!payload || typeof payload !== "object") {
  19  |     return [];
  20  |   }
  21  | 
  22  |   const candidateRows = (payload as { rows?: unknown; leaderboard?: unknown }).rows
  23  |     ?? (payload as { rows?: unknown; leaderboard?: unknown }).leaderboard
  24  |     ?? payload;
  25  | 
  26  |   if (!Array.isArray(candidateRows)) {
  27  |     return [];
  28  |   }
  29  | 
  30  |   const users: string[] = [];
  31  |   for (const row of candidateRows) {
  32  |     if (!row || typeof row !== "object") {
  33  |       continue;
  34  |     }
  35  | 
  36  |     const candidate = (row as { wkUsername?: unknown; username?: unknown; nickname?: unknown }).wkUsername
  37  |       ?? (row as { wkUsername?: unknown; username?: unknown; nickname?: unknown }).username
  38  |       ?? (row as { wkUsername?: unknown; username?: unknown; nickname?: unknown }).nickname;
  39  | 
  40  |     if (typeof candidate === "string" && candidate.trim().length > 0) {
  41  |       users.push(candidate.trim());
  42  |     }
  43  | 
  44  |     if (users.length >= 3) {
  45  |       break;
  46  |     }
  47  |   }
  48  | 
  49  |   return users;
  50  | }
  51  | 
  52  | async function assertPageLoads(
  53  |   browser: Browser,
  54  |   url: string,
  55  |   checks: (page: import("@playwright/test").Page) => Promise<void>,
  56  | ): Promise<void> {
  57  |   const page = await browser.newPage();
  58  |   const badResponses: string[] = [];
  59  |   const pageErrors: string[] = [];
  60  | 
  61  |   page.on("response", (response) => {
  62  |     const status = response.status();
  63  |     if (status >= 500) {
  64  |       badResponses.push(`${status} ${response.url()}`);
  65  |     }
  66  |   });
  67  | 
  68  |   page.on("pageerror", (error) => {
  69  |     pageErrors.push(String(error));
  70  |   });
  71  | 
  72  |   await page.goto(url, { waitUntil: "domcontentloaded" });
  73  |   await page.waitForTimeout(3_000);
  74  | 
  75  |   await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  76  |   await expect(page.getByText("Internal Server Error")).toHaveCount(0);
  77  | 
  78  |   await checks(page);
  79  | 
  80  |   expect(pageErrors, `page errors for ${url}`).toEqual([]);
  81  |   expect(badResponses, `500+ responses for ${url}`).toEqual([]);
  82  | 
  83  |   await page.close();
  84  | }
  85  | 
  86  | test.beforeAll(async ({ request }) => {
  87  |   const response = await request.get("/api/leaderboard");
  88  |   if (!response.ok()) {
  89  |     return;
  90  |   }
  91  | 
  92  |   const payload = (await response.json()) as unknown;
  93  |   const extracted = extractUsernames(payload);
  94  |   if (extracted.length > 0) {
  95  |     smokeUsers = extracted;
  96  |   }
  97  | });
  98  | 
  99  | test("home page loads", async ({ browser, baseURL }) => {
  100 |   const url = `${baseURL}/`;
  101 |   await assertPageLoads(browser, url, async (page) => {
  102 |     await expect(page.locator("body")).toContainText("WaniRanks");
  103 |   });
  104 | });
  105 | 
  106 | test("user drilldown tabs load", async ({ browser, baseURL }) => {
  107 |   for (const user of smokeUsers) {
  108 |     for (const tab of tabs) {
  109 |       const url = `${baseURL}/users/${encodeURIComponent(user)}?tab=${tab.key}#explorer`;
  110 |       await assertPageLoads(browser, url, async (page) => {
  111 |         await expect(page.locator("h1")).toContainText(/.+/);
> 112 |         await expect(page.getByRole("tab", { name: tab.label })).toHaveAttribute("aria-selected", "true");
      |                                                                  ^ Error: expect(locator).toHaveAttribute(expected) failed
  113 |       });
  114 |     }
  115 |   }
  116 | });
  117 | 
```