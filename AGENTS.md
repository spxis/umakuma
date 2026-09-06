<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Workspace Gates (Single Source)

This file is the single source of truth for agent behavior in this repo.
`CLAUDE.md` must continue to delegate to this file only.

### File Size Gate

- Code files under `src/` must stay at or below 500 lines.
- Gate command: `pnpm loc:check`
- CI must run this gate on pull requests and pushes to `main`.

### Refactor Rule

- If a file approaches the limit, split by feature responsibility (`components/`, `lib/`, domain modules) rather than adding flags or deeply nested conditionals.

### Types And Props Pattern

- Keep component-local logic in component files, but move exported/shared `type` and `Props` declarations into adjacent helper files (for example `*.types.ts` or `lib/*Types.ts`).
- Prefer importing types from those helper files instead of defining large type blocks inline in UI components.
- When refactoring for LOC compliance, extract types/props first, then extract pure helpers/selectors, then split JSX sections into focused subcomponents.

### Component Constants Pattern

- For each component group/folder, keep **one** shared constants module instead of one constants file per component.
- Preferred naming: `<Feature>.constants.ts` at the component-group level (example: `StudyExplorer.constants.ts`).
- Components in that group should import from the shared constants module rather than defining local magic strings/numbers.
- Do not create additional `*.constants.ts` files in the same component group unless explicitly requested.

### Domain Literal Pattern

- Do not compare domain values with inline string literals in feature code (for example `queueType`, `subjectType`, `status`, review outcomes).
- Move domain literals and predicate helpers into a shared domain module under `lib/` (example: `studyExplorerDomain.ts`) and import those helpers/constants in both `lib/` and `components/`.
- For canonical domain values, prefer shared exported type aliases over inline string unions in type declarations (for example use `SubjectType`, `WkStatus` from `src/lib/domainConstants.ts`).
- Inline string unions are only allowed when adding non-domain values (example: `"all" | SubjectType`).
- Normalizer/helpers that return canonical domain values must return shared domain aliases (for example `SubjectType | null`) instead of duplicating literal unions.

### Shared UI Primitives

- Every modal uses `ModalShell` (`src/app/shared/ModalShell.tsx`) for its scrim, centring and dialog semantics. Do not hand-roll a `fixed inset-0` overlay: the fourteen that existed had drifted so that only four locked background scrolling, three never closed on Escape, and eight never set `aria-modal`.
- Backdrop dismissal is opt-in: pass `closeOnBackdrop` on informational modals (a list, a detail view, a preview) and leave it off everywhere else. The default is off because the risk is asymmetric — a stray click beside a form or a confirmation discards typed input or a decision, while an undismissable info panel merely needs its close button.
- Stacking order lives only in `MODAL_LAYERS` (`src/app/shared/modalLayers.ts`). Never invent a z-index in a component; add a named layer instead. The old per-component numbers escalated into nineteen distinct values including `z-10020` and `z-[9990]`.
- Lists of subjects render through the shared pair: `SubjectRows` (condensed, one line each) and `SubjectCards` (browsing grid), both taking `SubjectListRow` and per-surface slots. Study history and the Trouble/Favourites lists are the same code over different sources; a new list surface adapts into `SubjectListRow` rather than writing its own markup.
- **An inline set of subjects is a row of `SubjectPill`s; `SubjectCards` is a browsing grid.** The kanji inside a word, the parts of a character, a related group, the characters of a place name, a paste being turned into a list: these are a few items standing in a section of something else, and they are drawn with `SubjectPill` under one `PillTextToggle` (Text on/off). `SubjectCards` is for looking over a set — a level, a grade, a stroke count, a list — with a density toggle beside it. The map's region panel drew a three-character name with the explorer's card and was the one page whose kanji looked like nowhere else; do not hand-roll a bordered box around a glyph either, the pill already takes a reading, a meaning, a link and a tone. **It has one size and takes no size from a caller.** It carried a `size` prop from the days of several chips, and folding the others into it moved the disagreement inside: a kanji page drew the chips under Used in words at two thirds of the ones under Built from a block below, the same component both times, and the small variant's narrower minimum width lost to the default in the stylesheet and had never once applied. `SubjectPill.test.tsx` fails if a caller passes a size again. **It has one control over its words, too:** which of the reading and the meaning a chip prints is the member's standing choice, held by `usePillWords` and chosen through `PillWordsToggle` (Off / あ / EN / Both), and the pair a chip does not print stays on its title - `pillWordsTitle` is the function the Both mode draws with, so the hover and the drawn pair cannot end up in two formats. Never print both in a chip and never give a surface its own toggle: the chips printed `キ · cape` for a release because "text on" meant everything the chip knew, which is two questions answered at once. Ask `pillWords` for the words; it falls back to the half a chip has, so a row of drawn radicals with no readings does not come out blank.
- Offer both densities wherever subjects are listed, through `SubjectViewModeToggle`, and persist the choice per surface with `getStoredEnum`/`setStoredEnum`.
- **A control never contains another control.** A card that holds buttons — trouble, favourite, a selection tick — is a plain container, and the thing that opens it (the glyph) is the button. `UnifiedExplorerCard` was a `role="button"` wrapping three of them, which failed `nested-interactive` on 428 nodes and left a screen reader announcing the whole card as one button it could not get inside. `SubjectCards` and `SubjectRows` are the shape to copy: a `<button>` and its overlay controls as siblings inside a plain `li`. Overlay controls are positioned against a wrapper that matches the button's box, so nothing moves on screen. A container may still take a mouse click for convenience — use `data-clickable="true"` rather than a role — as long as it is not the only way in. `UnifiedExplorerCard.test.tsx` renders both densities and fails if any interactive element contains another; do not add a control inside the button to get around it.

### Domain Display Label Pattern

- For canonical domain display text (for example subject names/plurals/short labels), use a single shared source (for example `SUBJECT_TYPE_DISPLAY` in `src/lib/domainConstants.ts`) instead of duplicating strings like `"Radicals"`, `"Kanji"`, or `"Vocabulary"` across feature files.
- UI/config code should reference the shared display map by canonical key (for example `SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.kanji].singular`) rather than hardcoding equivalent labels.
- Inline copy is still allowed for non-domain prose/headings, but canonical domain labels used in pills, tabs, filters, and summary cards must come from the shared display source.

### Proactive Sweep Rule

- When asked to remove literals/magic strings/constants drift, do a repo-wide sweep before finishing, not just local edits.
- Required sweep includes runtime comparisons, duplicated inline type unions, and duplicated canonical domain display labels for the same domain values.
- If hits are found in the same domain area, fix them in the same pass and re-run quality checks before commit.

### The Curriculum Papers (Mandatory)

- **The two ladders are documented, and the documents are part of the change.**
  UmaKuma teaches one curriculum in two orders: **UN**, ordered by JLPT band,
  and **UG**, ordered by Japanese school year. The published explanations of
  how they work are not marketing left to rot - they state the promises the
  build is held to, and a reader checks them against the site. They live at
  `docs/CURRICULUM_PAPERS.md`, which lists each paper, its URL and the figures
  in it.
- **When a curriculum rule changes, update the papers in the same pass.** A
  moved milestone, a changed level shape, a new ordering rule, a renamed
  system: whatever changed, the pages that describe it change with it, before
  the work is called done. A paper describing a ladder we no longer build is
  worse than no paper, because somebody will act on it.
- **Every chart and table names the curriculum version it was drawn from.**
  `UN 2.0.0` / `UG 2.0.0`, taken from `curriculum.version` in each ladder file,
  printed with the figure. The ladders are rebuilt from their sources and move
  when the evidence says to, so a chart without a version is a number nobody
  can reproduce - and the version is exactly what tells a reader whether the
  picture still matches what a member is being taught.
- **Every answer records the curriculum it was answered against.**
  `UkReviewAttempt.curriculumStream` and `.curriculumVersion` are written at
  submission from the member's stream and the shipped ladder's version, never
  defaulted in the schema and never inferred later. A review answered against
  UN 1.0.0 and one answered against UN 2.0.0 are answers to different
  questions, because 95 kanji changed level between them; without the stamp
  neither can be read back honestly. Surfaces show it faintly - it is a
  provenance record, not something a member is being asked to think about.
- `pnpm ladder:rules` checks the promises those papers state. If a paper claims
  something the checker does not enforce, either the checker is missing a rule
  or the paper is making a claim we cannot keep. Both are bugs.

### Self-Improvement Loop (Mandatory)

- After any user-reported miss or correction, record a concise, reusable rule in repository memory (`/memories/repo/umakuma-conventions.md`) before ending the task.
- If the miss reflects a durable repo behavior expectation (not a one-off preference), also add/update the rule in this file so future agents inherit it.
- For UI parity requests (for example "make X like Y"), treat parity as **structural** first: match container order/slot placement before styling tweaks.
- Before commit on UI parity tasks, run a checklist in this order:
	1. Controls are in the same container slot as the reference page.
	2. No extra wrapper card/border was introduced.
	3. Button/tab classes follow the same active/inactive pattern.
	4. Empty/loading/error states still match repo conventions.
- Do not mark the task done until the requested pattern is matched exactly (not approximately).

## Stack

- Next.js 16 (App Router), React 19, TypeScript 5.
- Node 24.x, **pnpm 10.33.0** (never npm/yarn).
- Prisma 6 + Neon Postgres (`prisma/schema.prisma`).
- next-auth + invite codes; admin endpoints gated by `x-admin-key` header.
- Zod for API validation. SWR for client fetching. Tailwind v4.
- Vitest for unit tests (`pnpm test:unit`, part of `pnpm quality:check`), Playwright for smoke tests.

## Scripts

| Task | Command |
|---|---|
| Dev | `pnpm dev` |
| Build | `pnpm build` |
| Lint | `pnpm lint` |
| Lint (auto-fix) | `pnpm lint:fix` |
| LOC gate | `pnpm loc:check` |
| Quality check (lint + LOC) | `pnpm quality:check` |
| Quality fix then check | `pnpm quality:fix` |
| Unit tests | `pnpm test:unit` |
| Smoke (dev server) | `pnpm test:smoke:local` |
| Smoke (prod build) | `pnpm test:smoke:build` |
| Prisma push / studio | `pnpm db:push` / `pnpm db:studio` |
| Seed JLPT | `pnpm db:seed:jlpt` |
| Local DB + seeded test user | `pnpm dev:local`, `pnpm local:seed` (invite code `TEST01`) |

Run `pnpm quality:check` after non-trivial `src/` edits. If lint issues are auto-fixable, run `pnpm quality:fix` first.

## Repo map

- `src/app/` — App Router pages + colocated components.
- `src/app/api/*/route.ts` — API endpoints. Pattern: Zod parse → auth check → work → typed JSON.
- `src/app/shared/` — cross-page UI/types (study history, modals).
- `src/lib/` — domain + infra (prisma, crypto, auth, time/storage helpers).
- `src/lib/wanikani/` — WaniKani API surface (http, subjects, leaderboard, types).
- `scripts/` — seed/enrichment scripts and the LOC gate.
- `e2e/` — Playwright smoke specs.
- `docs/` — architecture, DRY learnings. Skim before designing changes.
- `BRAND*.md` — voice/copy rules. Read before writing user-facing strings.

## Shared utilities (do not re-implement)

- Date/time: `src/lib/timeFormat.ts`
- localStorage: `src/lib/clientStorage.ts`, `src/lib/usePersistedBoolean.ts`
- Token crypto: `src/lib/crypto.ts` (AES-256-GCM, needs `TOKEN_ENCRYPTION_KEY`)
- Admin auth: `src/lib/admin.ts`
- Prisma client: `src/lib/prisma.ts` (singleton)

## API conventions

- Validate inputs with Zod at the route boundary.
- Admin routes: verify `x-admin-key` via `src/lib/admin.ts` before any work.
- Never log, echo, or return WaniKani tokens — they are encrypted at rest.
- Return typed JSON; surface errors with appropriate status codes.

## Audience And Copy

- UmaKuma is built for Canadians and Americans learning Japanese. Write for both.
- **User-facing copy uses Canadian spelling.** Favourite, colour, behaviour, centre, catalogue, grey, travelled/cancelled, licence (noun) / license (verb), practice (noun) / practise (verb). Canadian English keeps `-ize` endings, so organize and recognize are correct as written.
- **Code keeps its existing spelling.** Identifiers, type and prop names, database columns, API request/response values, storage keys, CSS classes, and WaniKani API fields are not copy. `StudySubjectTag.favorite`, `STUDY_TAGS.favorite` and `tag=favorite` stay exactly as they are; only the words a member reads change. Never rename a persisted value for spelling.
- American spelling for members whose region is set to the US is a **future nice-to-have**, not something to hand-fork in components. It belongs to the locale layer below, as an `en-US` variant of the `en-CA` copy.
- Localization readiness: every user-facing string lives in its feature's shared copy module (`GAME_COPY`, `STUDY_TAG_LIST_COPY`, `<Feature>.constants.ts`), never inline in a component. This is the precondition for i18n — those maps become the `en-CA` dictionary, and a locale layer swaps them without touching a single component. Keep new copy going into those modules even before an i18n library exists.

## UI conventions

- Distinguish loading from empty (see `docs/DRY_LEARNINGS.md` #2).
- **Escape empties a search box, and then puts it away.** First press clears the query and keeps the cursor where it is; second press, on an empty box, closes the panel *and* blurs the field - which is what collapses an expanding box and closes the phone sheet. Closing the dropdown alone leaves the thing the member wanted rid of on screen and wider than before.
- **The header's two rows never wrap.** The top row and the section row under it each hold one line at every width and scroll when they run out of room - `flex-nowrap overflow-x-auto whitespace-nowrap admin-tab-scroll`, with `shrink-0` on each item. A header that grows a second line as the window narrows moves the whole page under the reader, and it happens in a band of widths nobody has open while they are building. `appHeaderRows.test.ts` fails if `flex-wrap` returns to either row. Anything else competing for that row - the release codename, for one - gives way to the pages first.
- User-facing copy must follow `BRAND_CORE.md` / `BRAND.md` voice and the Canadian spelling rule above.
- **A glyph is one of three sizes, and `src/app/shared/glyphSizes.ts` owns all three.** The subject of a surface takes `glyphTextSizeClass` (measured by length, so a six-character word does not run off a phone); one of many on a browsing card takes `GLYPH_CARD_SIZE_CLASS`; one of many in a row or on a chip takes `SubjectGlyph` or `SubjectPill`, which own `GLYPH_ROW_SIZE_CLASS` between them. Never type a `text-*` size onto a line that also carries `JP_TEXT_CLASS`, `japaneseTextProps` or `lang="ja"`, and do not add branch-specific responsive clamp sizes. There were nine sizes before this: a subject page heading clamping `text-5xl sm:text-6xl`, five list surfaces each spelling `text-2xl font-black leading-none` out in full - one of which had drifted to `sm:text-3xl` and one of which had lost its `lang="ja"`, so Chrome offered to translate 私自身 to "myself" - plus a `text-xl` proposal row and a `text-4xl` note modal. `pnpm glyph:check` (in `quality:check`) fails on a tenth. A surface that genuinely needs its own shape - a game tile sized to its board, a sentence in prose, the 253-radical picker - goes on that script's allow list with the reason written out.
- Place trouble at the glyph's bottom-left and favourite at its bottom-right in explorer cards, Review modals, and View Kanji/Radical/Vocabulary details; do not put these controls in modal navigation or title chip rows.
- Keep submitted review items in the active modal session until the modal closes. Revisiting a submitted item must show its selected correct/wrong outcome read-only, including when it was the final item.
- Review and View Glyph modals must use the same shared in-glyph status-chip row. Dual-script readings show hiragana and katakana with one shared pronunciation, never duplicate English for each script.
- Review and View Glyph modal glyph containers must use the same full-height presentation so in-glyph chips never compress the glyph content.
- In mobile Study filters, selecting a Status chip drills into that status: hide sibling statuses and show its available numbered stages immediately. Expanding the section returns to all statuses.
- Study result counts must compare visible items with the active filtered aggregate, not the raw queue total, so applied filters are reflected in both values.
- Validate selected Study SRS stages against the same filter-aware stage counts displayed by the filter chips; raw queue counts can incorrectly clear valid stage selections.
- Admin confirmations must use shared dialog components (for example `ConfirmDialog` via `useAdminFeedback().confirmAction`). Do not use `window.confirm`.
- Admin success/error action feedback should use shared toast feedback (for example `useAdminFeedback().showToast`) rather than inline status banners like "Saved" blocks inside cards.
- **Worksheet goes there; Print prints.** A button that navigates to a sheet is `Worksheet`, on every surface - list cards, the list page, followed lists, the stroke panel. `Print` exists only on a sheet, where it opens the print dialog (through `PrintButton`, with the scope menu when the sheet has more than one page). Never ship a `Print` that changes the page: the cards once had one that navigated and auto-printed on arrival, and the stroke panel got one that navigated and did nothing, and the two read as the same word doing three things. `?go=1` (`PRINT_NOW_PARAM`) is not for links - it is the sheet's own "Everything" choice reloading into the print layout, and `printLinkOwnership.test.ts` keeps it composed in one place.
- Invite sessions, including test accounts, must expose a direct sign-out action in the global user menu; do not require users to open the invite-management page first.
- Game scoring must reward 0.1-second differences while the speed bonus remains and include a bounded Level 1–60 bonus. Keep combined level and speed modifiers below one correct answer for every batch size so accuracy always outranks both.
- Game rounds must use disjoint targets and distractors with unique distractors when the pool permits, then balance and shuffle correct-answer sides. Constrained pools may reuse non-target choices as a fallback.
- Game Questions must offer `All` in both controls: setup `All` starts a round with every eligible item for the selected level/category, while scoreboard `All` includes every question-count size.
- Every tile game is played on the Corners board: four quadrants around the prompt, with the word always in the middle. The layout never changes with the choice count — corners the round does not use stay visible as greyed placeholders, and the player adds the bottom two from the lobby with the `+` sitting over them. Keys are the numpad corners (`7`/`9`/`1`/`3`); `8`/`2`/`4`/`6` and the arrows flash the row or column they name and `5` flashes the prompt, because none of them can answer. Map mode is the exception (`usesCornersBoard: false`): its tiles sit in a row and are numbered `1`-`4`. Runs still record `choiceCount` and default to two for backward compatibility, and scoreboards must expose hard-mode filtering plus a Difficulty column.
- Game Ultra Mode uses `GameRun.batchSize = -1` as its persisted sentinel. It requires one level/category, hides Questions, may combine with Hard Mode, repeats shuffled full-pool cycles indefinitely, and completes on the first wrong answer with elapsed time and streak preserved.
- Level-specific game leaderboards may list only accounts whose WaniKani level is at least the selected report level. Any/All-level reports may include every account.
- Games live behind a hub at `/users/[nickname]/game`. Each game is a `GameRun.kind` enum value, and every per-kind behavior (which controls show, whether it is endless, whether a wrong answer ends it, fixed category/question count) comes from `GAME_KIND_RULES` in `src/lib/gameMode.ts`. Do not add new games with `batchSize` sentinels; Ultra keeps `-1` only for backward compatibility as a `match` variant.
- Daily Challenge is one attempt per account per Vancouver day, enforced by the `(accountId, kind, dailyKey)` unique index. The first run of a day defines the question set and every later run copies those questions, so a mid-day level-up cannot change the day's questions. An unfinished attempt resumes rather than being replaced.
- Time Attack is scored by `calculateTimeAttackScore`, not the match formula: the clock is fixed and the volume varies. Keep the level bonus below one correct answer so volume always outranks it. Timed runs close through the `runs/[runId]/complete` route; fixed-length runs must not, or a partial round could bank a perfect score.
- Practice drills one list per run, chosen with `practiceList`: `trouble` and `favorite` take only the items the player tagged, and `toughest` ranks the whole pool by `reviewEaseScore` for players with no tags. Distractors still come from the full pool so choices stay confusable. The kind is still persisted as `revenge`, since renaming a Prisma enum value would rewrite every historical run.
- The Trouble and Favorites lists are readable anywhere through `StudyTagListsModal`, mounted once in the root layout and opened by event from `StudyTagListsButton` (the game lobby, History and the JLPT explorer). Picking an item hands the visible list to the glyph viewer, which stacks above it.
- Validation that only applies to some games must be gated on `GAME_KIND_RULES`. A blanket rule (Ultra requires a level, say) rejects a Map or Practice start whenever a stale setting rides along in the persisted selection, and the player only sees "Could not start the game".
- **A control hidden is not a control refused, and a list of allowed values is written once.** Anything limited to admins is gated at every entrance: the lobby offers it only to them, the route that acts on it checks again on the server, and the page returns 404 to everyone else. Ask one predicate from all three - `canUseMapCountry` in `src/lib/mapCountries.ts` is the shape - rather than letting each place answer separately. `adminOnly` on the four pilot map countries shipped as a label on one dropdown: `/maps/thailand` was a public page anyone could open by typing it, and the runs route still validated `mapCountry` against a literal `["JP","US","CA"]`, so the admin it was built for got "Could not start the game" on every pilot start. A second list of domain values always drifts from the first, and a unit test over either one will not notice; derive it from the registry.
- Shiritori chains on `primaryReading` only, so the next link is derivable from the answered word alone. Words whose reading ends in ん are never targets; a chain ends when the pool has no remaining continuation.
- `toGameRunSummary` must build its result field by field. Callers pass runs with `questions` included, and spreading the row would ship every `targetSubjectId` to the client.
- Map mode plays on the 47 prefectures, which are not WaniKani subjects. They reuse the run/question/answer tables through reserved ids (`MAP_SUBJECT_ID_BASE` in `src/lib/japanPrefectures.ts`) that sit far above any real subject id, so scoring, streaks and the scoreboard need no map-specific paths. `hydrateGameQuestions` resolves those ids from the static map instead of `wkSubjectCatalog`; keep that split rather than adding prefecture rows to the catalog.
- The prefecture map in `src/data/japanPrefectures.json` is generated by `pnpm map:build` from dataofjapan/land. Regenerate it rather than hand-editing, and keep Okinawa in its inset box: including it in place stretches the frame until the mainland is unreadable.
- A game's presentation comes from `GAME_KIND_RULES` flags (`usesDirection`, `usesAnswerMode`, and the rest), never from inferring behavior from `fixedCategory`. Map mode shares Shiritori's `vocabulary` category for its accent colour but has its own direction and answer-mode controls.
- **The simulated cohort is played, not typed in, and every one of them is `userType = test`.** `pnpm cohort add 32` invents members with real student names (Canada, the US, Vietnam, Thailand, France, Australia), `pnpm cohort play` walks each one through the site's own rules from the day they joined to now - lessons, reviews on the shared SRS schedule, XP through the same caps, games planned by `planGameRun` and scored by `completedRunValues` - and `pnpm cohort remove` takes them all out. A member's days are decided from their slug and the date, so `play` can be run on any schedule and never replays a day. Nothing public reads `userType`; admin surfaces and counts do, and a query that should exclude them filters on it rather than on an email domain. The engine in `src/lib/cohort/` mirrors the server orchestration and imports the rule modules; when `recordUkReview`, `awardXp` or `settleDailyXp` change, change the mirror in the same pass. Refuses a remote database without `--allow-remote`, and a production run takes `pnpm db:backup` first like any other write.
- Subject content comes from `WkSubjectCatalog`, not the WaniKani API. Use `fetchCatalogSubjects` in the queue paths (or `getCatalogSubjectDetails` elsewhere) and fall back to the API only for ids the catalog lacks. Subjects are static and already synced locally; fetching them per request meant the study queue asked the API for up to 1,957 related subjects in sequential chunks, which was 9-12 seconds of a 15 second response. Assignments are the player's own SRS state and originate at the API, but a page does not fetch them: `Account.assignmentCache` holds the whole `/assignments` collection, refreshed by the ordinary five-minute sync through `updated_after`, and the games, study tags and reading sign-off all read it. Take the same route with `getUserKanjiIndexFromCache` — asking WaniKani per render cost the JLPT explorer 650ms before it drew anything. The live call (`getUserKanjiIndex`) is for the queue paths, which are about to review the items and need this instant's stage.
- All WaniKani network traffic goes through `wanikaniFetch` in `src/lib/wanikani/http.ts`. Add new calls there, never a bare `fetch` to the API, so the offline stand-in in `src/lib/wanikani/mockApi.ts` keeps covering every caller. The mock requires `WANIKANI_MOCK=1` **and** the absence of Vercel's environment variable, and must never be reachable in a deployed environment.

## Don't touch

- `next-env.d.ts` (generated)
- `prisma/migrations/` history
- `skills-lock.json` unless updating skills

## Workflow

- **No backward compatibility. The site has no users yet.** Do not add redirects
  for old URLs, readers for old query parameters, fallbacks for old storage keys
  or shims for renamed fields. Change the thing and update every caller. A
  compatibility layer here buys nothing and costs a second code path that has to
  be understood, tested and eventually removed. The exceptions are the two places
  where the data outlives the code: persisted database values (a Prisma enum
  member like `revenge`, a `batchSize` sentinel) and anything already written to
  production.
- **One feature, one commit, one version, with tests.** Every feature ships with
  its own unit tests (and a smoke spec when it adds a route), is committed on its
  own, and takes its own `0.N.0`. Never batch two features into one commit: a
  batched *commit* cannot be reverted without taking a working feature down with
  the broken one, and that is the property the rule exists to protect.
- **Batch the push, not the commit.** Three to five finished features may be
  pushed together in one go. Revertability survives untouched, because
  `git revert <sha>` still takes out exactly one feature — separate commits are
  what buy that, not separate deploys. What a batch actually costs is knowing
  *which* of the five broke production if one does, and `quality:check` plus
  `pnpm build` run per feature before its commit, so anything a build can catch
  is already caught. Two exceptions ship alone and immediately:
  **a schema change** (the gap between the commit landing and `db:push`
  completing has to stay seconds, not minutes — see below), and anything that
  has to be verified in production before the next feature is built on top of
  it.
- **Never watch a deploy.** Push and start the next feature. Polling
  `gh run list` on a thirty-second loop costs five to seven minutes a release
  and buys nothing the gates did not already establish: `quality:check`,
  `pnpm build` and `pnpm audit --prod` have all passed before the push, and a
  deploy that fails after that fails for reasons watching would not have
  prevented. Verify once at the end of a batch — `gh run list` for the
  workflow and the canonical alias for the version — and investigate then.
  Three deploys were watched to completion on 2026-09-04, about eighteen
  minutes of sleeping, and every one of them was green.
- **Work in your own git worktree, never in the shared checkout - and never
  share a worktree either.** Several sessions have this repository open at once,
  and one working tree with several writers loses work in ways that do not
  announce themselves: a `git add -A` sweeps somebody else's half-finished file
  into an unrelated commit, a rebase drops a deletion nobody notices, a stash
  pop lands inside another session's edit. All three happened on 2026-09-02 and
  a board entry was lost outright.

  **One agent, one worktree. A worktree is not a room several agents can share.**
  Four agents were run in parallel inside a single worktree on 2026-09-04 and it
  reproduced the same hazard one level down, where it felt safe. `quality:check`
  went red twice on files that session had never touched and green again on its
  own as another agent saved, so a green gate meant only "nobody else was
  mid-save at that instant" - which is not what a gate is for. Nothing about a
  worktree makes concurrent writers safe; it only makes them less visible.

  One command sets one up:

      pnpm worktree <name> [--port 6402]

  It branches `work/<name>` off `origin/main`, installs into it, and prints the
  dev-server line. Give each worktree its own port or the second session
  silently gets the first one's app. Do not symlink `node_modules` into a
  worktree: vitest and tsc are happy with it and then Turbopack refuses to
  build, because the symlink points outside the project root — a real install
  is hard-linked from the same store and costs seconds. Remove it when the work
  is done: `git worktree remove ../umakuma-worktrees/<name>`.
- **The queue is in the database; the shipped record is in the file.** Two
  places, on purpose. What has been asked for, who is doing it and what is
  left lives in Postgres, reachable with `pnpm task` (production) or
  `pnpm task:local`:

      pnpm task                              what is open and who holds it
      pnpm task add "<title>" [--detail "…"] [--area study] [--bug]
      pnpm task claim <id> "<who>"           check one out
      pnpm task release <id>                 put it back
      pnpm task drop <id>                    answered no, kept on the record
      pnpm task filed <id> <timeline-id>     it became planned work in the file

  **Record a request the moment it arrives, before starting work on it.** A
  claim written to `featureTimeline.json` is invisible to every other session
  until it reaches main, and the usual way a conflict on that file is resolved
  - take main's copy - destroys whatever the session had just added. That
  happened three times in one afternoon on 2026-09-03 and lost a request
  outright. A row is true for everybody the moment it is written.

  A claim cannot be taken over: `claim` refuses and names the holder, because
  two agents building the same thing is the expensive failure, not two agents
  idle. Re-claiming your own is allowed and does nothing.

- **The timeline is the shipped record; the board that says what is open is
  `pnpm task`.** Several sessions work this repository at once and cannot see
  each other, so what has been asked for lives in the database, where a row is
  true for everybody the moment it is written: every request, bug or idea John
  sends becomes a ticket *before* the work starts (`pnpm task add "<title>"
  --detail "…" [--area <area>] [--bug]`), an agent claims it *before* building
  (`pnpm task claim <id> "<who>"`) and puts it down if it stops (`pnpm task
  release <id>`). A claim cannot be taken over; ask the holder to release it.

  `pnpm backlog add`, `claim` and `release` are **retired** and exit non-zero
  saying so: planned work is not written into `featureTimeline.json` any more.
  `pnpm backlog file <ticketId> <area>` is the trap - it is *not* retired, it
  still runs, and it still writes a `planned` entry into the JSON while
  marking the ticket `filed`. Do not use it. A versionless entry is invisible
  rather than merely wrong: `release` counts only entries that carry a
  version, so nothing on `/admin/releases` will ever show it. To undo one,
  `git checkout origin/main -- src/data/featureTimeline.json` and re-claim the
  ticket - `filed` is claimable, since `tickets.ts` reads it as the first
  board's word for open. That file keeps only
  what has shipped, and `pnpm release:take --ticket <id> --summary "…"` writes
  the entry and marks the ticket shipped in one pass, so the two halves cannot
  drift apart. Never hand-edit the JSON - the script takes a free release
  number, today's Vancouver date and the file's own escaping, which are the
  three things that went wrong by hand.
- **A wish is a request that has not been agreed to yet, and it lives in the
  database, not the file.** The timeline is `src/data/featureTimeline.json`, a
  committed file: an agent can add to it and commit, and the running site
  cannot write to it at all - a deploy would overwrite anything it did. So the
  admin page's wish list posts to the `FeatureWish` table instead, and a wish
  becomes work by becoming a ticket on the board every agent reads - never by
  being copied into the JSON, which is the shipped record and nothing else. A
  wish is not work until it is a claimed ticket.
- **In progress is not a status; it is a claim.** The board records `owner` and
  `claimedAt`, and that is the only place work-in-progress is written. The
  admin page's In progress tab is the claimed half of Planned, derived. Do not
  add a fifth status for it - two fields saying the same thing can disagree,
  and then neither can be trusted.
- `docs/BACKLOG.md` carries the reasoning the JSON has no room for: why an item
  exists, what it depends on, what has to be decided first. Feature names,
  dates and status live in `src/data/featureTimeline.json`, which also feeds
  the admin release page at `/admin/releases`. Record a new feature in the
  JSON, not in two places.
- **Every release bumps the site version.** A shipped feature's timeline entry
  gets the next `0.N.0`, and `package.json` plus `APP_VERSION` in
  `src/lib/appVersion.ts` move with it — the timeline unit test fails
  `quality:check` if the three disagree. The footer shows the version;
  `/admin/releases` shows each release's number.
- **Take the version immediately before pushing, never when the work starts.**
  It is a single global counter and several sessions draw from it at once, so a
  number claimed at the beginning of a feature is very likely gone by the time
  the feature is ready. Three search releases were renumbered four times on
  2026-09-02 while another session shipped 0.260 through 0.267 underneath them.
  Renumbering is never only the number: `releaseCodenames.ts` walks the 44-kana
  gojūon by version minor, so moving a release from 0.263 to 0.264 changes the
  kana its codename must begin with — ろ to わ — and forces a fresh name that
  still describes the release and reuses no word already in the list. So build
  and test with the work left as a claimed ticket, and do the release in one
  pass at the end, with the script that does all four together:

      pnpm release:take --ticket <ticket-id> --summary "…" \
        --romaji "…" --ja "…" --reading "…" --gloss "…"

  It asks `origin/main` what has actually been published — not the working
  tree, which is usually behind — takes the next minor, ships the entry through
  the board's own writer, and moves `package.json` and `APP_VERSION` with it. It
  refuses rather than guesses: a reading that does not start on that minor's
  kana, a romaji word an earlier name already used (only `na` and `no` are
  exempt, so `ga` and `to` collide), a version somebody took while you were
  building. Expect the word gate to reject an ordinary word - five hundred
  names in, `temoto`, `mejirushi`, `nakami`, `nimotsu`, `yajirushi` and
  `takasa` are all spoken for - so have a second word ready rather than
  reading the refusal as a problem with the release. Stop guessing after the
  second rejection and ask the list instead; three attempts at 1.25.0 died one
  word at a time before this did it in one:

      cat src/lib/releaseCodenameList*.ts | grep -o 'romaji: "[^"]*"' \
        | sed 's/romaji: "//;s/"//' | tr ' ' '\n' | tr 'A-Z' 'a-z' | sort -u

  Then `pnpm quality:check && pnpm preflight:prod`, and push.

  **"Immediately before pushing" means the push is the next command, not the
  next twenty minutes.** `preflight:prod` is `quality:check && security:check
  && build` and takes about twenty minutes, which is easily long enough for
  another session to take the number you are holding. On 2026-09-06 the theme
  page took 1.24.0, spent the gate on it, and found out from a rejected push -
  and renumbering to 1.25.0 moved the kana from の to は, so the codename had
  to be written again from scratch. The push being rejected as behind is the
  safe failure and nothing is lost, but the twenty minutes are. So chain it,
  and let the gate's exit code decide:

      pnpm release:take --ticket … && pnpm preflight:prod \
        && git fetch origin && git push origin HEAD:main

  The `&&` is the point: a red gate stops the push, and the fetch tells you
  main moved before the push does.

  **Only one session may hold an unpushed number at a time.** `release:take`
  cannot arbitrate this and reads as though it can: `publishedVersion()`
  returns the higher of `origin/main:package.json` and the *local*
  `package.json`, and the comment above it describes stamping several releases
  before a push. That defence only works for several takes **in one worktree**,
  where the local file rises as each is stamped. Across sessions it does
  nothing - one worktree per session is the rule, so two sessions that have not
  pushed both read the same remote, both read their own unmoved local, and both
  take the same minor. Nothing is written anywhere shared until a push lands;
  the script's only database calls read the ticket and mark it shipped.

  So when several sessions are batching a push, stamp in turn rather than in
  advance: each session takes its number only once the previous push is on
  `origin/main`. Pre-stamping the queue means assigning the numbers by hand,
  and the codename cannot be pre-assigned with them - the kana follows the
  minor, so a renumber forces a fresh name as well as a fresh number.

  Anything that is not a release — a docs change,
  a rule added to this file — takes no version at all and stays out of the race.
- After implementation: commit and push. Conventional Commits, subject ≤ 50 chars.
- **`pnpm db:backup` before every write to the production database.** Schema
  push, seed, backfill, enum change - all of them, every time, before the
  command that writes. The dump lands in `./backups` and the script prints the
  restore line; say in your reply that a backup was taken and where it is. If
  the backup fails, stop - do not proceed on the grounds that the change is
  small. On 2026-09-05 production was changed four times in one session - two
  columns added, 138 rows backfilled, 1,665 ladder rows seeded, then an enum
  value added and dropped with `--accept-data-loss` - and no backup was taken
  for any of them. John: "WTF - why would you do ANYTHING to a Production
  Database without taking backups? Especially when changing the schema. Even if
  you know it's safe." "I verified it was safe" is reasoning, not a safety net,
  and it is exactly the reasoning that is wrong in the case that matters. The
  cost of a backup is seconds; the cost of being wrong once is the family's
  whole history.
- This repo has no migrations: the schema is applied by hand with `pnpm db:push`, and nothing in the deploy pipeline applies it for you. **Any change to `prisma/schema.prisma` must be pushed to the production database as its own step, or the deploy ships code the database cannot serve.** An added enum value is the easy one to miss: `map` was added to `GameKind`, deployed green, and every Map run failed in production while passing locally, because `db push` had only ever reached the local database. Verify with `pnpm db:drift:check` (read-only; exit 0 clean, exit 2 with the missing SQL). The deploy workflow now runs the same check after `vercel pull` and stops the deploy on drift.
- **Push the schema commit to `main` first, then `db:push` to production.** The
  drift check fails in *both* directions and neither side is cheap: while the
  commit is on `main` and the column is not in the database, every session's
  deploy builds a schema production has not got; while the database is ahead,
  every session's deploy fails against a schema `main` has not got. The gate
  compares production against the commit being deployed, not against your
  working tree, so it cannot tell whose change it is either way. What actually
  matters is that the gap is seconds rather than minutes, so do the unreliable
  half first - the push, which may want a rebase or a fresh release number -
  and the reliable half second: land the commit that carries the schema change,
  apply it with `pnpm db:push` straight away, then confirm `pnpm db:drift:check`
  is exit 0. On 2026-09-02 a `db:push` run before `quality:check` and
  `preflight:prod` left production ahead of `main` for five minutes and took
  another session's finished release red; they went looking for an orphan
  column that was only a feature mid-flight. Never `db:push` a schema change you
  are not about to land, or land one you cannot `db:push` within the minute.
- A push to `main` only triggers the production workflow; it is not itself a deployment. Run `pnpm preflight:prod` before pushing, then verify GitHub `CI` succeeds, the `Deploy to Vercel` workflow's `deploy` job completes `vercel deploy --prod`, and the canonical production alias returns HTTP 200. Investigate and fix failed workflow steps before reporting deployment success.
- A `cancelled` deploy is not a failed one. The workflow holds `concurrency: vercel-production` with `cancel-in-progress`, so a push landing on top of yours kills your run and deploys from the newer commit instead — which carries your commit with it. This happens routinely while several sessions are shipping. Confirm it rather than assume it: `git merge-base --is-ancestor <your sha> origin/main`, then follow the newer SHA's deploy and check production for your own change. Report a cancellation as a failure only when your commit is genuinely not on `main`.
- When work is paused or reprioritized but may resume later, preserve useful uncommitted changes on a named WIP branch or stash before returning to the priority task. Do not discard that work merely to clean the current branch.
- Do not create markdown docs to describe changes unless asked.
- Prefer editing existing files over creating new ones.

## Communication

- Default language for all user-facing responses is English.
- Only switch to another language when the user explicitly requests it.
