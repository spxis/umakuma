/**
 * The rules a shared task board runs on.
 *
 * Two things live in two places, on purpose.
 *
 * The **queue** - what has been asked for, who is doing it, what is left -
 * lives in the database. Several agents work this repository at once and
 * cannot see each other, so a claim has to be true for everybody the instant
 * it is made. In `featureTimeline.json` it is not: a claim is invisible until
 * it reaches main, and the usual way a conflict on that file gets resolved -
 * take main's copy - destroys whatever the session had just added. That
 * happened three times in one afternoon, and lost a request outright.
 *
 * The **shipped record** - version, codename, date - stays in the file. It
 * has to land in the same commit as the code it describes, or the version,
 * the codename and the entry disagree; and a running server cannot commit.
 *
 * So the board is the database until something ships, and the file forever
 * after.
 */

export const TASK_CLAIM_LIMITS = {
  /** Long enough for "Claude (session 21d00c32)" and short enough to read. */
  owner: 80,
} as const;

/**
 * Where a ticket can be.
 *
 * `filed` is the first board's word for open and is still written on old
 * rows; nothing new uses it. A Postgres enum member cannot be renamed under
 * rows that already hold it, so it stays and reads as open.
 */
export const TASK_STATUSES = {
  open: "open",
  inProgress: "in_progress",
  shipped: "shipped",
  declined: "declined",
  /** Legacy. Treated as open everywhere. */
  filed: "filed",
} as const;

export type TaskStatus = (typeof TASK_STATUSES)[keyof typeof TASK_STATUSES];

/** Work nobody has started, whichever word the row uses for it. */
export function isWaiting(status: string): boolean {
  return status === TASK_STATUSES.open || status === TASK_STATUSES.filed;
}

/** Off the board: done or answered no. */
export function isClosed(status: string): boolean {
  return status === TASK_STATUSES.shipped || status === TASK_STATUSES.declined;
}

/**
 * How long a hold lasts without being renewed.
 *
 * A claim with no expiry is a claim a crashed agent keeps for ever, and the
 * ticket it was holding is then unreachable by anybody - which is worse than
 * the double-work the claim was preventing. Six hours is longer than any
 * session here has run and short enough that a morning does not start behind
 * yesterday's ghosts.
 */
export const TASK_LEASE_MS = 6 * 60 * 60 * 1000;

/** Whether a hold has gone stale and the ticket is free again. */
export function leaseExpired(claimedAt: Date | string | null | undefined, nowMs: number = Date.now()): boolean {
  if (!claimedAt) return true;
  const held = claimedAt instanceof Date ? claimedAt.getTime() : Date.parse(claimedAt);
  return !Number.isFinite(held) || nowMs - held > TASK_LEASE_MS;
}

export type TaskClaim = { claimedBy: string | null; claimedAt?: Date | string | null };

/** Whether anybody is holding this task. */
export function isClaimed(task: TaskClaim): boolean {
  return typeof task.claimedBy === "string" && task.claimedBy.trim().length > 0;
}

export type ClaimOutcome =
  | { ok: true; owner: string }
  | { ok: false; reason: "taken"; heldBy: string }
  | { ok: false; reason: "closed"; heldBy: string };

/**
 * Who may take a task.
 *
 * A claim cannot be taken over. Two agents building the same thing is the
 * expensive failure - not two agents idle - so the second one is refused and
 * told who to ask. Re-claiming your own is allowed and does nothing, because
 * an agent that has lost track of its own work should not be punished for
 * checking.
 */
export function claimTask(
  task: TaskClaim & { status?: string },
  owner: string,
  nowMs: number = Date.now(),
): ClaimOutcome {
  const wanted = owner.trim().slice(0, TASK_CLAIM_LIMITS.owner);
  if (!wanted) return { ok: false, reason: "taken", heldBy: task.claimedBy ?? "" };
  if (task.status && isClosed(task.status)) {
    return { ok: false, reason: "closed", heldBy: task.status };
  }
  /* A hold nobody has renewed for six hours is a hold nobody is honouring. */
  const stale = leaseExpired(task.claimedAt ?? null, nowMs);
  if (isClaimed(task) && task.claimedBy !== wanted && !stale) {
    return { ok: false, reason: "taken", heldBy: task.claimedBy as string };
  }
  return { ok: true, owner: wanted };
}

/**
 * How a task reads on one line.
 *
 * The owner is the part an agent scans for, so it goes where the eye lands
 * rather than at the end of a sentence.
 */
export function taskLine(task: {
  id: string;
  title: string;
  kind: string;
  status: string;
  claimedBy: string | null;
}): string {
  const held = isClaimed(task) ? `HELD BY ${task.claimedBy}` : isWaiting(task.status) ? "WAITING" : task.status.toUpperCase();
  return `${task.id}  ${task.kind === "bug" ? "BUG " : "    "} ${held.padEnd(22)} ${task.title}`;
}
