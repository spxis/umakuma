# UK-03. The tickets API grades, validates, and the board gate runs in tests

Board ticket: _README_. Kind: feature. Area: admin. Contract: invariants 1, 5,
6, 10. Needs UK-01. UK-04 needs this.

## Why

The admin page will need to grade a row (UK-04), and the only write path the
site has is `PATCH /api/admin/tickets/[ticketId]`, which accepts a status and
nothing else. `POST` accepts a 1-character title. And nothing in the test
suite asserts that the move table is whole: a status nothing leads to, or a
label missing for a new value, would ship green.

## Before you start

1. Own worktree, rebased, `prisma generate`.
2. Read `src/app/api/admin/tickets/route.ts`, `…/[ticketId]/route.ts`,
   `src/lib/ticketsServer.ts`, `src/lib/apiRateLimit.ts` (`checkRateLimit`,
   `createRateLimitResponse`), and how `src/app/api/invites/route.ts` or any
   other admin route already applies the limiter. Copy that pattern; do not
   invent a second one.
3. Read `src/app/admin/releases/ticketRow.test.tsx` for how a route is
   exercised in jsdom here.
4. Claim the ticket.

## Exact changes

### 1. `PATCH /api/admin/tickets/[ticketId]` takes a partial body

```ts
const patchSchema = z
  .object({
    status: z.enum(TICKET_MOVE_TARGET_VALUES as [string, ...string[]]).optional(),
    priority: z.enum(TICKET_PRIORITY_VALUES as [string, ...string[]]).nullable().optional(),
    effort: z.enum(TICKET_EFFORT_VALUES as [string, ...string[]]).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0);
```

Order of work, copied from Itsutsu's route because it was got wrong there
first: the move first, and only once; then the grade; a refused move returns
before any grade is written, so a body carrying both leaves the row exactly
where it was. `null` for a grade means ungrade; omitted means untouched.

Responses stay as they are: 404 missing, 409 illegal or held with the reason,
200 `{ wish }` with the row as it now stands.

### 2. `POST /api/admin/tickets` validates through the contract

Replace the Zod `.min(1)` with `ticketDraftProblems` from UK-01 after
parsing. Problems return 422 `{ error: problems[0], problems }`. The Zod
schema keeps `max` on each field so a 1 MB body is refused before it is
read as a draft. Accept `kind` of `chore` (the enum reads
`FEATURE_KIND_VALUES`, so UK-02's change covers it).

### 3. Rate limit both routes

Use `checkRateLimit` from `src/lib/apiRateLimit.ts` with a key of
`admin-tickets` and whatever window the other admin write routes use. An
admin session is one person; the limiter is there for a script in a loop.

### 4. The board gate, `src/lib/ticketsGate.test.ts`

One file, named so the next reader finds it. It asserts, against the real
constants and nothing mocked:

- Every status in `TICKET_STATUS_VALUES` except `shipped` has at least one
  entry in `TICKET_MOVES`; `TICKET_MOVES.shipped` is `[]`.
- Every status except `shipped` appears as a destination somewhere.
  `shipped` appears nowhere, and `TICKET_MOVE_TARGET_VALUES` does not include
  it.
- `TICKET_STATUS_LABELS`, `TICKET_PRIORITY_LABELS`, `TICKET_EFFORT_LABELS`
  and the kind labels each have a non-empty string for every value.
- `TICKET_LIMITS` equals `{ titleMin: 8, title: 120, detail: 4000, requestedBy: 60, claimedBy: 80 }`.
- `TASK_LEASE_MS === 6 * 60 * 60 * 1000`.

If any of these fail after a later change, the contract in
`docs/plans/board-convergence/BOARD_RULES.md` changed or the code did, and the
test names which.

### 5. Route tests

Extend `ticketRow.test.tsx` or add `src/app/api/admin/tickets/route.test.ts`
(jsdom, mocking `isAuthorizedAdmin` and `ticketsServer`) to cover: grade
only, move only, both with an illegal move (nothing graded), empty body 400,
short title 422 with `problems`.

## Acceptance

- [ ] `curl -X PATCH … -d '{"priority":"high"}'` on a shipped row grades it
      without moving it. `-d '{"status":"open","effort":"small"}'` on a
      shipped row returns 409 and the effort is unchanged.
- [ ] `POST` with a 5-character title returns 422 with `problems`.
- [ ] `ticketsGate.test.ts` is green and fails if you add a status to
      `TICKET_STATUSES` without a move and a label (try it, then revert).
- [ ] `pnpm quality:check` green. Release with `--tweak`; push chained.

## Do not

- Do not add a `DELETE`. A board that forgets is asked twice.
- Do not accept `shipped` in the PATCH schema, whatever the UI needs.
- Do not change the 401 the admin APIs return; every admin route here
  answers 401, and one route answering 404 would be the odd one.
