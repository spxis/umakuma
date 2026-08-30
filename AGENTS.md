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
- Offer both densities wherever subjects are listed, through `SubjectViewModeToggle`, and persist the choice per surface with `getStoredEnum`/`setStoredEnum`.

### Domain Display Label Pattern

- For canonical domain display text (for example subject names/plurals/short labels), use a single shared source (for example `SUBJECT_TYPE_DISPLAY` in `src/lib/domainConstants.ts`) instead of duplicating strings like `"Radicals"`, `"Kanji"`, or `"Vocabulary"` across feature files.
- UI/config code should reference the shared display map by canonical key (for example `SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.kanji].singular`) rather than hardcoding equivalent labels.
- Inline copy is still allowed for non-domain prose/headings, but canonical domain labels used in pills, tabs, filters, and summary cards must come from the shared display source.

### Proactive Sweep Rule

- When asked to remove literals/magic strings/constants drift, do a repo-wide sweep before finishing, not just local edits.
- Required sweep includes runtime comparisons, duplicated inline type unions, and duplicated canonical domain display labels for the same domain values.
- If hits are found in the same domain area, fix them in the same pass and re-run quality checks before commit.

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
- User-facing copy must follow `BRAND_CORE.md` / `BRAND.md` voice and the Canadian spelling rule above.
- Keep primary glyph sizing identical across explorer lists, Review modals, and View Kanji/Radical/Vocabulary details by using the shared `glyphTextSizeClass` helper; do not add branch-specific responsive clamp sizes.
- Place trouble at the glyph's bottom-left and favourite at its bottom-right in explorer cards, Review modals, and View Kanji/Radical/Vocabulary details; do not put these controls in modal navigation or title chip rows.
- Keep submitted review items in the active modal session until the modal closes. Revisiting a submitted item must show its selected correct/wrong outcome read-only, including when it was the final item.
- Review and View Glyph modals must use the same shared in-glyph status-chip row. Dual-script readings show hiragana and katakana with one shared pronunciation, never duplicate English for each script.
- Review and View Glyph modal glyph containers must use the same full-height presentation so in-glyph chips never compress the glyph content.
- In mobile Study filters, selecting a Status chip drills into that status: hide sibling statuses and show its available numbered stages immediately. Expanding the section returns to all statuses.
- Study result counts must compare visible items with the active filtered aggregate, not the raw queue total, so applied filters are reflected in both values.
- Validate selected Study SRS stages against the same filter-aware stage counts displayed by the filter chips; raw queue counts can incorrectly clear valid stage selections.
- Admin confirmations must use shared dialog components (for example `ConfirmDialog` via `useAdminFeedback().confirmAction`). Do not use `window.confirm`.
- Admin success/error action feedback should use shared toast feedback (for example `useAdminFeedback().showToast`) rather than inline status banners like "Saved" blocks inside cards.
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
- Shiritori chains on `primaryReading` only, so the next link is derivable from the answered word alone. Words whose reading ends in ん are never targets; a chain ends when the pool has no remaining continuation.
- `toGameRunSummary` must build its result field by field. Callers pass runs with `questions` included, and spreading the row would ship every `targetSubjectId` to the client.
- Map mode plays on the 47 prefectures, which are not WaniKani subjects. They reuse the run/question/answer tables through reserved ids (`MAP_SUBJECT_ID_BASE` in `src/lib/japanPrefectures.ts`) that sit far above any real subject id, so scoring, streaks and the scoreboard need no map-specific paths. `hydrateGameQuestions` resolves those ids from the static map instead of `wkSubjectCatalog`; keep that split rather than adding prefecture rows to the catalog.
- The prefecture map in `src/data/japanPrefectures.json` is generated by `pnpm map:build` from dataofjapan/land. Regenerate it rather than hand-editing, and keep Okinawa in its inset box: including it in place stretches the frame until the mainland is unreadable.
- A game's presentation comes from `GAME_KIND_RULES` flags (`usesDirection`, `usesAnswerMode`, and the rest), never from inferring behavior from `fixedCategory`. Map mode shares Shiritori's `vocabulary` category for its accent colour but has its own direction and answer-mode controls.
- Subject content comes from `WkSubjectCatalog`, not the WaniKani API. Use `fetchCatalogSubjects` in the queue paths (or `getCatalogSubjectDetails` elsewhere) and fall back to the API only for ids the catalog lacks. Subjects are static and already synced locally; fetching them per request meant the study queue asked the API for up to 1,957 related subjects in sequential chunks, which was 9-12 seconds of a 15 second response. Assignments are the opposite — they are the player's own SRS state and must still come from the API.
- All WaniKani network traffic goes through `wanikaniFetch` in `src/lib/wanikani/http.ts`. Add new calls there, never a bare `fetch` to the API, so the offline stand-in in `src/lib/wanikani/mockApi.ts` keeps covering every caller. The mock requires `WANIKANI_MOCK=1` **and** the absence of Vercel's environment variable, and must never be reachable in a deployed environment.

## Don't touch

- `next-env.d.ts` (generated)
- `prisma/migrations/` history
- `skills-lock.json` unless updating skills

## Workflow

- **One feature, one commit, one release, with tests.** Every feature ships with
  its own unit tests (and a smoke spec when it adds a route), is committed on its
  own, and is released on its own. Do not batch unrelated features into a single
  commit or a single deploy — a batched release cannot be reverted without taking
  working features down with the broken one.
- `docs/BACKLOG.md` is the live plan: the release order, dependencies and open
  decisions. Feature names and dates live in `src/data/featureTimeline.json`,
  which also feeds the admin release page at `/admin/releases`. Record a new
  feature in the JSON, not in two places.
- **Every release bumps the site version.** A shipped feature's timeline entry
  gets the next `0.N.0`, and `package.json` plus `APP_VERSION` in
  `src/lib/appVersion.ts` move with it — the timeline unit test fails
  `quality:check` if the three disagree. The footer shows the version;
  `/admin/releases` shows each release's number.
- After implementation: commit and push. Conventional Commits, subject ≤ 50 chars.
- This repo has no migrations: the schema is applied by hand with `pnpm db:push`, and nothing in the deploy pipeline applies it for you. **Any change to `prisma/schema.prisma` must be pushed to the production database as its own step, or the deploy ships code the database cannot serve.** An added enum value is the easy one to miss: `map` was added to `GameKind`, deployed green, and every Map run failed in production while passing locally, because `db push` had only ever reached the local database. Verify with `pnpm db:drift:check` (read-only; exit 0 clean, exit 2 with the missing SQL). The deploy workflow now runs the same check after `vercel pull` and stops the deploy on drift.
- A push to `main` only triggers the production workflow; it is not itself a deployment. Run `pnpm preflight:prod` before pushing, then verify GitHub `CI` succeeds, the `Deploy to Vercel` workflow's `deploy` job completes `vercel deploy --prod`, and the canonical production alias returns HTTP 200. Investigate and fix failed workflow steps before reporting deployment success.
- When work is paused or reprioritized but may resume later, preserve useful uncommitted changes on a named WIP branch or stash before returning to the priority task. Do not discard that work merely to clean the current branch.
- Do not create markdown docs to describe changes unless asked.
- Prefer editing existing files over creating new ones.

## Communication

- Default language for all user-facing responses is English.
- Only switch to another language when the user explicitly requests it.
