# Board convergence: UmaKuma's half

Four tickets that bring UmaKuma's ticket board up to the contract in
`BOARD_RULES.md`, which Itsutsu (the `gomoku` repository) is being brought
up to at the same time. The two boards should behave the same, and one day
live in one service the way both sites' telemetry already lives in Sumilabu.

Each plan is written so an agent can implement it without asking: what to
read first, every file that changes, the production steps in order, the
tests, the acceptance list, and what not to do. Read the whole plan and the
contract before claiming the ticket. If a plan and the code disagree, the
code moved after the plan was written; say so in the ticket and follow the
contract.

## Order

| Ticket | Plan | Board id | Needs |
|---|---|---|---|
| UK-01 The ticket table takes grading, a move stamp, and hard caps | `UK-01-board-schema.md` | `cmtx0embk00009xiyf66ymntz` | shipped 1.114.1 |
| UK-02 `pnpm task` follows the board's rules on every command | `UK-02-cli-rules.md` | `cmtx0enh900009xk5ixegognn` and `cmtwx53ku00009xmnfx29r7b8` | shipped 1.114.2 |
| UK-03 The tickets API grades, validates, and the board gate runs in tests | `UK-03-api-and-gate.md` | `cmtx0eol700009xl3eyo5yfpp` | shipped 1.114.3 |
| UK-04 The admin board reads like Itsutsu's, and the four dead tabs go | `UK-04-admin-board.md` | `cmtx0epp000009xm57neoys98` | shipped 1.114.4 |

All four shipped on 2026-09-11. What was learned doing them, for Itsutsu's
half: a script that reads a row through the generated client fails the
moment the schema is ahead of the database, so `release:take` and the trim
script now `select` only what they read; Prisma warns of data loss on every
Text-to-VarChar cast, and Postgres is the real guard (it refused the first
push at 4,007 characters); and a release that closes two tickets needs the
release tool to take more than one, filed as `cmtx4zql200009xprjdemybbu`.

UK-02 and UK-03 can run in parallel in two worktrees once UK-01 is on
`main` and pushed to the database.

## How to work one

```
pnpm worktree <name> --port <free port>          # never the shared checkout
DATABASE_URL=$(grep -m1 '^DATABASE_URL=' /Users/john/Projects/umakuma/.env | cut -d= -f2- | tr -d '"') \
  pnpm task claim <board id> "<your session name>"
```

Build and test with the ticket claimed. Take the version immediately before
pushing, chained, per AGENTS.md:

```
pnpm release:take --ticket <board id> [--tweak] --summary "…" --romaji … --ja … --reading … --gloss … \
  && git add -A && git commit -m "…" \
  && pnpm preflight:prod && git fetch origin && git push origin HEAD:main
```

The summary is one member-facing sentence under 400 characters. The
codename's reading must start on the kana the release ordinal lands on; the
script tells you which.

## Itsutsu's half

`/Users/john/Projects/gomoku/docs/plans/board-convergence/` holds the same
contract and four tickets ITS-01 to ITS-04. The two halves do not depend on
each other. Step three, the shared service, gets its own plan once both
halves pass the gate in invariant 10.
