# Reserve the release version at take time, not at push time

Ticket `cmtpiqibm00009xdpq43sps57`, declined. The full detail as it stood before the 4000-character cap, moved here by scripts/tickets-trim-overflow.ts.

---

John, 2026-09-06, after a day of parallel sessions colliding on the counter. The version is the one claim that is not written anywhere shared until a push. Ticket.claimedBy exists precisely because 'a claim in the file is invisible to every other session until it reaches main' - the schema says so in its own comment - and the release number has exactly that problem and no equivalent fix.

WHAT HAPPENS NOW. publishedVersion() takes the higher of origin/main:package.json and the LOCAL package.json, and the local half only rises for a second take in the same worktree. One worktree per session is the rule, so two sessions that have both fetched and neither pushed compute the same minor. Nothing refuses the second until its push is rejected as behind - by which point it holds a stamped commit AND a codename that cannot simply be renumbered, because the kana follows the minor. That cost about an hour on 1.24.0 today: の to は and three rejected names.

PROPOSED SHAPE, smallest thing that works. Two columns on Ticket, not a new table: reservedVersion String? @unique, reservedAt DateTime?. The unique index IS the lock - the database refuses the second session's write, so no code has to arbitrate and it holds even when the reserving session is idle, wedged or gone. Then:
- release:take writes the reservation before it writes any file, and fails with 'X.Y.0 is held by <who> since <when>' instead of stamping.
- nextVersion reads the highest of origin/main, local package.json, and max(reservedVersion), so a reserved-but-unpushed number is visible to everybody.
- Shipping clears it (release:take already marks the ticket shipped); pnpm task release clears it; a stale hold expires the way the claim comment says claims do, so a dead session cannot block the counter forever.
- Docs-only work takes no version and so takes no reservation.

RELATION TO cmtpiep6o00009xxi4fvx5rc1. That one adds the missing duplicate-version guard to the --ticket path, which catches the collision at gate time on the second session's own machine. This catches it at take time, across sessions. They are halves of the same fix and the guard is worth having first - it is one line and needs no schema.

SHIPS ALONE. This is a prisma/schema.prisma change, so per the Workflow rules: pnpm db:backup first, push the commit to main, pnpm db:push to production within the minute, then pnpm db:drift:check exit 0. Do not batch it.

--- DECLINED 2026-09-06, and why. Read this before re-filing. ---

Not built. The cheap half of it shipped instead as 1.26.2
(take-guards-origin): `release:take` now guards the number against
origin/main's own timeline, not only the copy on disk. Before that the
guard read `loadFeatureTimeline`, which is stale the instant anybody
pushes, so it only ever refused numbers the same worktree had already
used - the one case `publishedVersion` already covered. With the origin
guard in, the window left is the seconds between a take's fetch and its
push.

Three reasons the lock itself was refused:

1. COUPLING. Reserving on Ticket cannot cover the entry-id path or a
   release shipped straight from a branch, so it would be a partial lock
   inviting trust it cannot honour. The Deploy Agent, who filed this,
   agreed and said it would want its own table keyed by version instead.

2. COST AGAINST RESIDUE. A second table, a lock lifecycle and an expiry,
   plus a production schema push with the backup/db:push/drift sequence -
   against a residue of seconds once 1.26.2 is in.

3. THE EVIDENCE WAS UNREADABLE, NOT FAVOURABLE. Counting stamps across
   all 19 worktrees found 90, of which 79 came from one worktree, and only
   4 worktrees produced any. Other sessions' worktrees are not reachable
   from here - a loss reported by another agent that same day left no
   trace I could see. So the count measured one session's own takes, which
   by construction cannot collide. This is a null result. It is NOT
   evidence that collisions are rare.

WHEN TO RE-FILE: if a collision costs real time again after 1.26.2. File
it against its own table keyed by version, never on Ticket. Point 3 means
frequency is still unmeasured, so a recurrence is the trigger rather than
an argument from first principles.
