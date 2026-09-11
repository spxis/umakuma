# UK-04. The admin board reads like Itsutsu's, and the four dead tabs go

Board ticket: `cmtx0epp000009xm57neoys98`, shipped as 1.115.0 「ろこつ」露骨. Kind: feature. Area: admin. Contract: invariants 3, 7.
Needs UK-01 and UK-03.

## Why

`/admin/releases` has six tabs. Four of them (In progress, Planned, Backlog,
Cancelled) read `featureTimeline.json`, which has held shipped entries only
since `pnpm task:import` moved the queue into the database. All four are
permanently empty and their counts read 0 beside a Tickets tab that lists
298 rows newest first with no search, no filter, no sort and no grading.
Itsutsu's `/backlog` has all of those, in about 400 lines, and its pure view
module is the shape to copy.

## Before you start

1. Own worktree, rebased. Start the dev server on your own port and sign in
   as an admin (memory `umakuma-screenshot-authed-pages.md` has the cookie
   mint; `umakuma-local-test-identity.md` has the local identity).
2. Read every file in `src/app/admin/releases/`, then Itsutsu's
   `src/components/backlog/BacklogBoard.tsx` and `src/lib/backlog/backlog.ts`
   (`filterItems`, `sortItems`, `tally`) in
   `/Users/john/Projects/gomoku`. You are porting the second onto the first.
3. Read `src/app/shared/FilterChip.tsx` (`FilterChipButton`,
   `filterChipTone`) and `src/app/shared/SegmentedControl.tsx`. Use them. Do
   not draw a new chip.
4. Read AGENTS.md "File Size Gate", "Types And Props Pattern", "Component
   Constants Pattern", "UI conventions". Every file stays at or under 500
   lines; copy goes in `ReleaseTimeline.constants.ts`; shared types in a
   `*.types.ts`.
5. Claim the ticket.

## Exact changes

### 1. Delete the dead tabs

In `ReleaseTimeline.constants.ts`, `RELEASE_TABS` becomes
`{ tickets: "tickets", released: "released" }`. Delete the copy only those
tabs used (`inProgressHeading`, `inProgressLegend`, `emptyInProgress`,
`backlogHeading`, `backlogLegend`, `emptyBacklog`, `cancelledHeading`,
`cancelledLegend`, `emptyCancelled`, `queueHeading`, `queueNoun*`,
`queuePosition`, `estimateNote`, `estimateLegend`, `emptyPlanned`,
`plannedHeading`). Rename `wishHeading` to `ticketsHeading` and every `wish*`
key to `ticket*`; the word "wish" was the first board's and appears nowhere a
member reads.

In `ReleaseTimelineTabs.tsx`, props become `{ shipped, tickets, initialTab }`.
Two tabs. The default tab is `tickets`. An unknown cookie value falls back to
the default; do not map old values (no back-compat here).

In `page.tsx`, drop `splitPlannedByProgress`, `sortFeaturesByRelease`,
`featuresByStatus(…backlogged)`, `featuresByStatus(…cancelled)`. The four
`Stat` boxes become: tickets waiting, in progress (by `heldNow`), released
(`totals.shipped`), and the latest version with its codename
(`APP_VERSION`, `codenameForRelease(APP_VERSION_RELEASE)`; see
`src/app/AppFooter.tsx` for the imports).

In `ReleaseTimelineList.tsx`, delete the `queue` and `showEstimateFlag` props
and the code behind them if nothing else uses them. `releaseTimelineList.test.tsx`
loses the matching cases.

Leave `src/lib/featureTimeline.ts` alone in this ticket, even though
`isInProgress` and `splitPlannedByProgress` become unused: file that as a
chore afterwards.

### 2. A pure view module, `src/app/admin/releases/ticketBoardView.ts`

Port from Itsutsu's `backlog.ts`, using UmaKuma's names:

```ts
export type TicketStatusFilter = TicketStatus | "all" | "unfinished";
export type TicketSort = "moved" | "newest" | "oldest" | "status" | "quickWins";
export type TicketBoardView = { status: TicketStatusFilter; kind: FeatureKind | "all"; area: FeatureArea | "all"; text: string; sort: TicketSort };
export const TICKET_BOARD_START: TicketBoardView = { status: "unfinished", kind: "all", area: "all", sort: "status", text: "" };
export function filterTickets(tickets, view): Ticket[]
export function sortTickets(tickets, sort): Ticket[]   // new array, never in place
export function tallyTickets(tickets): Record<TicketStatus, number>
```

`unfinished` is waiting or held now (`isWaitingTicket(status) || heldNow(t)`),
so a stale hold counts as unfinished. `"status"` order is
`in_progress` (held now), `open`/`filed`, stale holds, `shipped`, `declined`,
each newest-moved first. `"quickWins"` is `compareTicketsByQuickWin`. Text
matches title, detail and `requestedBy`, case-insensitive.

Tests in `ticketBoardView.test.ts`: each sort, each filter, the tally
counting `filed` under waiting, and that a stale hold is unfinished.

### 3. The board, `TicketBoard.tsx`, split to stay under the gate

- `TicketFilters.tsx`: the chip row (Unfinished · n, All · n, then one chip
  per status with its count, using `FilterChipButton`), a text input
  (`aria-label="Find in the board"`), a kind select, an area select, a sort
  select, and `{shown} of {total} shown`. Props are the view and a
  `onChange(part: Partial<TicketBoardView>)`.
- `TicketBoard.tsx` keeps the add form (which now shows `ticketDraftProblems`
  under the fields and disables the button while any remain, the way
  Itsutsu's `AddBacklogItem` does), holds the view in `useState`, and renders
  either a flat list or, when sort is `status` and the filter is `all` or
  `unfinished`, one group per status with a heading and count.
- `TicketRow.tsx` adds: the grade pills (only when graded; nothing for an
  ungraded row, not a placeholder), two small selects to grade
  (`priority`, `effort`, each with a blank "ungraded" option) that `PATCH`
  the row, and the hold label: `Held by X` inside the lease, `Stale · X`
  past it, computed with `heldNow`/`leaseExpired` from `ticketClaims.ts`.
  The existing move buttons and refusal line stay.

Persist nothing across reloads except the tab cookie that already exists.

### 4. Copy

All new strings go in `RELEASE_TIMELINE_COPY`. Canadian spelling. The legend
under the Tickets tab says what a status move means here in one sentence:
"A ticket is claimed before it is built and shipped by the release script,
never by hand."

## Screenshots

Before and after, at 1440 and 393 pixels wide, of the Tickets tab with the
filters open. Attach them in the closing message (memory
`show-screenshots-of-completed-work.md`). The filter row must not wrap past
two lines at 393; use `CompactFilterRow` from `src/app/shared/` if it does.

## Acceptance

- [ ] Two tabs. The cookie from the old six-tab page opens Tickets.
- [ ] Typing in the box narrows the list without a request; grading a row
      sends one `PATCH` and the pills update from the response.
- [ ] A row held 7 hours ago reads `Stale`, counts as unfinished, and offers
      Start.
- [ ] `pnpm loc:check` green with no file over 500 lines.
- [ ] `ticketBoardView.test.ts` and the existing row tests green.
- [ ] `pnpm quality:check` green. Release as a feature (default step); push
      chained.

## Do not

- Do not add a "Mark shipped" or any `shipped` destination. UK-03's schema
  refuses it and `TICKET_MOVE_TARGETS` makes it a type error.
- Do not fetch the list client-side. The page already loads every row on the
  server; filter what you have, as Itsutsu does, because the counts must be
  counted from the same list the rows come from.
- Do not keep the old tabs behind a flag "in case". The file cannot hold
  planned work any more.
