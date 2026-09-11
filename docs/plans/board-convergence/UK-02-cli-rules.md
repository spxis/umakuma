# UK-02. `pnpm task` follows the board's rules on every command

Board tickets: `cmtx0enh900009xk5ixegognn` and `cmtwx53ku00009xmnfx29r7b8`,
shipped together as 1.114.2 「るつぼ」坩堝. (The second could not be marked
shipped: `release:take` takes one ticket. See `cmtx4zql200009xprjdemybbu`.) Kind: fix.
Area: admin. Contract: invariants 1, 2, 4, 5, 6, 7. Needs UK-01's columns.

## Why

`claim` writes with `updateMany` under a condition, so the database refuses a
takeover. `release`, `ship`, `drop` and `filed` are plain
`update({ where: { id } })` with no condition and no actor, so
`pnpm task release <id>` succeeds against a live claim another session is
working, and leaves the ticket free to claim a second later. AGENTS.md says a
claim cannot be taken over; that is true of one command and false of the one
beside it. `add` also accepts a 3-character title and a 20,000-character
detail, which is how production came to hold a 13,573-character one.

## Before you start

1. Own worktree, rebased on `origin/main`, `pnpm exec prisma generate`.
2. Read `scripts/tasks.ts` end to end, `src/lib/tickets.ts` (`ticketMoveWhere`,
   `ticketMoveData`, `canMoveTicket`), `src/lib/ticketClaims.ts`
   (`claimTask`, `heldNow`, `taskLine`), and `src/lib/ticketsServer.ts`
   (`moveTicket`, the shape to mirror).
3. Read the memory `umakuma-task-add-has-no-help-flag.md`: `pnpm task add --help`
   files a real ticket. Test against the local database with `pnpm task:local`
   (`pnpm local:db:up` first, then `pnpm local:db:push`).
4. Claim both tickets.

## Exact changes, all in `scripts/tasks.ts` unless said otherwise

### 1. Every moving command takes `--by` and writes conditionally

```
pnpm task release <id> --by "<who>"      in_progress -> open
pnpm task drop <id> --by "<who>"         open | in_progress | filed -> declined
pnpm task reopen <id> --by "<who>"       declined -> open
```

`ship` and `filed` are retired (see 3). Each command:

1. Reads the row. Missing: `No task <id>.`, exit 1.
2. `from = isTicketStatus(row.status) ? row.status : "open"`.
3. `canMoveTicket(from, to)` or exit 1 with
   `<id> is <TICKET_STATUS_LABELS[from]>; it cannot go to <label> from there.`
4. `updateMany({ where: ticketMoveWhere(id, from, actor, staleBefore), data: ticketMoveData(to, actor, now) })`
   with `staleBefore = new Date(Date.now() - TASK_LEASE_MS)`.
5. `count === 0`: re-read `claimedBy`, print
   `<id> is held by <claimedBy>. Ask them to release it.`, exit 1.

`--by` is required. Missing it prints usage and exits 2. Put the shared body
in one function `move(id, to, actor)` so the three commands cannot drift.

`claim` already does this. Leave it, but make it call the same `move` with
`to = "in_progress"` so there is one writer, not two.

### 2. Grading

```
pnpm task grade <id> --priority high|normal|low|none --effort small|medium|large|none
```

At least one of the two. `none` clears. Values are checked with
`isTicketPriority` / `isTicketEffort` from `src/lib/tickets.ts`; anything else
is usage. Plain `update`, no claim condition, `movedAt` untouched (invariant
8). Prints `<id> graded P:<p> E:<e> on <target>`.

### 3. `add` validates, and takes a kind

- `ticketDraftProblems({ title, detail, requestedBy })` from UK-01 runs
  first. Any problem prints each on its own line and exits 1. Nothing is
  written.
- `--bug` stays and stores `bug`. Add `--chore`, storing `chore`. For that,
  `FEATURE_KINDS` in `src/lib/featureTimeline.ts` gains `chore: "chore"`, and
  every `Record<FeatureKind, …>` the compiler then complains about gets a
  `chore` entry (label "Chore"). Both flags is usage.
- `--by "<who>"` fills `requestedBy`, as it does today.

### 4. Retire `ship` and `filed`

Both print one line and exit 2:

```
pnpm task ship is retired: pnpm release:take --ticket <id> writes the entry and marks the ticket shipped in one pass.
pnpm task filed is retired: the timeline holds shipped work only, and a ticket is not filed anywhere else.
```

Remove their cases. Remove the `filed` line from `usage()` and the header
comment. `TICKET_STATUSES.filed` stays in `src/lib/tickets.ts` because rows
still say it; nothing writes it any more.

### 5. `list` orders by quick wins

Within the waiting rows, sort with `compareTicketsByQuickWin` (UK-01). Held
rows first, as now, then waiting by quick win, then stale. The count line and
`taskLine` are unchanged apart from UK-01's grade column.

### 6. Usage text

Rewrite `usage()` to list exactly the commands that exist after this ticket:
`list`, `add`, `claim`, `release`, `drop`, `reopen`, `grade`. Update the
header comment and the command table in `AGENTS.md` ("The queue is in the
database") to match, and the line "A claim cannot be taken over" to say it is
now true of every command.

## Tests

`scripts/` has no test runner. Keep the script thin and test the rules where
they live:

- `src/lib/tickets.test.ts`: `canMoveTicket` for every `(from, to)` pair in
  the contract's table, including that `shipped` goes nowhere and that
  `declined -> open` is allowed.
- `src/lib/tickets.test.ts`: `ticketMoveWhere` carries the three-way `OR`,
  and `ticketMoveData("in_progress", …)` sets the claim while every other
  destination clears it.
- A manual run against the local database, pasted into the ticket's closing
  message: claim as A, `release --by B` refused with the holder's name,
  `release --by A` succeeds, `grade`, `add` refused on a short title.

## Acceptance

- [ ] `pnpm task release <id> --by X` against a row held by Y exits 1 and
      names Y. Verified on the local database.
- [ ] `pnpm task drop`, `reopen`, `release` without `--by` exit 2 with usage.
- [ ] `pnpm task add "short"` writes nothing and says why.
- [ ] `pnpm task ship …` and `pnpm task filed …` exit 2 with the retirement
      line.
- [ ] `AGENTS.md` command table matches `usage()` word for word.
- [ ] `pnpm quality:check` green. Release with `--tweak`; push chained.

## Do not

- Do not make `release` require the holder. Releasing a dead session's stale
  hold is the documented recovery; the lease condition already allows it.
- Do not import `src/lib/ticketsServer.ts` from the script. It is
  `server-only`. Import the pure rules from `src/lib/tickets.ts`.
- Do not test by running commands against production. `pnpm task:local`.
