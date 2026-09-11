# UK-01. The ticket table takes grading, a move stamp, and hard caps

Board ticket: `cmtx0embk00009xiyf66ymntz`, shipped as 1.114.1 「りつ」律. Kind: feature. Area: admin.
Contract: `BOARD_RULES.md` invariants 6, 7, 8. Do this one first; UK-02, UK-03
and UK-04 all read the columns it adds.

## Why

Itsutsu's board can say what is worth doing and what is cheap, because every
row can carry a priority and an effort, and it can say what moved this week,
because `movedAt` changes only on a status move. UmaKuma's `Ticket` has
neither. It also has no cap in the database: the API refuses a detail over
2,000 characters, the CLI refuses nothing, and production holds a detail of
13,573 characters today.

## Before you start

1. Work in your own worktree: `pnpm worktree <name> --port <free port>` from
   the shared checkout. Never edit `/Users/john/Projects/umakuma` directly.
2. `git fetch origin && git rebase origin/main` in that worktree, then
   `pnpm exec prisma generate`.
3. Read `AGENTS.md` sections "Workflow" (the schema-change rules) and the
   backup rule. Read `prisma/schema.prisma` at `model Ticket`, and
   `src/lib/tickets.ts`, `src/lib/ticketsServer.ts`, `scripts/tasks.ts`.
4. Run `pnpm test:unit src/lib/tickets.test.ts` and confirm it is green before
   you change anything.
5. File nothing new on the board. Claim this ticket:
   `pnpm task claim <ticket-id> "<your session name>"`. From a worktree the
   board needs the production URL inline:
   `DATABASE_URL=$(grep -m1 '^DATABASE_URL=' /Users/john/Projects/umakuma/.env | cut -d= -f2- | tr -d '"') pnpm task claim …`

## Exact changes

### 1. `prisma/schema.prisma`, `model Ticket`

Add and change these lines. Keep every existing comment and the `@@map`.

```prisma
  title       String       @db.VarChar(120)
  detail      String?      @db.VarChar(4000)
  /// How much this matters and how much work it is, once somebody has judged
  /// it. Null until graded, with no default on purpose: "normal" on every row
  /// would be a judgement nobody made. Strings, not enums, for the same reason
  /// `area` and `kind` are: the allowed values live in TypeScript.
  priority    String?
  effort      String?
  requestedBy String?      @db.VarChar(60)
  claimedBy   String?      @db.VarChar(80)
  /// When the status last changed. Deliberately not @updatedAt: grading a row
  /// or fixing a typo is not movement, and the board is read as "what moved".
  movedAt     DateTime     @default(now())
```

### 2. `src/lib/tickets.ts`

Add, next to `TICKET_STATUSES`:

```ts
export const TICKET_PRIORITIES = { high: "high", normal: "normal", low: "low" } as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[keyof typeof TICKET_PRIORITIES];
export const TICKET_PRIORITY_VALUES = Object.values(TICKET_PRIORITIES);
/** Most pressing first, so a sort reads straight down it. */
export const TICKET_PRIORITY_ORDER: readonly TicketPriority[] = ["high", "normal", "low"];

export const TICKET_EFFORTS = { small: "small", medium: "medium", large: "large" } as const;
export type TicketEffort = (typeof TICKET_EFFORTS)[keyof typeof TICKET_EFFORTS];
export const TICKET_EFFORT_VALUES = Object.values(TICKET_EFFORTS);
/** Least work first, which is the order a quick win is read in. */
export const TICKET_EFFORT_ORDER: readonly TicketEffort[] = ["small", "medium", "large"];

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = { high: "High", normal: "Normal", low: "Low" };
export const TICKET_EFFORT_LABELS: Record<TicketEffort, string> = { small: "Small", medium: "Medium", large: "Large" };

export function isTicketPriority(value: unknown): value is TicketPriority { … }
export function isTicketEffort(value: unknown): value is TicketEffort { … }
```

Change `TICKET_LIMITS` to the contract's numbers:

```ts
export const TICKET_LIMITS = { titleMin: 8, title: 120, detail: 4000, requestedBy: 60, claimedBy: 80 } as const;
```

Extend the `Ticket` type and `toTicket` with `priority: TicketPriority | null`,
`effort: TicketEffort | null` and `movedAt: string` (ISO). `toTicket` narrows
an unknown stored value to `null`, the way it already does for `area`.

Add `ticketDraftProblems(draft: { title: string; detail: string | null; requestedBy: string | null }): string[]`
with exactly the messages in `BOARD_RULES.md` "Reference shapes". Add the
`byQuickWin` comparator from invariant 7 as `compareTicketsByQuickWin`.

`ticketMoveData` gains `movedAt: now` in both branches (invariant 8).

### 3. `src/lib/ticketsServer.ts`

Add `priority`, `effort`, `movedAt` to `SELECT`. Add:

```ts
export type TicketGrade = { priority?: TicketPriority | null; effort?: TicketEffort | null };
/** Writes an opinion about a row. Not a move: movedAt is untouched. */
export async function gradeTicket(id: string, grade: TicketGrade): Promise<Ticket | null>
```

It is a plain `update`, because grading is not a move and carries no claim
condition. Returns null when the row is missing.

### 4. `scripts/tasks.ts`

Only what the new columns need here; the CLI proper is UK-02. `taskLine`
(in `src/lib/ticketClaims.ts`) prints a grade column after the hold label:
`P:high E:small`, or blank when ungraded. Do not reorder the columns a reader
already scans.

### 5. Tests

In `src/lib/tickets.test.ts`:

- `ticketDraftProblems` refuses a 7-character title, a 121-character title, a
  4,001-character detail, a 61-character requester, and accepts one of each at
  the limit.
- `compareTicketsByQuickWin` orders `[high/small, high/large, normal/small,
  low/small, ungraded]` in that order whatever order they arrive in, and two
  equal grades by `movedAt` newest first.
- `ticketMoveData` writes `movedAt` for every destination.
- `toTicket` turns an unknown priority into `null`.

## Production steps, in this order

The schema change ships alone and immediately, per AGENTS.md. Do not batch
it with UK-02.

1. **Trim the four rows that would refuse the cap.** Production holds four
   details over 4,000 characters (13,573, 12,138, 4,225 and 4,160 when this
   was written; re-count first with the query below). Write a one-off script
   `scripts/tickets-trim-overflow.ts` that, for every row with
   `length(detail) > 4000`, writes the full text to
   `docs/plans/board-convergence/overflow/<id>.md` and sets `detail` to the
   first 3,900 characters plus
   `"\n\n[Trimmed to fit the board. Full text: docs/plans/board-convergence/overflow/<id>.md]"`.
   Dry run by default; `--run` writes. Commit the overflow files with the
   schema commit so nothing is lost.

   ```sql
   select id, status, length(detail) from "FeatureWish" where length(detail) > 4000 order by 3 desc;
   ```

2. Tell the other sessions you are about to change the schema (see
   `MEMORY.md` "Tell agents before DB or deploy"): one message naming the
   columns and the minute.
3. Take the release: `pnpm release:take --ticket <id> --tweak --summary "…" --romaji … --ja … --reading … --gloss …`.
   The summary is one member-facing sentence. Commit the stamp files.
4. `pnpm preflight:prod && git fetch origin && git push origin HEAD:main`, chained with `&&`.
5. **`pnpm db:backup:prod`.** Read the hostname it prints. If it fails, stop.
6. `pnpm db:backup:prod` again is not needed for the trim; run the trim script
   with `--run` now, from the worktree, with the production URL inline.
7. `pnpm db:push` from the worktree (check `pwd`; the shared checkout would
   report "already in sync" against the old schema). Prisma warns "there
   might be data loss" for every Text-to-VarChar cast whatever the data
   holds, so `--accept-data-loss` is needed here and is safe: Postgres itself
   refuses the ALTER with `P2000 value too long` if any row still exceeds a
   cap, which it did once on 2026-09-11 when the trimmed rows came out at
   4,007 characters. Measure `max(length(detail))` before and after.
8. Backfill the stamp so history is not all "now":
   `update "FeatureWish" set "movedAt" = "updatedAt";` through a tsx script
   with the production URL, once.
9. `pnpm db:drift:check` must exit 0. Then the deploy that step 4 started can
   pass its own drift gate.

## Acceptance

- [ ] `pnpm quality:check` green, including the new tests.
- [ ] `pnpm db:drift:check` exit 0 against production, run from the worktree.
- [ ] `pnpm task` (from the worktree, production URL inline) lists rows with
      the grade column, blank for every row, and nothing else changed.
- [ ] `docs/plans/board-convergence/overflow/` holds one file per trimmed row
      and each trimmed detail ends with the pointer line.
- [ ] Reply says a backup was taken and where it is.

## Do not

- Do not add a Postgres enum for priority or effort. `area` and `kind` are
  strings validated at the boundary for a reason written in the schema.
- Do not touch `featureTimeline.json` or the timeline types. Nothing here is
  about the shipped record.
- Do not lower any cap to fit existing data. Trim the data.
- Do not `db:push` before the commit is on `main`, and never from the shared
  checkout.
