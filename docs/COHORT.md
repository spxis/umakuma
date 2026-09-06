# The simulated cohort: members who use the site so the boards are not empty

John, 2026-09-06: *"Create a script or way to test 32 users throughout my site,
to use the site like real users and go through the UG and UN paths, that way our
leaderboards will be more padded. Make it a script that we can bring more people
in later. These users need real student names, Canadian, US, and some from
Vietnam, Thailand, France, Australia. These people shouldn't stand out but need
to be real enough that they won't be detected as fake or bots."*

This is the runbook for that. The rules an agent must follow are in `AGENTS.md`
under the cohort bullet; this is how to actually run it, what it does, and what
is still open.

## The one idea

**Scores are played, not invented.** A number written straight into
`GameRun.score` or `Account.xp` proves nothing about the boards - it only proves
somebody can write to a column. So every member here is walked through the
site's own rules: lessons open `UkSrsState` rows, reviews move stages on the
shared SRS schedule, XP goes through the same caps, quests and streaks, and
games are planned by `planGameRun` and scored by `completedRunValues`. If the
scoring changes, what these members are worth changes with it.

The second idea follows from the first: **nothing is stored that can be
derived.** A member's whole personality - how often they turn up, at what hour,
how much they recall, what they play - is a pure function of their slug, and
which days they study is a pure function of their slug and the date. That is
what makes `play` safe to run on any schedule, from any machine, at any time:
a day already played comes out the same way and is never played twice.

## Commands

    pnpm cohort list                     who is there and where they stand
    pnpm cohort add 32 [--seed autumn] [--window 120]
    pnpm cohort play [--until <iso>]     carry everyone forward to now
    pnpm cohort remove                   delete every one of them

`pnpm cohort:local <command>` runs the same thing against the local container.
Against any other database the script **refuses** without `--allow-remote`,
because these accounts land on leaderboards.

A production run takes `pnpm db:backup:prod` first, like every other write - see the
backup rule in `AGENTS.md`. Say in your reply that a backup was taken and where
it is.

**Tell the other sessions before you run it.** Several agents work this
repository at once and share both the production database and the local
container. `play` over a hundred days of history is tens of thousands of
inserts; a peer watching Neon load or about to `db:push` deserves to know it is
you. `ListAgents` then `SendMessage`.

## What `add` invents

Names come from per-country pools of ordinary student names, in the proportions
of `COHORT_DEFAULT_MIX`:

| Country | Of 32 |
|---|---|
| Canada | 8 |
| United States | 8 |
| Vietnam | 5 |
| France | 4 |
| Australia | 4 |
| Thailand | 3 |

They must not stand out, which is a stronger requirement than being plausible
one at a time. Thirty-two tidy "First Last" rows is exactly what a generated
leaderboard looks like, so half go by a full name, a fifth by "Camille L.", and
the rest by a handle - `aiden_71`, `isabelle.bouchard`, `calebp`. The Canadian
pool carries the francophone and immigrant names a Canadian class actually has.
Joins are spread over the window with a lean toward recently, so nobody arrived
in a batch.

The country is the one fact a name cannot carry, so it rides in the sign-in
address: `<slug>@<cc>.umakuma.invalid`. `.invalid` is the TLD reserved for
addresses that can never resolve, which is what makes it safe - sign-in matches
a session's email against `joinedByEmail`, and an address nobody can own is an
account nobody can walk into.

## What `play` does

For each member, every session between their last recorded activity and now, in
order. A session is: the reviews that are due, up to what that member will face
in one sitting, then a batch of lessons if it is the day's first sitting, then
sometimes a game or three. Each answer settles the day the way the site does
after every answer.

Five shapes of learner, weighted the way a real sign-up page fills:

| Archetype | Turns up |
|---|---|
| daily | almost every day |
| steady | most weekdays |
| weekender | Saturdays and Sundays |
| bursty | hard, then a week off |
| drifter | now and then, and less over time |

Sessions land in the member's own evening, in their own time zone. About half
arrive already knowing some Japanese and are placed above level 1, which seeds
everything below the floor at Guru and pays the placement award once.

## The engine

`src/lib/cohort/`, seven modules, each pure except the store:

| Module | What it holds |
|---|---|
| `cohortNames.ts` | the name pools and the three name styles |
| `cohortPersona.ts` | who a member is, derived from their slug |
| `cohortDays.ts` | which days they study and when, derived from slug and date |
| `cohortStudy.ts` | lessons, reviews, placement, level |
| `cohortGames.ts` | which tile they tap and how long they took |
| `cohortLedger.ts` | their XP, in memory, under the site's own caps |
| `cohortStore.ts` | the only module that touches the database |

**The engine mirrors the server's orchestration and imports the server's
rules.** `recordUkReview`, `startUkLessons`, `awardXp` and `settleDailyXp` each
have a counterpart here that names it in a comment. The arithmetic is never
copied - `nextSrsStage`, `resolveUnLevel`, `reviewXpAwards`, `resolveStreak`,
`xpAwardValue` are the site's own functions - only the loop around them is,
because a round trip per answer over a hundred days for thirty-two members is
an hour of waiting.

So: **when one of those server functions changes, change its mirror in the same
pass.** The tests beside each module will say whether the two still agree on the
cases they hold, and they will not catch a rule nobody wrote a case for.

Writes are bulk on purpose: `createMany` for new rows, one
`UPDATE ... FROM (VALUES)` per chunk for changed ones, and a day's XP replaced
whole rather than patched.

## What is open

- **One member, Léa M. (`/le-a-m`), has no history.** Her state rows were
  deleted by hand during the first production run, so she is a clean, never
  played account. The next `pnpm cohort play --allow-remote` gives her a history
  like everybody else. Nothing else needs doing to her.
- **Nothing runs this on a schedule.** The members go stale from the day the
  last `play` finished. A daily or weekly `pnpm cohort play` is what keeps the
  boards moving, and the script was built to be run that way.
- **`clearedMap` is not passed** where the game awards want it. It needs a run's
  target ids checked against a country's full region set.

## What this is not

Not a load test, and not a way to make the site look busier than it is to
anybody outside it. It is a populated set of boards to build against and to
show the family, and every row of it says `userType = test` so it can be found,
counted, excluded or removed in one command. Nothing public reads that column;
a query that should leave these members out filters on it rather than guessing
from an email domain.
