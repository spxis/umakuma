# Ladders are a registry, not a pair: adding or removing one should just work

Ticket `cmtqgetbf00009xv45we6t13l`, declined. The full detail as it stood before the 4000-character cap, moved here by scripts/tickets-trim-overflow.ts.

---

John, 2026-09-06: 'I want you to make sure you build the system so that we can bring in new systems or remove old ones and there is a clear way things will Just Work. Design it correctly and it will.'

THE PROBLEM, stated as what a third ladder costs today. A stream is a COLUMN, not a row.
  Account: unLevel, unLevelFloor, unLevelUpdatedAt, ugLevel, ugLevelFloor, ugLevelUpdatedAt - three columns per ladder.
  UkSubject: one , and it is UN's. UG's placement is not in the database at all; it lives in src/data/gradeLadder.json and is resolved per request.
  Code: resolveUnLevel, syncAccountUnLevel, unLevelBadge, ugLevelBadge, deriveUnLevel - named for a ladder rather than taking one.
So adding UG-like ladder number three means three more Account columns, another subject-level home, another resolver, another badge function, and edits in every query that selects a level. That is the definition of not just working. NOTE the trap: 'add UkSubject.ugLevel' is the same mistake one level down and was very nearly done on 2026-09-06.

THE SHAPE THAT WORKS. A ladder becomes data, and levels become rows.

1. A LADDER REGISTRY, one entry per ladder, in code. Each declares: id (UN/UG/...), display name, badge prefix, the built JSON it comes from, its level count, its milestones and any gates (UN has the JLPT finals; UG has the school-year completions), and its one-line description. Everything that varies per ladder lives here and nowhere else.

2. LEVELS BECOME ROWS.
   UkSubjectLevel(subjectId, stream, level) - where a subject sits on each ladder. Adding a ladder adds rows, not columns. Both ladders are already built in ONE pass by build-kanji-ladder.mjs specifically so they cannot drift, and ladder:seed currently copies only half of that into the database.
   AccountLadderStanding(accountId, stream, level, floor, updatedAt) - a member's standing on each ladder. Replaces the six Account columns.
   Account.ladderStream stays: which one this member follows.

3. ONE RESOLVER, ONE SYNC, ONE RELEVEL. resolveUnLevel is ALREADY generic - it takes rows, totals, floor and maxLevel and walks up while each level clears; only the JLPT gate check is UN-specific and becomes a parameter from the registry. So: resolveLadderLevel(ladder, ...), syncAccountLevels(accountId) writing one standing per registered ladder, and undefined
 ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "ladder:relevel" not found

Did you mean "pnpm ladder:rules"? looping the registry across every account.

4. EVERYTHING DOWNSTREAM ITERATES THE REGISTRY - badges, the /ladder boards, the curriculum stamp, the level picker, the header. None of them names UN or UG.

WHAT THIS ALSO FIXES, and it is live today: nothing recomputes anybody's level after a rebalance. ladder:refresh rebuilds the JSON, ladder:seed moves UkSubject.level, and syncAccountUnLevel only ever runs when a member answers a review. UN 2.0.0 moved 95 kanji, so every member who has not reviewed since is carrying a level computed against 1.0.0 - on their profile, in the header badge and on the new /ladder boards. The rebalance runbook becomes refresh -> seed -> relevel.

THE PROOF IT IS RIGHT: build UG THROUGH the registry rather than beside it. If UG needs no bespoke code, the design holds. Account.ugLevel is currently a column nothing writes, so /ladder/ug ranks all 15 UG members at level 1.

ONE DECISION FOR JOHN, because it is the difference between 'just works' and 'nearly':
  LadderStream is a Prisma enum (UN, UG). With an enum, adding a ladder is still one enum value plus a db:push - small, but a schema change. With a String validated against the registry, adding a ladder needs no schema change at all, but the database stops enforcing the values. AGENTS.md names persisted database values as the one place backward compatibility matters, which argues for keeping the enum. Recommend: keep the enum, accept that a new ladder costs one enum value, and make everything else registry-driven.

SHIPPING: the two tables are a schema change and ship alone, with db:push straight after landing. Migrate the six Account columns in the same pass and drop them once the standings table is written.
