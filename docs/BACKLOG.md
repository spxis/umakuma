# UmaKuma backlog

The live list of what is planned, in the order it should be built.

**Dates and feature names live in `src/data/featureTimeline.json`**, which also
feeds the admin release page at `/admin/releases`. Add a feature there, not
here, so the page and this document cannot disagree. This file carries the
reasoning the JSON has no room for: why an item exists, what it depends on, and
what has to be decided before it can start.

## Standing rules

- **The JSON is the ticket board.** Every request John sends is added with
  `pnpm backlog add` before the work starts; every agent claims with
  `pnpm backlog claim` before building. `pnpm backlog` shows what is open and
  who has it. This is what stops two sessions building the same thing and a
  report from living only in a chat.
- **One feature, one commit, one release.** No batching unrelated work.
- **Every feature ships with tests.** Unit tests for logic; a smoke spec when it
  adds a route.
- `pnpm quality:check` must pass before commit (lint, constants, LOC, unit).
- `prisma/schema.prisma` changes must be pushed to production by hand as their
  own step. There are no migrations, and nothing in the deploy applies them.
  Verify with `pnpm db:drift:check`.
- Never take a destructive action against production. It is real, in daily use,
  and there is no backup routine — `pnpm db:backup` only covers the local
  database. Owning that gap is item 34, deferred until the features are done.

---

## The release order

The spine is the identity work. Everything else hangs off where it sits
relative to "an account can exist without WaniKani".

Two rules set the order. **Privacy lands before the door opens** — deciding who
is visible after strangers can sign in is a leak with a changelog. And
**registration is built before the door opens, not after**, so the first person
through it meets a finished flow.

| # | Release | Blocked by |
|---|---|---|
| 1 | ~~Viewer identity fix~~ ✅ v0.58.0 | — |
| 2 | Viewing presence | needs a schema push |
| 3 | ~~Optional WaniKani connection~~ ✅ v0.95.0 | — |
| 4 | ~~Display names and visibility~~ ✅ v0.96.0, v0.103.0 | 3 |
| 5 | ~~Registration and onboarding~~ ✅ v0.103.0, v0.107.0 | 3, 4 |
| 6 | Open Google sign-up — **built, door still shut** | John to open |
| 7 | Standalone JLPT study | — |
| 8 | ~~Capability gating~~ ✅ v0.269.0 | — |
| 9 | ~~WaniKani-free game pool~~ ✅ v0.122.0 | — |
| 10 | ~~Connect your WaniKani account~~ ✅ v0.267.0 | — |
| 11 | Clans and families | 4 |
| 12 | Global ranking opt-in | 4, 11 |
| 13 | JLPT level reviews | design open |
| 14-17 | Sync, backfill, Ultra enum, DRY sweep | — |
| 18 | ~~Kanji card density and controls~~ ✅ v0.105.0 | — |
| 19 | ~~Stroke order as a shareable component~~ ✅ v0.108.0 | — |
| 20 | ~~Updates page: months, names, reachability~~ ✅ v0.109.0 | — |
| 21 | ~~Map regions beyond Japan~~ ✅ v0.121.0-v0.123.0 | — |
| 22 | ~~Saved practice lists~~ ✅ v0.133.0, v0.182.0 | 23 |
| 23 | ~~Selection as a shared surface control~~ ✅ v0.132.0-v0.189.0 | — |
| 24 | Print mode | — |
| 25 | ~~Practice sheet controls~~ ✅ v0.115.0, v0.116.0, v0.118.0 | — |
| 26 | ~~JLPT old numbering~~ ✅ v0.119.0 | — |
| 27 | ~~Counts on second-level filters~~ ✅ v0.124.0 | — |
| 28 | Pagination placement option | — |
| 30 | ~~Desktop page width and header crowding~~ ✅ v0.125.0 | — |
| 31 | ~~Consolidate preferences into Settings~~ ✅ v0.124.0 | — |
| 32 | ~~Capital cities in Map mode~~ ✅ v0.126.0 | — |
| 29 | ~~Real US and Canada map geometry~~ ✅ v0.123.0 | — |
| 33 | Example sentences from Tatoeba | — |
| 34 | Own the backups, on the Synology | features done |
| 35 | RESTful explorer paths — search unified v0.190.0, filter state left | — |
| 36 | ~~Controls nested inside controls (a11y)~~ ✅ v0.196.0 | — |
| 37 | ~~Colour contrast below the floor~~ ✅ v0.187.0 | — |
| 38 | Security leftovers before the door opens — slugs done v0.188.0 | 6 |
| 39 | ~~The library explorer's All-levels tab does nothing~~ ✅ v0.197.0 | — |

Releases 3, 4 and 5 are built while the door is still shut; release 6 opens it.
Release 6 should not ship before 7 to 9, or a member without WaniKani arrives to
mostly empty surfaces.

---

## Registration: where the questions go

**The questions cannot go on the Google screen.** Google owns the credential
step and its consent screen takes no custom fields. So the only possible shape
is: authenticate first, ask second.

```
Landing  ->  "Continue with Google"
         ->  Google consent            (external, nothing of ours on it)
         ->  callback: we now have email, name, Google id
         ->  account created immediately, no WaniKani, private
         ->  ONBOARDING WIZARD         <- every question lives here
         ->  land in the app
```

The account is created **before** the wizard, not after it, so a person who
closes the tab midway is a real account that resumes rather than a lost signup.
Track the furthest step reached and send them back to it.

### The wizard

Every step is skippable except the display name. Each writes as it completes.

1. **Display name.** Prefilled from the Google name, editable, with a generated
   friendly name if they clear it. This is the public name from release 4 — it
   is not a key, and nothing may start keying on it.
2. **WaniKani.** "Do you use WaniKani?" Yes opens a token field, validated
   against the API before saving so they see the username it resolved to. No or
   Later skips, and release 10 gives them the page to come back to. Say plainly
   that the token is encrypted and never shown again.
3. **JLPT certification.** Status first, then year, then level — see below.
4. **Public board.** One switch, **off** by default. This is the release 12
   opt-in asked at the moment someone is actually thinking about it.

Then a closing screen: what they can do now, and what connecting WaniKani would
add.

### The invite path converges on the same wizard

Invite members arrive with an account that already has WaniKani, and may have no
Google account at all. They get the same wizard with step 2 shown as already
connected. So the wizard must run under an invite session cookie as well as a
Google session — it cannot assume `getServerSession`.

---

## JLPT: the two numbering systems

Researched for the registration questions, and implemented in
`src/lib/jlptCertification.ts`.

The exam was restructured in **2010**. From 1984 to 2009 it ran four levels,
numbered 4 (easiest) to 1 (hardest). From July 2010 it runs five, N5 (easiest)
to N1 (hardest). **Both schemes count down, which is the trap**: old Level 4 is
the beginner certificate and maps to N5, not to N4.

| Old level (to 2009) | Modern equivalent | Official wording |
|---|---|---|
| Level 1 | N1 | About the same, N1 covers slightly more advanced material |
| Level 2 | N2 | About the same |
| — | **N3** | New. Bridges the gap between old Levels 3 and 2 |
| Level 3 | N4 | About the same |
| Level 4 | N5 | About the same |

N3 exists because the jump from old Level 3 to old Level 2 was the widest on the
ladder — roughly 300 kanji to 1,000, and 1,500 vocabulary to 6,000. No old
certificate maps onto N3.

**The year settles which system applies**, so the form asks the year first and
then offers only the levels that existed. 2009 and earlier is the old test; 2010
and later is the N system, with no overlap — the last old sitting was December
2009 and both 2010 sittings used the new format.

One consequence worth flagging: a test taken *about ten years ago* was sat in
roughly 2016, which is N-system, so "JLPT 4" from then means **N4**. An old
Level 4 means 2009 or earlier — seventeen-plus years ago — and maps to **N5**,
two rungs below N4. The two readings are far apart, which is exactly why the
year is asked before the level.

Old-test study benchmarks are kept in `CLASSIC_LEVEL_BENCHMARKS` and should be
shown as historical: the modern test publishes "can-do" statements instead and
no official kanji or vocabulary counts.

---

## Release notes

Detail the table has no room for.

### 1 — Viewer identity fix ✅ shipped (v0.58.0)

`resolveViewerMenuInfo` in `src/app/users/[nickname]/userPageAuth.ts` falls back
to matching a signed-in viewer's **Google display name** against an account
**nickname**, case-insensitively, and on just the first word of the name. The
account it finds supplies `wkUsername`, and `canViewUserPage` grants access on
`wkUsername`. A Google user whose display name is "Jay" is handed the account
nicknamed "Jay".

Live now, not only after open sign-up: `signIn` accepts any Google account
today. The API layer is unaffected — `canAccessAccount` matches on email only —
so this is a page-render grant, covering the dashboard, history, game and
libraries pages.

### 2 — Viewing presence

The shipped half of game activity reads `GameRun`: a run that is `active` and
was touched inside 90 seconds is one being answered. That covers *playing*. It
cannot cover *viewing* — somebody reading the hub without starting a round
leaves no trace on any run.

Presence needs a heartbeat and somewhere to put it. In-memory will not survive
serverless, so this needs a small table and a production `db:push`.

### 3 — Optional WaniKani connection

The blocker for everything after it. `Account` today **requires** WaniKani:
`tokenEncrypted`, `tokenIv`, `tokenTag`, `wkUserId` (unique), `wkUsername` and
`wkLevel` are all non-null. There is no account without a token.

Split identity from the connection: an account that always exists, and at most
one WaniKani link on it. Preferences belong to the account so they survive
connecting and disconnecting.

### 4 — Display names and visibility

A `displayName` shown publicly and a visibility flag defaulting to private.
Backfill all 8 existing accounts, generating a friendly name where nobody has
chosen. Set `john@spxis.com`'s account public; everyone else stays private until
they opt in.

`wkUsername` is a real WaniKani identity and must never reach a public response.

### 7 — Standalone JLPT study ✅ API shipped (v0.134.0)

`src/lib/jlptCatalogQuery.ts` holds the shared query; `/api/jlpt/catalog` serves
study content (the readings, not the admin view's counts) to any signed-in
member with no WaniKani token involved. The admin route uses the same query and
dropped from 320 to 222 lines.

**Still to do:** the explorer page itself still sits under `/users/[nickname]/`
gated on `wkUsername`, and `/api/accounts/[id]/jlpt` still decrypts a token for
the SRS overlay. The content is reachable; the surface is not yet.

Original note:


`JlptKanji` is already WaniKani-free — kanji, JLPT level, readings, meanings,
stroke count, school grade, Heisig keyword, word examples. Nothing refers to
WaniKani. The coupling is in the delivery:

- `src/app/api/accounts/[id]/jlpt/route.ts` decrypts the account's token to
  overlay per-kanji SRS state, so the whole endpoint needs one.
- The explorer sits under `/users/[nickname]/`, gated on `wkUsername`.

Most of the content layer already exists: `src/app/api/admin/jlpt/catalog/route.ts`
is 320 lines of filtering, grouping and counting straight off `prisma.jlptKanji`
with **zero** WaniKani references, locked behind `isAuthorizedAdmin`. Lift that
query into a shared lib and serve it to any signed-in member.

### 9 — WaniKani-free game pool

`loadGamePool` builds every round from `account.assignmentCache` — the player's
own WaniKani assignments. Without a connection the pool is empty, so **every
game except Map is unplayable**. Map is the exception because `planMapRun` takes
no `accountId`. Give the pool a catalogue-backed path.

### 13 — JLPT level reviews (design open, John planning)

The ask: review progression through an N level the way WaniKani progresses
through 60. The difficulty is granularity — 5 levels against WaniKani's 60.

Data available for subdividing, all already in `JlptKanji`:

| N level | Kanji |
|---|---|
| N5 | 79 |
| N4 | 166 |
| N3 | 367 |
| N2 | 367 |
| N1 | 1,232 |
| **Total** | **2,211** |

2,211 kanji over 60 sub-levels averages 37 each, close to WaniKani's ~30. But
the distribution is severely lumpy: N1 alone is 56% of the set, so proportional
subdivision gives N5 about two sub-levels and N1 about thirty-three.
`schoolGrade` is present on 100% of rows and `frequencyRank` on 95%, so either
can order kanji within a level.

### 14 — Content-based catalogue sync ✅ shipped (v0.57.0)

The original diagnosis here was wrong and is corrected for the record: the
sync's timestamp comparison was numeric and sound all along. The real cause,
read from the interrupted run's own counters, is that **WaniKani bumps
`data_updated_at` for edits to fields we never extract** — 3,786 of 4,000
fetched rows had moved timestamps over byte-identical extracted content. The
sync now compares the served fields (`catalogContentEquals`) and skips those
rows entirely; a skipped row keeps its old timestamp, which nothing keys on,
and the fetch cursor lives on the state row. Run stats record the
content-identical count separately.

### 15 — Backfill missing catalogue subjects ✅ shipped (v0.200.0)

64 subjects in the study queue are absent from `WkSubjectCatalog` and still fall
through to the API on every request. Related-subject coverage is already
complete at 6,950 of 6,950.

**Both numbers were stale, and the second was wrong.** Measured on 1 Sep it was
**98**, not 64, and related coverage was not complete — 31 of the 98 were
reachable only as another subject's component, amalgamation or visually-similar
id. The gap had widened because the newly-missing rows referenced each other.

**Cause: the interrupted sync from item 14.** A sync that stops keeps a cursor,
and a resumed run continues from it rather than going back for what it skipped,
so a hole never closes on its own. The state row still carries that run's
`incrementalResumePath`.

**What they were:** almost all of WaniKani's kana-only vocabulary — これ, ホテル,
おはよう, コーヒー, ありがとう — which is the vocabulary a beginner meets first,
so the API round trip was happening on the most-used words rather than obscure
ones.

`pnpm db:backfill:wk-catalog` measures the gap and fetches only the difference.
**It inserts and never updates**: every id it writes was established as absent
moments before, and it uses `createMany({ skipDuplicates: true })`, so a row
that already exists is left exactly as it is. Correcting merely stale content is
the sync's job — it has content comparison for that — and a backfill that could
overwrite is one that could lose something on a database in daily use. Dry run
unless given `--apply`.

**Applied to production 1 Sep: 9,324 → 9,422 rows, 98 added, 0 removed, 0
updated**, verified against an id snapshot taken beforehand.

**Four remain: 9477, 9486, 9490, 9492** (惹く, 賜る, 覗く, 惹かれる). They only
became reachable once the 98 were in, since they are related subjects *of* those
rows — the gap closes transitively, so it takes a second pass. One more
`pnpm db:backfill:wk-catalog --apply` finishes it.

Note it cannot be rehearsed under the offline mock: `WANIKANI_MOCK=1` answers
`/subjects?ids=` out of `WkSubjectCatalog`, the very table with the hole in it,
so every id comes back unserved. A local run still exercises the measurement and
the insert; the fetch needs a dry run against the real API.

### 16 — Ultra as its own game kind

Ultra is persisted as `batchSize = -1`. It should be a `GameKind` value like
every other game, with the sentinel kept readable for historical runs.

### 17 — Shared surface primitives

Finish the 29 Aug sweep: `SurfaceCard` has 4 adopters while ~19 files hand-roll
the same panel; `LoadingState` and `PillChip` have 2 each.

### 19 — Your Lists cards drifted from the shared card ✅ shipped

Reported by John, 30 Aug. The cards in `StudyTagListsModal` are not the shared
explorer card: the level sits at the bottom next to the type pill instead of the
top right, and a remove `×` occupies the top-right corner the level should own.
Every other surface — the Study explorer, the JLPT explorer, History — puts the
level top right, so the lists read as a different component for the same thing.

Fix by rendering the lists through the shared card (`SubjectCards` /
`UnifiedExplorerCard`) rather than restyling a copy, which means finding a home
for the remove action that does not take the level's corner. The tag controls
already have a convention to follow: trouble bottom-left, favourite
bottom-right, per the glyph-control rule in `AGENTS.md`. Removal is a third
control, so it likely belongs in the same bottom row or behind the card's
overflow, not the top right.

Grouped with 17: both are "one component, many hand-rolled copies", and the
lists should land on the shared card in the same pass.

**Done, and the note was left stale for a while.** `StudyTagListsBody` renders
through `SubjectCards` / `SubjectRows` like every other list; the level sits
top right where the explorers put it, and the remove control moved to the
bottom-right corner rather than taking the level's. The reasoning is written
into `SubjectCards.tsx` beside the layout.

### 21 — Stroke order from KanjiVG (researched, needs a licence call)

John, 30 Aug: can kids see how to draw the kanji correctly.

**The source exists and it is good.** KanjiVG (kanjivg.tagaini.net, GitHub
KanjiVG/kanjivg, last pushed July 2026) ships one SVG per character holding the
stroke paths **in drawing order**, plus stroke-order numbers and radical and
component tagging. Verified against 日: four `<path>` elements, one per stroke,
in order, with the element tagged 日.

**Coverage measured against our own data, not estimated:**

| Our data | Covered by KanjiVG |
|---|---|
| School grade kanji | 2,899 / 2,899 (100%) |
| Grade 2 alone | 160 / 160 |
| JLPT kanji | 2,211 / 2,211 (100%) |

6,703 base characters in total, so there is headroom well past joyo.

**Why it beats an animated GIF.** The paths are vectors, so an animation is a
CSS `stroke-dasharray` reveal over the real path: crisp at any size, one small
file per kanji, no image pipeline, and the same data can drive a "trace it
yourself" mode later. A GIF can only be watched.

**The open decision, and it is John's.** KanjiVG is **CC BY-SA 3.0**. That means
attribution (state the use of KanjiVG and link to the project) and *share-alike*:
converting the SVGs into our own JSON makes a derivative, so that derived data
has to carry the same licence. It does not reach UmaKuma's application code, only
the stroke data we would ship. Fine for most sites, but it is a deliberate choice
to make rather than discover, especially if the site ever takes money.

**Shape if approved.** A `scripts/build-kanjivg.mjs` in the same spirit as
`map:build`: pull the repo at a pinned commit, keep only the characters our
catalogues use, strip each SVG to `{ kanji, strokes: string[], strokeCount }`,
and write `src/data/stroke-order/` chunked by grade so a page loads only what it
shows. No new table needed at first: it is static reference data like the maps
and the school grades, and it can move into Postgres later if it ever needs
querying rather than reading.

### 22 — The smoke suite tests almost nothing ✅ shipped

Found 30 Aug while checking that a night of releases had not broken anything.

**23 of the 28 smoke tests were skipping**, every run, silently. Each one is
gated on `accessibleStudyUser`, which the suite finds by probing user pages
**unauthenticated** — and every user page is behind the access wall, so the
probe never succeeds and the study, explorer, history and check-in tests all
skip. The suite reported green while exercising the home page, the news page
and little else.

`e2e/auth.setup.ts` now mints a session cookie and hands it to the run through
`storageState`, so those tests execute. It skips cleanly when there is no
`AUTH_SECRET` or admin address, so a contributor without production credentials
still gets the public checks rather than a wall of errors.

**With them running, they fail — and not because anything is broken.** They are
stale, written against an older UI. The first one asserts a button named
`All Levels (143)`; the chip has read `ALL (143)` for some time. The page itself
renders correctly, filters and all — verified by screenshot.

**This is deliberately left red rather than half-fixed.** Each assertion was
protecting some behaviour, and guessing at 23 of them would produce tests that
pass without meaning, which is how the suite got here. Working through them
wants someone who knows what each was for.

Note that CI does not run this suite — it runs `quality:check`, `security:check`
and `build` — so nothing in the pipeline changes. `pnpm test:smoke:local` now
tells the truth, and the truth is that it needs work.

**Fixed. 38 passing, 0 failing.** The diagnosis above was half right. The
assertions were stale, but the reason nothing ran signed in was a bug rather
than a gap: `assertPageLoads` and search's `openPage` both built their page
with `browser.newPage()`, which makes its own context and ignores the
project's `storageState` — so the cookie `auth.setup` mints was thrown away on
every call. Anonymous lands on `/join?access=denied`; with the session, the
real page.

The rest was a UI that had moved: filter chips became tabs in named tablists,
the queue summary changed shape, the three explorers became routes rather than
tabs, `studyMode` split in two, and "Toggle favorite" became "Toggle favourite"
with the spelling rule. One test was deleted rather than repaired — the Hide
Locked and Recent Only toggles do not exist any more, so it had nothing left to
protect. Two failures were real bugs, written up as item 39 and fixed in
v0.186.0 respectively.

### 20 — Navigation regroup and a Settings page (design open)

John, 30 Aug. The header carries ten items for a member (eleven for an admin)
and already wraps to two rows at 1440px: Leaderboard, Study, Game, Library
Explorer, JLPT Explorer, History, Stats, News, Read, Libraries.

**Settled by John.** Lists becomes a top-level item rather than a modal reached
from a button on three pages. Libraries moves into a new Settings page, which is
configuration and belongs there. The groupings below are approved, including
History and Stats going to Progress rather than Settings.

**Agreed shape**, 10 items down to 8:

| Item | Holds |
|---|---|
| Leaderboard | as today |
| Study | as today |
| Game | as today |
| Lists | Trouble and Favourites, promoted out of `StudyTagListsModal` |
| Explore | Library Explorer + JLPT Explorer |
| Progress | History + Stats |
| Read | Read + News |
| Settings | Libraries, preferences, display name, WaniKani connection |

**Why History and Stats are not Settings.** John asked whether they join
Settings; agreed 30 Aug that they do not. Settings is what you configure, while
History and Stats are what you read about yourself, so filing them there makes
them harder to find and turns Settings into a junk drawer. They are still two
nav items answering one question, so they merge into a Progress page with two
tabs. That solves the crowding without the category error.

**Depends on the identity arc.** Settings is where the WaniKani connection
toggle and the display name live once accounts can exist without a token, so
this wants to land with or just after 3 and 4 rather than before them. Building
Settings first as an empty shell for Libraries is fine and gives 3 and 4 a home
to land in.

Note that promoting Lists to a page does not retire `StudyTagListsModal`: the
in-place modal is still right when picking an item mid-session from Study or the
game lobby. The page and the modal should render the same list component, which
is 19's shared-card work.

---

### 18 — Parallel level ladder (design open)

WaniKani teaches 2,098 kanji. Our JLPT table holds 2,211. They are not nested:

| | Count |
|---|---|
| In both | 1,955 |
| JLPT only, **missing from WaniKani** | 256 |
| WaniKani only, missing from the JLPT table | 143 |

**No grade-school kanji are missing from WaniKani.** All 998 across grades 1 to
6 are covered. The 256-kanji gap is entirely N1 and splits as 53 at grade 8
(jouyou taught in secondary school) and 203 at grade 9 (jinmeiyou, approved for
names but outside jouyou). The reverse gap of 143 sits mostly in WaniKani levels
31 to 50.

The JLPT table has holes of its own: 鬱 and 苺 are absent entirely, so it is not
a complete jouyou set either — roughly 172 jouyou kanji short.

`/admin/kanji-coverage` reports all of this live off the two tables. It is the
measurement surface the ladder should be designed against, and deliberately
stores nothing: both catalogues change on their own schedule, so a persisted
copy would be a third thing to keep true. The ladder itself, when its shape is
decided, is what earns a table.

### 33 — Example sentences from Tatoeba (approved in principle, not started)

John, 31 Aug: "Tatoeba integration sounds like an idea — where we ingest
periodically and attribute site wide", and separately: this is what replaces
leaning on WaniKani context sentences once members arrive who have no WaniKani
account. Sized as its own task, after the search work.

**Why it is not scraping.** Tatoeba publishes weekly exports (sentences,
links between a sentence and its translations, and per-sentence licence and
author rows) as downloadable files. Ingesting those is the supported path and
the reason no crawler is needed. Licence is CC BY 2.0 FR on the corpus, with
some individual sentences CC0 — attribution is site-wide, which is why John's
"attribute site wide" is the right shape, but the per-sentence licence column
has to be carried through the ingest rather than assumed uniform.

**Why it matters beyond a nicer glyph page.** WaniKani context sentences are
WaniKani's, shown to WaniKani members. Everything built for a member without a
connection — standalone JLPT study, the grade explorer, Practice — currently
has no sentence to show at all. This is the sentence source those surfaces can
actually use.

**Shape.** Four pieces, in this order, each its own release:

1. `scripts/ingest-tatoeba.mjs` — pull the pinned weekly export, keep Japanese
   sentences with an English translation, drop anything without a usable
   licence row, and index by the characters each sentence contains so a kanji
   or a vocabulary word can find its own examples. This is the `map:build`
   pattern: regenerate, never hand-edit.
2. A table rather than JSON. Unlike the prefectures and the grade catalogue,
   this is too large to ship in the bundle and wants querying by character and
   by level. That means a `prisma/schema.prisma` change, which means a manual
   `pnpm db:push` to production as its own step — the failure mode that took
   Map mode down.
3. `/api/sentences` — the same shape as `/api/search`: Zod at the boundary,
   windowed with `limit`/`offset`, cached per query string.
4. The surfaces, once the data is real: the glyph viewer, the Review and View
   Kanji/Radical/Vocabulary modals, the JLPT and grade explorers, and search
   results, which is where a learner asking "how is this used" already is.
   Attribution lands in the footer in the same pass as the first surface, not
   after it.

**Open, and John's:** whether a sentence with no English translation is worth
storing (it is useful for reading practice and useless for a meaning check),
and how a sentence gets chosen when a common character has thousands.

Related decision already made: WaniKani audio stays gated to members with a
WaniKani connection, and Tofugu is not being asked for anything yet.

---

## What works without a WaniKani connection

The gating design in release 6 comes from this. It is drawn from what each
feature actually reads, not from where it appears in the UI.

**This table now lives in code**, as `MEMBER_CAPABILITIES` in
`src/lib/memberCapabilities.ts` (v0.269.0). The navigation, the gated pages and
the connection page all read it, so a new WaniKani-only surface is a line there
rather than a check in three files. Keep the two in step; the code is the one
that decides.

| Surface | Without WaniKani | Why |
|---|---|---|
| JLPT kanji study | **Yes**, after release 3 | `JlptKanji` has no WaniKani columns |
| News reader | **Yes** | Tokenizes text; kanji levels come from the local catalogue |
| Map mode | **Yes** | 47 prefectures, static; `planMapRun` takes no account |
| Custom study libraries | **Yes** | Own lists, own SRS in `CustomStudyState` |
| Trouble / Favourites lists | **Yes** | `StudySubjectTag` is the app's own data |
| Public leaderboard (viewing) | **Yes** | Reads public accounts only, after release 11 |
| Games other than Map | **After release 7** | `loadGamePool` reads `assignmentCache` today |
| Study queue, lessons, reviews | **No** | The player's live SRS state, only WaniKani has it |
| Level and JLPT progress overlay | **No** | Per-kanji SRS state from the API |
| Dashboard stats, burned counts | **No** | Mirrors of WaniKani figures |
| Leaderboard rank | **No** | Score derives from WaniKani progress |

The takeaway: a member with no WaniKani account still gets JLPT study, the news
reader, custom libraries with the app's own SRS, every game, and the public
board. That is a real product, not a waiting room.

---

## Privacy surfaces to fix before opening the door

- `/api/leaderboard` selects `nickname` and `wkUsername` for every account with
  no visibility filter.
- The home page renders the full leaderboard with per-account stats.
- `resolveViewerMenuInfo` — release 1 above.
- The game hub's last-play line names the account that played, across every
  account, using `nickname`. Correct for one private family; it must switch to
  the display name and be scoped to the viewer's group in releases 4 and 11.

`wkUsername` is a real WaniKani identity and should never appear in a public
response. Public surfaces show the display name from release 4 and nothing else.

---

## Lists: sharing them (2026-09-01)

John's list, in his words: public and private lists; share a list to friends;
add a list you are viewing to your own; a shared list anyone can add to; lock
and unlock a list for public change; propose additions and deletions to a
locked list for the owner to approve; archive rather than delete; duplicate a
list you are viewing so you own the copy; subscribe to a list to view it
without changing it; and filter a list by what it holds - radicals, kanji,
vocabulary, sentences - with chips.

Each is an entry on the board (`list-*`). What the board has no room for:

**The base comes first, and it is a schema change.** A list is a `String[]` of
characters, which is why it can only hold kanji and why a word added from
search becomes its kanji. Every sharing feature wants to know *what* an item
is, so the first release turns a list into rows of items with a kind
(`list-items-of-every-kind`): the kind chips fall out of that for free, and
nothing later has to be reworked. Existing lists carry over as kanji items in
their order. This is a `db:push` to production and needs a snapshot first.

**Order.** Items → visibility and share links → copy and subscribe → open lists
with locks and proposals → archive. Visibility before copying, because copying
a list you cannot see is not a thing; open contributions after subscribe,
because a proposal is a subscriber's act. Archive last, since it only matters
once lists have other people attached.

**Archive, not lock, for the end of a shared list.** John's own instinct, and
right: a lock says "no more changes for now", an archive says "this is
finished, keep it readable". A shared list that others subscribed to must not
vanish under them, so delete stays only for a private list nobody has seen.

**Subscribe and copy are different promises.** Subscribing keeps the owner's
list current and read-only; copying makes it yours and lets it drift. A copy
remembers its source so `list-copy-sync` can offer "pull what was added since"
without turning the copy back into a subscription.

**Additions from an AI pass, filed as their own entries.** Who knows what
across a shared list (`list-progress-overlay`: the family use, and a reason
for sharing at all); starter lists nobody owns, built from the catalogue
(`list-starter-lists`: JLPT N5, Grade 1, WaniKani level 12, the prefectures);
a note per item (`list-item-notes`); pull updates into a copy
(`list-copy-sync`); build a list from pasted text (`list-paste-import`); and
every game and practice mode accepting a list you only subscribe to
(`list-practice-from-shared`). Considered and not filed: comments on lists
(a family talks in the room, not in the app), likes and counts (a leaderboard
of lists rewards the wrong thing), and real-time co-editing (proposals cover
the case without the machinery).

**Live lists (2026-09-01, John).** The starter lists are not snapshots but
live: Grade 1 is whatever the grade table says today, N3 is whatever the JLPT
table says, and they change when the data does. They are system lists - owned
by nobody, public, subscribable, copyable, filterable by kind like any other -
and the point of copying one is to cut it down: half of Grade 1 for this
week, or Grade 1 minus what you already know. So a live list is a *query*
stored as a list (kind, level, source) rather than rows, materialised when
read; a copy of it is rows, taken at that moment. That is the one place the
items model needs a second shape, and it is worth deciding in the items
release rather than after it.

**The burn list (2026-09-01, John).** A third built-in list beside Trouble and
Favourites: Burned, for what you know so well you never need to read it. It
starts empty for everyone, WaniKani or not. Two ways in: marked by hand, and
for a member with WaniKani connected, a control on the list itself that
applies their WaniKani burned items - shown as a count first ("Apply 412
burned items"), run when they choose and again whenever they like, never
silently on sync, so the list stays theirs. One effect: applied, it removes
those items from any list being viewed or practised. It is a *filter over every list*, not a
list to read, which is why it sits with the tags (a third boolean on
`StudySubjectTag`, a schema push) and why the toggle to apply it belongs on
the list surfaces and the practice setup, remembered per member. The count of
hidden items stays visible ("12 burned hidden") so a list never looks shorter
than it is without saying why.

**Decisions John should make before the sharing releases start.**
1. Does *public* mean readable without signing in, or by any member? The
   subject pages are open to the world; a list carries a member's name and
   choices, so the default proposal is: public means any signed-in member,
   and *unlisted* (anyone with the link) is the way to show a list to someone
   outside.
2. Where do proposals wait: a badge on the list, a row in the account menu,
   or both? Proposal is: on the list itself, with a count in the Lists page.
3. Can a subscriber see the owner's progress overlay, or only the owner see
   subscribers'? Proposal: everyone on a shared list sees everyone's, subject
   to each member's existing visibility setting.
4. Do starter lists show up for everyone by default, or only once subscribed?
   Proposal: a "Starter lists" section on the Lists page, subscribed on
   demand, so a new member's page is not forty lists long.

## Search: numbers and money (2026-09-02)

Four releases went out today on the search box - a dollar sign, the answers in
the dropdown, currency words, and Japanese magnitudes - and what is left is
recorded here rather than rediscovered.

### 44 — Read large Japanese numbers in search, and the library under it

Two defects proved this is a library rather than a spelling fix.

`5000` produces 五千 correctly and finds **nothing**, because 五千 is not a
subject: the catalogues hold 五 and 千 separately, and no dictionary entry
spells out the compound. `24` is the same - 二十四 exists nowhere - and the
single result it returns is an unrelated substring match. Offering more
spellings cannot fix this. A number is something the search *works out*, so it
belongs in the answer row that `Heisei 3` and `500 yen` already use, with the
component characters offered as rows underneath.

That answer needs three things `searchNumerals.ts` does not have:

- **A reading.** 五千 is ごせん, and the sound changes are irregular: 300 is
  さんびゃく, 600 ろっぴゃく, 800 はっぴゃく, 3000 さんぜん, 8000 はっせん.
  4, 7 and 9 each have two readings and the number decides which.
- **The reverse direction.** 一億二千万 must answer with 120,000,000. The money
  parser's `readAmount` already walks Arabic digits against 千万億兆 and
  rejects units that climb; the kanji-digit version is the same shape.
- **A cap that reflects what a reader meets.** `LARGEST_USEFUL` is 99,999,999,
  which is below the 一億 that appears in every house listing.

Do this before 51 and 52 below; both need the same word-to-value reader.

### 49 — A thousands comma is not a full stop

`japaneseNumberVariants` matches `\d+`, so `5,000` reads as 5 and 000 and
offers 五, five, 零 and zero. `parseMoneyQuery` already strips a thousands
comma before reading; the two should use one rule.

### 51, 52 — Amounts in words, and a word too many

`five hundred yen` and `5 man yen` need 44's word reader. `100 dollars CAD`
needs the parser to take more than one token per side - it currently allows one
before the number and one after, which is what makes the intersection rule
simple. Both are small once 44 exists; neither is worth its own parser rewrite
before then.

### Settled today, so nobody reopens it

- **A bare dollar sign answers in both dollars** rather than guessing or
  refusing. The same choice a yen amount already made coming the other way.
- **A magnitude needs a currency beside it.** `20k` and `5万` on their own stay
  numbers, which is what leaves 44 its own query to answer.
- **Two tokens that disagree name nothing.** `€23 USD` and `$1,500 JPY` answer
  with silence rather than picking a side of the contradiction.
- **No rate history in the dropdown.** One cached request must not become six
  on a keystroke; the table stays on the results page.

---

## Open decisions

Two, both John's; one blocks work that is otherwise ready to start.

**How the explorers address a thing (item 35).** Path segments carrying the
identity (`/users/john/jlpt/n1/弘`) with query strings left for view state, or
one consistent set of query params (`q`, `level`) across all three explorers.
Path segments read and cache better; query params are the smaller change and
survive a filter with no natural place in a path. Admin kanji linking waits on
the answer, because the link it should build depends on it.

**Whether the kana-only Tatoeba sentences stay (item 33).** 4,320 of the
232,731 ingested sentences contain no kanji at all - 2% of the table - and
every lookup the site has finds a sentence by a kanji, so nothing can reach
them today. They were nearly dropped on that basis. They are kept instead
because they are exactly what a kana vocabulary word (これ, どこ, ありがとう)
would need if example sentences ever reach vocabulary rather than only kanji,
and because removing them later is one re-ingest while re-adding them means
noticing they were missing. Revisit when vocabulary examples are designed, or
if the table ever needs to be smaller: the answer is a one-line filter either
way. Not blocking anything.

Everything else raised so far is either decided below, shipped, or queued in
the release order.

## Decided or resolved

**Preferences live on the account, not the WaniKani link (2026-08-30).** John
confirmed it: preferences exist outside WaniKani, because a member can arrive
with no WaniKani at all — via Google sign-up for the JLPT side of the product —
and must still have somewhere for their settings to live. Connecting or
disconnecting WaniKani never touches them. Release 5's wizard writes to the
account for the same reason.

**The viewer-fallback lockout risk is settled (2026-08-30).** The worry was that
removing the display-name fallback would lock out Emi, Aria, Mika and Jay, the
four accounts with neither a linked email nor an invite code. A read-only audit
of every user-generated table answered it: none of the four has ever used
UmaKuma — zero games, reviews, tags, libraries and signoffs since their accounts
were created on 2026-04-05. There is no access to lose, so release 1 is
unblocked on its own.

They are active WaniKani learners (three studied within the past week of the
audit) with intact encrypted tokens, so reinviting drops them into populated
accounts. John issues their invite
codes himself from the admin users page (2026-08-30), so no release carries it.

**Feature flags exist (2026-08-30).** `FeatureFlag` table plus a registry in
`src/lib/featureFlags.ts`; toggled globally from `/admin/feature-flags`. What
flags exist is defined in code — the database stores only which are on, so a
flag ships dark with its feature and flipping it is not a deploy. First flag:
`open_signup`, off. Release 6 now means building the door behind that flag and
flipping it when 7-9 have shipped, which frees the door code to merge early.

**Tests, commit, release per feature (2026-08-29).** Standing rule, recorded in
`AGENTS.md`; every feature ships with its own tests, commit and deploy.

---

### 18 — Kanji card density and controls

Reported from the grades grid, but the rules are repo-wide.

- **Bug.** `StrokeOrderButton` is absolutely positioned over the card, so a long
  kun reading runs underneath it — 外 shows `そと、ほか、はずす、ほ` with the rest
  behind the button.
- **Button density.** A control per card is noise. Show it on hover, and on
  touch where there is no hover.
- **Grid and list everywhere.** `SubjectViewModeToggle` is on three surfaces and
  missing from the grade and JLPT grids. AGENTS.md already requires both
  densities wherever subjects are listed; this is a violation, not a new idea.
- **Open the item.** Every other grid opens a modal for the item. The grades
  grid does not.
- Both of the last two want a guard test that walks the surfaces, in the style
  of `modalHeight.test.ts`, rather than a fix applied surface by surface.

### 19 — Stroke order as a shareable component

- Lift the modal so any surface can open it for any kanji.
- Layout: glyph left, controls stacked on the right at desktop width, stroke
  count in the header, credit centred beneath.
- The subject line should carry reading and meaning together, not the English
  gloss alone, while staying legible.
- A URL that opens one kanji, so it can be sent to someone.

### 20 — Updates page

- Collapse and expand by month.
- Admins reach the release admin page from it.
- Show the release codename, which is generated and currently never displayed —
  the page shows a bare version number and date.

### 21 — Map regions beyond Japan

**The library layer already exists and is unwired.** Found 2026-08-30 while
starting this: `geoRegion.ts` holds JP/US/CA datasets (47 prefectures, 51
states, 13 provinces and territories), with `geoSubjectIds.ts`,
`geoDistractors.ts` and `geoComparisons.ts` beside it, all tested. Nothing under
`src/app/` imports any of them. The game still runs on the Japan-only path:
`gameModeServer.ts` and `gameMapQuestions.ts` import `japanPrefectures`, and
`gameRunCreate.ts` counts `JAPAN_PREFECTURE_COUNT`.

So this release is wiring, not building. Do not rewrite the datasets.

**No schema change is needed for map regions.** `geoSubjectIds.ts` gives each
country its own id range and keeps Japan on the range it already has, so the
country is derivable from a question's `targetSubjectId` through
`geoRegionIdFromSubjectId`. Existing runs keep working and nothing new has to be
persisted; the lobby's country choice is a setup input, not run state.

Remaining work: carry a country through the setup request, make
`buildMapQuestions` read `GEO_DATASETS` instead of `japanPrefectures`, resolve
ids through `geoSubjectIds` in `hydrateGameQuestions`, and add the country
control to the lobby.

**The size-comparison game is separate and does need a schema change.**
`geoComparisons.ts` has the primitives (area, population, both comparators) and
no consumers. As its own game it needs a new `GameKind` enum value, which means
a hand-applied `db push` to production before it can deploy.

---

### 22 — Saved practice lists ✅ shipped (v0.133.0), renamable (v0.182.0)

Build a sheet from chosen items rather than a whole grade, and keep it: "Week
1", "Week 2". A page lists every list a member has made, each with a small
preview of the kanji it holds, so a parent can see at a glance what a week
covers. John expects this to be popular.

The tagged lists are the same shape — Trouble and Favourites are already
member-curated sets of subjects — so a saved list should be the same thing
under a different name, not a parallel implementation.

Needs persistence: a list of chosen subjects per member, which is a schema
change and a hand-applied `db push`.

**Renaming shipped in v0.182.0.** A list could be created and deleted and
nothing in between, so a typo in a name could only be fixed by deleting the
list and picking every character again. It is a `PATCH` of its own rather than
a save under a new name, because `POST` upserts on `(accountId, name)` — a
rename expressed that way would replace the contents of whichever list already
held the new name.

**Editing the contents shipped in v0.199.0.** A list was fixed at the moment it
was made, so dropping one character meant going back to an explorer, finding
the other forty, choosing them again and saving over the name — in practice
nobody edited a list, they built a second one. Every list now has an *Edit
characters* control: the characters themselves are the control (tap one to
remove it) because they are already the biggest thing on the card, and adding
is a field, since typing 水 beats finding it in a picker. Both go through
`normalizeListCharacters`, the same tidying the save path uses.

`PATCH` grew a `characters` half rather than gaining a sibling route — a
rename and a content edit are the same shape of change, addressed by id. It
assembles the update field by field, so a rename cannot empty a list and an
edit cannot rename one; the rename guard that used to assert "PATCH never
mentions characters" now asserts that instead.

Emptying a list is refused with a 400 pointing at delete: an empty named row
practises nothing and reads as a bug rather than a choice.

**Still open on this item:**

- Reordering. `characters` is stored "in the order chosen" and a sheet
  re-sorted is a different sheet, so a reorder control has somewhere to write
  to — there is just no way to do it. The editor is the obvious home for it now
  that one exists.

### 23 — Selection as a shared surface control ⏳ nearly done (v0.132.0–v0.169.0)

Shipped: `useSubjectSelection`, `SubjectSelectionToggle` / `SubjectSelectionBar`
and the `picked` practice source. Now wired on the grades explorer, the JLPT
explorer, the WaniKani level explorer, study history and the tag lists — in
both densities, with shift-click range selection (`selectionRange`) and the
shared `KanjiSelectionBar` offering save-as-list and practise.

**Done in v0.189.0**, and the shape turned out different from the plan. The
study and WaniKani explorers were never going to take `useSubjectSelection`:
they run their own bulk mode, with subject ids and operations the other two
have no use for. What was actually missing was the *destinations* - the panel
counted a selection and offered nothing to do with it. Those belong to the act
of choosing rather than to either mechanism, so they moved onto the shared bulk
panel and both explorers gained them at once.

Practice takes only the kanji, which was the real content of the note below: a
study queue holds radicals and vocabulary too, and a sheet is squares to write
kanji in. The list keeps everything; the sheet is withheld when nothing chosen
can go on one.

`SaveSelectionAsList` had to stop taking a `SubjectSelection` first - that
coupling is exactly what had kept it off the other mechanism. And
`StudyExplorerPanel` was sitting on the 500-line gate with nowhere to put
anything, which is why this stalled rather than any difficulty in the work; the
grouping filters came out unchanged.

Original note:



The point John pressed hardest: this must not be a practice-page feature.
Selecting items belongs beside the grid/list density control, on every surface
that lists subjects, so anything can be built into a list — and then a list can
be sent to a practice sheet, a quiz, or whatever comes next.

So the shared control is not "make a practice sheet"; it is "choose these",
with the destinations offered afterwards. `SubjectViewModeToggle` and the guard
test in `subjectListDensity.test.ts` are the pattern to follow, and the same
test should grow to require the selection control once it exists.

### 24b — Sheet square sizes ✅ shipped (v0.130.0)

Asked for straight after print mode: the sheet only ever offered the child's
square. Three sizes now, expressed as columns across (6 / 8 / 10) so the choice
holds at any paper size. Every sheet control now builds its link through
`sheetHref`, because each one used to concatenate its own query string and had
to remember to carry every other control's setting.

### 24 — Print mode ✅ shipped (v0.129.0)

`@page` at Letter with a 12mm margin, `print-color-adjust: exact` so the faint
tracing characters survive the printer's ink-saving, `[data-print="hide"]` on
the site footer, and a Name/Date rule that appears only on paper. Guarded by
`src/app/printSheet.test.ts`, because none of it is visible on screen.
### 25 — Practice sheet controls

Asked for after the stroke sheet shipped.

- The chooser chevron is too small to read as an affordance; enlarge it.
- Selecting the open level again should close the chooser, and there should be
  a close button at the end of the row, spaced away from the values.
- An **Options** row under the controls, with two checkboxes:
  - **Show the finished character** — whether the model occupies the first
    column. This settles the open question rather than picking a default: John
    was unsure which reads better, so it becomes the reader's choice.
  - **Show readings** — on and kun in each row's title.
- Trouble and Favourites indicators in the top right of the sheet header,
  revealed on hover, letting a member switch the sheet to either tagged list
  without leaving the page. Same treatment the glyph cards already use, which
  is the point: it is the existing control moved somewhere new, not a new one.

That last item is the first real instance of item 23, so build it as the shared
control rather than a practice-page one.

### 26 — JLPT old numbering

Offer the pre-2010 four-level scheme alongside N5-N1 in the JLPT explorer, as a
way of welcoming people who sat the old test. `jlptCertification.ts` already
holds both systems and the mapping between them; this is a view over data that
exists.

### 27 — Counts on second-level filters

The first-level chips carry counts (`G1 (80)`), the second-level chooser does
not: `G1 G2 G3` with no idea how many are in each. Applies wherever a second
level exists - school grade, JLPT level, WaniKani level.

### 28 — Pagination placement option ✅ shipped (v0.128.0)

`SurfacePagination` with a `placement` of top, bottom, both or none; the
practice sheet takes both. `AdminPaginationControls` still has its own
implementation, because it carries First/Last and a page-number jump the shared
one does not - fold it in when a second surface needs those.

### 29 — Real US and Canada map geometry

**The ticket.** Map mode supports three countries end to end - questions, ids,
distractors, board, scoring - and offers one, because the other two have no real
outlines. Ontario is a five-point pentagon. Japan averages 1,622 characters of
path per prefecture; the United States and Canada average about 40.

This is a data and pipeline job, not a feature job. Nothing in the game needs
changing.

**What has to be true when it is done**

1. `us-map.json` and `ca-map.json` hold genuine administrative boundaries,
   projected into the same coordinate space Japan uses, simplified enough to
   render at speed and detailed enough to recognise.
2. Each region carries `path`, `bbox`, `centroid` and `neighbors`. Neighbours
   matter as much as the outline: distractors are chosen from a region's own
   corner of the map, and without them the wrong answers stop being plausible.
3. A build script regenerates both from source, so a boundary change is a
   re-run rather than a hand edit.
4. `geoMapGeometry.test.ts` goes green with `playable: true` for both in
   `mapCountries.ts`.

**Sources**

- United States: us-atlas (TopoJSON, derived from the Census Bureau).
- Canada: Natural Earth admin-1, or Statistics Canada boundary files.
- Both need an equal-area or otherwise sensible projection; a raw lat/long plot
  puts Nunavut across half the canvas.

**Tooling that is not here yet**

`d3-geo` for projection, `topojson-client` for mesh and feature extraction, and
`topojson-simplify` or equivalent for reducing point counts. Adding
dependencies for a build script is cheap; they need not ship to the browser.

**Why the existing scripts cannot do it**

`build-geo-ca.mjs` has the polygons typed into it as literals.
`build-geo-jp-map.mjs` does not fetch anything either - it reads `jp-map.json`
back and rewrites the wrapper, so even Japan's geometry is vendored rather than
generated. There is no pipeline to copy; there is a pipeline to write.

**Neighbours from topology.** TopoJSON shares arcs between adjacent features,
so adjacency falls out of the format rather than needing a distance heuristic.
That is the reason to take TopoJSON rather than GeoJSON.


### 30 — Desktop page width and header crowding

Some pages run edge to edge on a desktop and others sit in a narrow column, and
the header wraps to three lines on the constrained ones. John asked for a
decision rather than a per-page patch: pick one width rule for member pages and
apply it, and give the header room to sit on one line at desktop widths.

### 31 — Consolidate preferences into Settings

Theme and Japanese font live in the account menu; Profile and Libraries live in
Settings. That is two homes for one idea, which is the thing the menu rebuild
was supposed to end. Move the preferences onto the profile page and take them
out of the menu.

### 32 — Capital cities in Map mode

Asked for while the maps were fresh: a round that names a capital and asks for
the region containing it. Every dataset already carries `capital` per region -
Japan, the United States and Canada alike - so the question is a relabelling of
the one Map already asks, not a new game.

That much is a direction alongside Read and Find rather than a new kind.

**Shipped as an answer mode**, since the prompt is the only thing that changes:
the tiles still read region names and scoring is untouched.

**The larger version needs data we do not have.** Finding a city *within* a
region means a point per city, and none of the three map files carry
coordinates for anything but region centroids. Natural Earth publishes
`populated_places` with exact points, so it is gettable - it would be another
source in the map pipeline, and worth doing only if the smaller version proves
popular.

### 34 — Own the backups, on the Synology

**Deferred until the feature work is done.** Nothing here is user-facing and
nothing is on fire; it is insurance, and it should be bought once the building
stops changing shape.

The family's data exists in exactly one place, on an account we do not own, for
a project with **no migration history** — the schema lives in
`prisma/schema.prisma` and whatever was pushed by hand, so a lost database
loses the record of its own shape as well as its contents. The standing rule
above says there is no backup routine and `pnpm db:backup` only covers the
local database. This is the item that ends that.

**It is not a cost saving, and should not be sold as one.** Neon's history
retention is point-in-time restore, not backups: six hours of changes on a
105 MB database, reported as 0 GB in the console. Copying it to a NAS saves
nothing, because it costs nothing. The 667 MB on the sumilabu project is live
table data, which a copy elsewhere does not shrink either. The reason to do
this is ownership.

**The two cover different failures and neither replaces the other.** A bad
UPDATE at 3pm noticed at 4pm is what Neon's window is for; a nightly dump
would lose the day. Neon being unreachable, or the account going wrong, is
what the dump is for, and Neon's window cannot help at all. So do not lower
retention below six hours on the strength of having a NAS copy.

**Shape:** a cron **on the Synology** running `pg_dump` against Neon —
pull, not push. It costs no Vercel invocations, the connection string never
leaves the house, and it keeps running when the app does not. Timestamped and
compressed, pruned after N days. At roughly 105 MB compressing to about 20 MB,
nightly is around 600 MB a month of egress against the 500 GB the plan
includes.

**Two things to get right.** Keep the schema in the dump, since with no
migrations it is the only full record of what production actually looks like.
And **test a restore once**, into a scratch Neon branch or a local Postgres —
an untested backup is a hope rather than a backup.

Deliberately absent from `featureTimeline.json`: it ships nothing a member
sees, and the releases page is for members.

### 35 — RESTful explorer paths (asked for, decision open)

John, 31 Aug: "JLPT explorer should have more restful endpoints/paths", then
"Same with school grade browser explorer. The urls should make sense", then the
reason: "if all our explorers (we have 3) are more restful and behave the same
for search then our search engine and linking will be easy since restful means
you can guess how to query via the path."

**The three disagree today**, which is the whole problem:

| Explorer | How it addresses a thing |
|---|---|
| Grades | `?grade=9&q=弘` |
| JLPT | `?findJlpt=弘` |
| WaniKani level | nine separate query params |

The JLPT one has a bug that falls straight out of the shape: `findJlpt`
searches only within the currently selected N-levels, so a link built from one
member's selection can land on "0 results" for another.

**Blocked on one decision, which is John's:** path segments carrying the
identity (`/users/john/jlpt/n1/弘`) with query strings left for view state, or
one consistent set of query params (`q`, `level`) across all three. Path
segments read better and cache better; query params are a smaller change and
survive a filter that has no natural place in a path.

**Half of it turned out to be done already, and half is now done.**

The *paths* were never the problem: `?tab=study`, `?tab=level` and `?tab=jlpt`
already redirect to `/study`, `/library-explorer` and `/jlpt-explorer`. Each
explorer has had a route of its own for a while.

The *search* was, and that is the half John actually asked about - "if all our
explorers behave the same for search then our search engine and linking will be
easy". There were four names for one idea: `q` on the grades explorer, and
`findLevel`, `findJlpt`, `findStudy` on the other three. The shared search bar
coped by writing all three on every submit and reading whichever matched the
surface it was on. It is `q` everywhere as of v0.190.0; the old three are still
read so existing links work, nothing writes them, and a test stops any file
spelling them again.

**Still open: filter state is not addressable.** Choosing N5 on the JLPT
explorer narrows the list and leaves the address untouched, so there is no link
that opens "N5" for somebody else. That is the remaining piece, and it is the
one that decides the original question - whether a level belongs in the path
(`/jlpt-explorer/n5`) or in the query (`?jlpt=n5`). Worth deciding when
somebody wants to send that link, not before.

Admin kanji linking wants this settled first, because the link it should build
depends on the answer.

### 36 — Controls nested inside controls ✅ shipped (v0.196.0)

428 nodes fail `nested-interactive`. `UnifiedExplorerCard` is a
`role="button"` that contains buttons — trouble, favourite, strokes — and the
selection work of the last few releases added more inside it, not fewer.

A screen reader announces the card as one control and cannot reach what is
inside it; a keyboard user tabs into a trap. This is the one to do before any
further controls go into that card, because every addition makes the eventual
fix bigger.

**Shape:** the card stops being a button. The glyph becomes the link or button,
the card becomes a plain container, and the overlay controls sit as siblings
rather than children.

**Done, and it was one component.** A sweep for `role="button"` found exactly
one outside `globals.css`, so all 428 nodes were this card drawn 428 times.
`SubjectCards` and `SubjectRows` already had the right shape — a button beside
its overlay controls inside a plain `li` — so the fix was bringing the odd one
into line rather than inventing a pattern.

The glyph is the button and carries the accessible name: the character and its
meaning, not the pills stacked around it. `glyphOverlay` moved out of the
button into a `relative` wrapper that is exactly the button's box, so the
corners the level, success rate, trouble and favourite are placed in are
unchanged and nothing moved on screen. With `activateOn="card"` the container
still takes a mouse click, through the repo's own `data-clickable="true"` hook
— an enhancement now rather than the only way in, which is why it needs no role.

Guarded by `UnifiedExplorerCard.test.tsx`, which renders both densities and
asserts no interactive element contains another. Written against the DOM rather
than the source because the defect is a containment relationship and only the
tree can be asked about it; it fails on 8 of its 10 assertions against the old
component.

### 37 — Colour contrast below the floor ✅ closed (v0.191.0)

Measured against the 4.5:1 WCAG AA floor for body text:

| What | Ratio | Nodes |
|---|---|---|
| `text-foreground/45` | 3.07:1 | 751 |
| Radical pill | 2.19:1 | — |
| Kanji pill | 2.97:1 | — |
| Vocabulary pill | 3.74:1 | — |

The subject-type colours are the brand, and darkening them changes how the
whole app looks — so this is a decision about the brand, not a bug to fix
quietly. `text-foreground/45` is the easier half: it is muted secondary text
and moving it to `/60` would clear the floor without touching the palette.

**Answered 1 Sep — "update the brand palette as needed" — and done in two
passes.** The muted text and the pill inks went first (`--*-text`, and every
`text-foreground` weight below `/60` raised), leaving the brand values pinned by
a test while the decision was still open.

That left the other half. A glyph is text too: the character itself is drawn in
the brand colour at 24px and up, where the floor is 3:1, and radical cyan
reached 2.41:1 on white — so the pill reading "RADICAL" was legible while the
水 beside it was not. **Radical is the only hue that moved** (`#10b4e8` →
`#0e9fcd`, the least that clears 3:1), the dark theme keeps the original because
on that ground it reads at 7.06:1, and kanji and vocabulary were already above
the line and are untouched. The pill ink moved a shade with it, since the tint
it sits on is mixed from the brand colour and had darkened underneath it.

`textContrast.test.ts` now pins both floors — 4.5:1 for pills and muted text,
3:1 for glyphs — in both themes.

### 38 — Security leftovers before the door opens

Found while closing the API routes (v0.178.0) and not yet done. None of these
matter while the door is shut; all of them matter the moment it opens, so they
belong to release 6 rather than to a date.

- **`feat/open-signup-door`** is built and unpushed (commits `eb459ba`,
  `8677af0`). It needs a `signup_lockdown` SiteSetting row seeded in production
  **before** the deploy, or the deploy locks out the seven existing invite
  accounts. That ordering is the whole risk in the branch.
- **`visibility = null` should be impossible.** Today a row with no visibility
  falls back to a default at read time, in more than one place. It wants a
  schema change and therefore a hand-applied `db push`.
- ~~**A reserved slug list.**~~ Shipped v0.188.0. The claim here was wrong and
  is worth correcting rather than deleting: a slug cannot shadow a route.
  Every member page lives under `/users/`, and there is no dynamic segment at
  the root, so `/users/admin` is a member page and `/admin` is the admin page
  whatever anyone is called. The real risk was impersonation - `/users/admin`
  or `/users/support` reading as the site speaking - and reserved words now
  take the numbered suffix like any collision, so nobody is turned away.
- ~~**`/api/signup` has no rate limit.**~~ Shipped v0.198.0. The note below
  was right that the ceiling was never the number of accounts - a Google
  session is required, and an address that already has one gets it back rather
  than a second. What was unbounded was the work: a settings read, an account
  lookup and a scan of every existing slug, repeatable as fast as a signed-in
  caller liked. Six per ten minutes now, keyed on the **signed-in address
  rather than the caller's IP** - a household shares one IP, and an IP budget
  would have the second person in a family locked out by the first. The check
  sits above all three reads, which a test pins by position, because a limit
  applied after them would bound the answer without bounding the work.
- **"How did you hear about us"** — asked for during onboarding design, not
  built.

### 39 — The library explorer's All-levels tab does nothing ✅ shipped (v0.197.0)

Found while repairing the smoke suite (item 22), not by a report.

On `/users/<who>/library-explorer` the level row offers `All (2,922)`.
Clicking it does nothing that lasts: the address keeps `levels=17`, the tab for
that level stays selected, and the list goes on showing the member's own level.
There is no way to browse every level from the UI at all, and the count on the
tab describes a view you cannot reach.

The explorer opens on the member's level deliberately, which is right. What is
wrong is offering a control that cannot override it.

**Where it shows up in the tests.** The smoke check comparing the all-levels
count against the filtered total could not be made to pass honestly, so it now
asserts the containment that holds either way - the global count bounds the
filtered list - and says why in a comment. When this is fixed, that test can go
back to asserting equality after clicking All.

**It was the handler, not a race.** `selectAllLevelsAndClearSearch` did
`setSelectedLevels(new Set([initialLevel]))` — it reselected the member's own
level, which was the level already showing, so nothing appeared to happen and
the address kept its single level. Nothing was putting `levels` back; it was
never changed.

Fixed by selecting every level and loading the ones not already held, in
batches of four. Not all at once: a level's snapshot is cached server-side but
a cold one goes to WaniKani, and sixty together is how an account gets rate
limited. The combined snapshot already unioned whatever was selected and the
list is windowed, so results widen as each batch lands. `buildLevelExplorerUrl`
writes the whole selection, so the long view is a linkable address — which is a
down payment on item 35.

The subtitle went with it. "Select one level at a time" was true of nothing —
Sticky has always let a member gather several — and it moved into
`LEVEL_EXPLORER_TEXT` on the way, since it was inline copy.

**The smoke test asserts the address and the widening, not the final total.**
Seventeen cold levels take longer than a smoke test should sit there; the
selection is written synchronously, and that is the part that was broken.

### 40 — The kanji page knows what the study viewer knows ✅ shipped (v0.223.0)

Every search result lands on `/kanji/[character]`, and that page knew less
about a character than the glyph viewer behind the sign-in wall: strokes,
dictionary facts and sentences, but no compounds, no radicals, no look-alikes,
no vocabulary, no mnemonics. The compounds are the reason anyone looks a kanji
up.

**The principle, in John's words.** "The JLPT or other databases should be the
root of knowledge, with WK providing other metadata or data related to the
person if they use it to study. It's the relations bonus." KANJIDIC answers for
10,384 characters, the JLPT table for 2,211 with their word examples, WaniKani
for about 2,000. Build compounds on WaniKani alone and four fifths of the pages
stay thin. The test of the layering: a page must be complete without WaniKani
and better with it.

**Blocks, not pages.** A subject page is an ordered list of blocks
(`src/app/shared/subject-page/`), each fed by one source and each rendering
nothing when it has nothing. The pure assembly is `assembleKanjiPage` in
`src/lib/subjectPageModel.ts`, tested on rows; `src/lib/subjectPage.ts` only
reads. The word and radical pages compose the same blocks. Adding a fifth
source should mean one block and one line in a list.

**Two traps, written down.** `amalgamationSubjectIds` holds kanji under a
radical and words under a kanji; the grouping in `relatedSubjects.ts` owns that
reading so no page can put a kanji behind a `/vocabulary/` address. And a
compound's word is not a link — most are not WaniKani vocabulary — while every
kanji inside it is, through `subjectHref`, the one function search results use
too.

**The member question, decided.** The page stays stateless: the same for a
member, a visitor and a link pasted into a chat, and cacheable. A member's own
SRS state and tags are a block for a later release, not a reason to make a
shareable address vary by viewer.

### 41 — The word page gets its neighbourhood

A word page lists the kanji it is written with and stops. The neighbourhood is
the other words built from those kanji. Two routes: each component kanji's JLPT
word examples (more coverage) or its WaniKani amalgamations (cleaner rows, with
levels). `relatedGroupsFor` already has the `sharesKanji` slot and its tests.
Decide which source, and say why in the commit.

### 52 — One chip for every inline kanji

John, on the map's region panel: "Confused why you used the large Kanji
blocks in the Map when I was talking about the Kanji blocks you use which
have the Toggle, through the TEXT ON button. I think it looks nice but it's
not consistent with a lot of the other new pages we created. We need to
really stick to one reusable style."

**The rule.** Two shared shapes, one question to pick between them: is the
reader *browsing a set* or *looking at a few items inside something else*?
Browsing — a level, a grade, a stroke count, a saved list — is `SubjectCards`
with the density toggle. A few items in a section — the kanji of a word, the
parts of a character, a related group, the characters of a place name — is a
row of `SubjectPill`s under the one `PillTextToggle`. The map fix
(`map-kanji-pills`) is the first instance; `subject-pill-sweep` is the pass
through every surface that draws a glyph in a bordered box its own way, or
uses the card where the pill belongs.

**The follow-up John floated.** "Maybe make both of them use the same
component, just a small version and a large version." Not now — "for now,
use the small version" — but it is the right end state: one `Subject` tile
with a `size`, so a surface cannot pick a third shape. What stands in the
way is that the card takes the explorer's slots (level pill, badge corner,
selection tick, a note under it) and the pill takes none, so a merged
component would carry every slot everywhere. Do it when a third shape turns
up despite the rule, not before.
