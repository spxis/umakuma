# UmaKuma backlog

The live list of what is planned, in the order it should be built.

**Dates and feature names live in `src/data/featureTimeline.json`**, which also
feeds the admin release page at `/admin/releases`. Add a feature there, not
here, so the page and this document cannot disagree. This file carries the
reasoning the JSON has no room for: why an item exists, what it depends on, and
what has to be decided before it can start.

## Standing rules

- **One feature, one commit, one release.** No batching unrelated work.
- **Every feature ships with tests.** Unit tests for logic; a smoke spec when it
  adds a route.
- `pnpm quality:check` must pass before commit (lint, constants, LOC, unit).
- `prisma/schema.prisma` changes must be pushed to production by hand as their
  own step. There are no migrations, and nothing in the deploy applies them.
  Verify with `pnpm db:drift:check`.
- Never take a destructive action against production. It is real, in daily use,
  and there is no backup routine — `pnpm db:backup` only covers the local
  database.

---

## The release order

The spine is the identity work. Everything else hangs off where it sits
relative to "an account can exist without WaniKani".

The rule that sets the order: **privacy lands before the door opens.** Deciding
who is visible after strangers can sign in is a leak with a changelog. Releases
4 through 8 are built while the door is still shut, then release 9 opens it.

### 1 — Viewer identity fix (blocked, see Open decisions)

`resolveViewerMenuInfo` in `src/app/users/[nickname]/userPageAuth.ts` falls back
to matching a signed-in viewer's **Google display name** against an account
**nickname**, case-insensitively, including on just the first word of the name.
The account it finds supplies `wkUsername`, and `canViewUserPage` grants access
on `wkUsername`. So a Google user whose display name is "Jay" is handed the
account nicknamed "Jay".

This is live now, not only after open sign-up: `signIn` accepts any Google
account today. The API layer is not affected — `canAccessAccount` matches on
email only — so this is a page-render grant, which still means the dashboard,
history, game and libraries pages.

Blocked on the lockout question in Open decisions.

### 2 — Release timeline ✅ shipped

`/admin/releases`, admin-only, 404 for everyone else.

### 3 — Standalone JLPT study

The reason to do this early: **JLPT is the product a member without WaniKani
actually gets on day one.** `JlptKanji` is already WaniKani-free — kanji, JLPT
level, readings, meanings, stroke count, school grade, Heisig keyword, word
examples. Nothing in the table refers to WaniKani.

The coupling is in the delivery, not the data:

- `src/app/api/accounts/[id]/jlpt/route.ts` decrypts the account's WaniKani
  token and calls the API to overlay per-kanji SRS state and level. The whole
  endpoint needs a token, so a member without one gets nothing.
- The explorer lives under `/users/[nickname]/`, and every page there is gated
  on `canViewUserPage`, which requires a `wkUsername`.

Split it in two: a **content** layer that serves JLPT kanji to any signed-in
member, and a **progress overlay** that is requested separately and only when a
WaniKani connection exists. Give it a route that does not sit under
`/users/[nickname]`.

### 4 — Display names and visibility

Schema: a `displayName` shown publicly, and a visibility flag defaulting to
private. Backfill a name for all 8 existing accounts, generating a friendly one
where nobody has chosen. Names are changeable and are not a key — routes and
lookups must not start depending on them.

Set `john@spxis.com`'s account public. Every other existing account stays
private until its owner opts in.

### 5 — Optional WaniKani connection

The blocker for everything after it. `Account` today **requires** WaniKani:
`tokenEncrypted`, `tokenIv`, `tokenTag`, `wkUserId` (unique), `wkUsername` and
`wkLevel` are all non-null. There is no such thing as an account without a
token.

Split identity from the connection: an account that always exists, and at most
one WaniKani link hanging off it. Preferences belong to the account, so they
survive connecting or disconnecting WaniKani.

### 6 — Capability gating

One capability map, in the shape `GAME_KIND_RULES` already uses, deciding what a
member without a connection sees. Hide what is meaningless; disable with a
reason what is merely locked. Never present a control that fails on click.

See the capability matrix below.

### 7 — WaniKani-free game pool

`loadGamePool` builds every round from `account.assignmentCache` — the player's
own WaniKani assignments. A member without a connection gets an empty pool, so
**every game except Map is empty today**. Map is the exception because
`planMapRun` takes no `accountId` at all.

Give the pool a catalogue-backed path: draw from `WkSubjectCatalog` by level
when there is no assignment cache to draw from.

### 8 — Connect your WaniKani account

The page that explains what connecting unlocks, and walks through adding the
token. This is also where a member sees what they are currently missing, so it
depends on 6 having defined that list.

### 9 — Open Google sign-up

The flip. Signing in with Google creates an account with no WaniKani link,
instead of bouncing to `/join`. Everything above must be in place first:
1 closes the impersonation hole, 4 makes everyone private by default, 5 lets the
account exist, 6 and 7 make it worth having, 8 tells them how to upgrade.

### 10 — Clans and families

Members form their own group and compare inside it. The existing family
leaderboard becomes one clan rather than the only view.

### 11 — Global ranking opt-in

A public board every member joins deliberately. Existing members are opted out
until each one decides. This is the setting that keeps the current private
family out of public view once strangers can sign in.

### 12 — Content-based catalogue sync

The incremental sync compares WaniKani's `updated_at` against the stored
timestamp as **text**, so microsecond and millisecond precision never match and
roughly 5,000 rows are rewritten per run with identical content. Compare content
instead. Do this before 13, or the backfill rewrites the table.

### 13 — Backfill missing catalogue subjects

64 subjects in the study queue are absent from `WkSubjectCatalog` and still fall
through to the WaniKani API on every request. Related-subject coverage is
already complete at 6,950 of 6,950.

### 14 — Ultra as its own game kind

Ultra is persisted as `batchSize = -1`. It should be a `GameKind` enum value
like every other game. Keep the sentinel readable for historical runs.

### 15 — Shared surface primitives

Finish the sweep started on 29 Aug: `SurfaceCard` is used by 4 files while ~19
hand-roll the same panel; `LoadingState` and `PillChip` have 2 adopters each.

---

## What works without a WaniKani connection

The gating design in release 6 comes from this. It is drawn from what each
feature actually reads, not from where it appears in the UI.

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

`wkUsername` is a real WaniKani identity and should never appear in a public
response. Public surfaces show the display name from release 4 and nothing else.

---

## Open decisions

**Removing the viewer identity fallback may lock out 4 family members.** Of 8
accounts, 1 has a linked email and 3 have invite codes. The other 4 — Emi, Aria,
Mika and Jay — have **neither**. Their only route in may be the display-name
fallback that release 1 removes. Nothing in the stored data can tell me whether
they actually sign in that way, because a live Google session's name is not
persisted for an account that never completed a join.

Recommended: issue invite codes for those 4 first — additive, reversible, no
data loss, and `/api/accounts/[id]/invite-code` already does it — then remove the
fallback in the same release.

**Preferences and the WaniKani link.** Release 5 puts preferences on the account
so they survive connecting and disconnecting. Worth confirming that is the
intent, since "tied to the WaniKani account" could instead mean they should
follow the connection and be discarded with it.
