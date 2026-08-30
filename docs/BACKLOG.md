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

Two rules set the order. **Privacy lands before the door opens** — deciding who
is visible after strangers can sign in is a leak with a changelog. And
**registration is built before the door opens, not after**, so the first person
through it meets a finished flow.

| # | Release | Blocked by |
|---|---|---|
| 1 | Viewer identity fix | the lockout decision below |
| 2 | Viewing presence | needs a schema push |
| 3 | Optional WaniKani connection | — |
| 4 | Display names and visibility | 3 |
| 5 | **Registration and onboarding** | 3, 4 |
| 6 | Open Google sign-up | 1, 5 |
| 7 | Standalone JLPT study | — |
| 8 | Capability gating | 3 |
| 9 | WaniKani-free game pool | — |
| 10 | Connect your WaniKani account | 8 |
| 11 | Clans and families | 4 |
| 12 | Global ranking opt-in | 4, 11 |
| 13 | JLPT level reviews | design open |
| 14-17 | Sync, backfill, Ultra enum, DRY sweep | — |

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

### 1 — Viewer identity fix

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

### 7 — Standalone JLPT study

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

### 14 — Content-based catalogue sync

The incremental sync compares WaniKani's `updated_at` against the stored value
as **text**, so microsecond and millisecond precision never match and roughly
5,000 rows are rewritten per run with identical content. Do this before 15, or
the backfill rewrites the table.

### 15 — Backfill missing catalogue subjects

64 subjects in the study queue are absent from `WkSubjectCatalog` and still fall
through to the API on every request. Related-subject coverage is already
complete at 6,950 of 6,950.

### 16 — Ultra as its own game kind

Ultra is persisted as `batchSize = -1`. It should be a `GameKind` value like
every other game, with the sentinel kept readable for historical runs.

### 17 — Shared surface primitives

Finish the 29 Aug sweep: `SurfaceCard` has 4 adopters while ~19 files hand-roll
the same panel; `LoadingState` and `PillChip` have 2 each.

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
- The game hub's last-play line names the account that played, across every
  account, using `nickname`. Correct for one private family; it must switch to
  the display name and be scoped to the viewer's group in releases 4 and 11.

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
