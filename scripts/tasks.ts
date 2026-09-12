import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";

import { FEATURE_AREA_VALUES, FEATURE_KINDS, isFeatureArea } from "../src/lib/featureTimeline";
import { TASK_CLAIM_LIMITS, TASK_LEASE_MS, claimTask, heldNow, leaseExpired, taskLine } from "../src/lib/ticketClaims";
import {
  TICKET_MOVE_TARGETS,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  canMoveTicket,
  compareTicketsByQuickWin,
  isTicketEffort,
  isTicketPriority,
  isTicketStatus,
  stampReachedMain,
  ticketDraftProblems,
  ticketMoveData,
  ticketMoveWhere,
  type TicketEffort,
  type TicketMoveTarget,
  type TicketPriority,
} from "../src/lib/tickets";

/**
 * The shared task board, from a terminal.
 *
 *   pnpm task                                     what is open and who holds it
 *   pnpm task add "<title>" [--detail "…"] [--area study] [--bug|--chore] [--by "<who>"]
 *   pnpm task claim <id> "<who>"                  check one out
 *   pnpm task release <id> --by "<who>"           put it back
 *   pnpm task drop <id> --by "<who>"              answered no, kept on the record
 *   pnpm task reopen <id> --by "<who>"            a no reconsidered, or a stamp that never reached main
 *   pnpm task grade <id> [--priority high|normal|low|none] [--effort small|medium|large|none]
 *
 * Add `:local` to any of them - `pnpm task:local` - to talk to the local
 * database instead of production.
 *
 * Why a database and not the JSON board: several agents work this repository
 * at once and cannot see each other. A claim written to
 * `featureTimeline.json` is invisible until it reaches main, and the usual
 * way a conflict on that file is resolved - take main's copy - destroys
 * whatever the session had just added. That happened three times in one
 * afternoon and lost a request outright. A row is true for everybody the
 * moment it is written.
 *
 * What stays in the file: the shipped record. A release entry has to land in
 * the same commit as the code it describes, and a running server cannot
 * commit. `pnpm release:take --ticket <id>` is the handoff between the two,
 * and the only thing that marks a ticket shipped.
 *
 * Every command that moves a row names who is moving it and writes under the
 * board's own condition (`ticketMoveWhere`), so a live hold refuses everybody
 * but its holder and the database, not this script, decides who won. The
 * rules live in `src/lib/tickets.ts` and `src/lib/ticketClaims.ts`; this file
 * only reads and writes. Contract: docs/plans/board-convergence/BOARD_RULES.md.
 */

const client = new PrismaClient({ log: ["error"] });

function flag(name: string, rest: string[]): string | undefined {
  const at = rest.indexOf(`--${name}`);
  return at > -1 ? rest[at + 1] : undefined;
}

function usage(): never {
  console.error(
    [
      "usage:",
      "  pnpm task",
      `  pnpm task add "<title>" [--detail "…"] [--area <${FEATURE_AREA_VALUES.join("|")}>] [--bug|--chore] [--by "<who>"]`,
      '  pnpm task claim <id> "<who>"',
      '  pnpm task release <id> --by "<who>"',
      '  pnpm task drop <id> --by "<who>"',
      '  pnpm task reopen <id> --by "<who>"',
      "  pnpm task grade <id> [--priority high|normal|low|none] [--effort small|medium|large|none]",
      "",
      "add :local to any of these to use the local database.",
      "A ticket is shipped by pnpm release:take --ticket <id>, never from here.",
    ].join("\n"),
  );
  process.exit(2);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** Which database this is about to write to, said out loud before it does. */
function target(): string {
  const url = process.env.DATABASE_URL ?? "";
  if (url.includes("127.0.0.1") || url.includes("localhost")) return "local";
  const host = /@([^/:]+)/.exec(url)?.[1] ?? "unknown";
  return `PRODUCTION (${host})`;
}

/** The actor every moving command must name. */
function actorFrom(rest: string[]): string {
  const who = flag("by", rest)?.trim();
  if (!who) usage();
  return who.slice(0, TASK_CLAIM_LIMITS.owner);
}

/**
 * One writer for every move but `claim`: legal by the table, conditional in
 * the database, and told why when the row would not move.
 *
 * `release`, `drop` and `filed` were plain `update({ where: { id } })` here
 * while `claim` wrote under a condition - so a claim could not be taken over
 * and could be released from under its holder by anyone, which is the same
 * hole with the door left open. The condition is the lease's: a live hold
 * belongs to its holder, a lapsed one to whoever asks, which is how a dead
 * session's ticket is recovered.
 */
async function move(id: string, to: TicketMoveTarget, who: string): Promise<void> {
  const row = await client.ticket.findUnique({ where: { id }, select: { status: true } });
  if (!row) fail(`No task ${id}.`);
  const from = isTicketStatus(row.status) ? row.status : TICKET_STATUSES.open;
  if (!canMoveTicket(from, to)) {
    fail(`${id} is ${TICKET_STATUS_LABELS[from]}; it cannot go to ${TICKET_STATUS_LABELS[to]} from there.`);
  }
  const now = new Date();
  const moved = await client.ticket.updateMany({
    where: ticketMoveWhere(id, from, who, new Date(now.getTime() - TASK_LEASE_MS)),
    data: ticketMoveData(to, who, now),
  });
  if (moved.count === 0) {
    const holder = await client.ticket.findUnique({ where: { id }, select: { claimedBy: true } });
    fail(`${id} is held by ${holder?.claimedBy ?? "somebody"}. Ask them to release it.`);
  }
}

function gradeFlag<T extends string>(
  name: string,
  rest: string[],
  accept: (value: unknown) => value is T,
): T | null | undefined {
  const raw = flag(name, rest);
  if (raw === undefined) return undefined;
  if (raw === "none") return null;
  if (!accept(raw)) usage();
  return raw;
}

async function main(): Promise<void> {
  const [command = "list", ...rest] = process.argv.slice(2);

  switch (command) {
    case "list": {
      const tasks = await client.ticket.findMany({
        where: { status: { notIn: [TICKET_STATUSES.declined, TICKET_STATUSES.shipped] } },
      });
      /* Counted by the lease, not by the status column: a lapsed hold is not
         somebody working, and the tally said it was for as long as the line
         did. */
      const held = tasks.filter((task) => heldNow(task));
      const stale = tasks.filter((task) => task.claimedBy && !heldNow(task));
      const waiting = tasks
        .filter((task) => !task.claimedBy)
        .map((task) => ({ ...task, movedAt: task.movedAt.toISOString() }))
        .map((task) => ({
          ...task,
          priority: isTicketPriority(task.priority) ? task.priority : null,
          effort: isTicketEffort(task.effort) ? task.effort : null,
        }))
        .sort(compareTicketsByQuickWin);
      console.log(`${waiting.length + stale.length} waiting · ${held.length} in progress · on ${target()}\n`);
      /* What somebody holds, then what is worth picking up, then what somebody
         dropped without saying so. */
      for (const task of [...held, ...waiting, ...stale]) {
        console.log(taskLine(task));
        if (task.detail) console.log(`        ${task.detail.replace(/\n/g, "\n        ")}`);
        if (task.filedAs) console.log(`        filed as ${task.filedAs}`);
      }
      if (tasks.length === 0) console.log("Nothing on the board.");
      break;
    }

    case "add": {
      const [title] = rest;
      if (!title) usage();
      const area = flag("area", rest);
      if (area !== undefined && !isFeatureArea(area)) usage();
      if (rest.includes("--bug") && rest.includes("--chore")) usage();
      const kind = rest.includes("--bug") ? FEATURE_KINDS.bug : rest.includes("--chore") ? FEATURE_KINDS.chore : FEATURE_KINDS.feature;
      const detail = flag("detail", rest) ?? null;
      const requestedBy = flag("by", rest) ?? null;
      /* The same gate the form and the route ask, so a three-character title
         or a twenty-thousand-character detail is refused here too - the
         database now refuses the second, and this says why first. */
      const problems = ticketDraftProblems({ title, detail, requestedBy });
      if (problems.length > 0) fail(problems.join("\n"));
      const created = await client.ticket.create({
        data: { title: title.trim(), detail, area: area ?? null, kind, requestedBy },
        select: { id: true },
      });
      console.log(`added ${created.id} on ${target()}`);
      break;
    }

    case "claim": {
      const [id, owner] = rest;
      if (!id || !owner) usage();
      const task = await client.ticket.findUnique({
        where: { id },
        select: { status: true, claimedBy: true, claimedAt: true },
      });
      if (!task) fail(`No task ${id}.`);
      const outcome = claimTask(task, owner);
      if (!outcome.ok) {
        fail(
          outcome.reason === "closed"
            ? `${id} is ${outcome.heldBy}; there is nothing to pick up.`
            : `${id} is held by ${outcome.heldBy}. Ask them to release it.`,
        );
      }
      /* Re-claiming your own live hold is allowed and does nothing - not even
         renew it, so a lapsed one is still what it was. */
      if (task.status === TICKET_STATUSES.inProgress && task.claimedBy === outcome.owner && !leaseExpired(task.claimedAt)) {
        console.log(`${id} already held by ${outcome.owner}.`);
        break;
      }

      /*
       * The semaphore, and the reason this is `updateMany` rather than
       * `update`. Reading the row and then writing it is two round trips, and
       * two agents reading "free" at the same moment both write and both
       * believe they hold it. The condition goes into the write instead, so
       * the database decides: whoever's UPDATE matches a row wins, the other
       * matches none and is told to ask. The check above is only for the
       * message. `claim` cannot go through `move`, because the table has no
       * in_progress -> in_progress row and taking over a lapsed hold is one.
       */
      const now = new Date();
      const taken = await client.ticket.updateMany({
        where: {
          id,
          status: { notIn: [TICKET_STATUSES.shipped, TICKET_STATUSES.declined] },
          OR: [{ claimedBy: null }, { claimedBy: outcome.owner }, { claimedAt: { lt: new Date(now.getTime() - TASK_LEASE_MS) } }],
        },
        data: ticketMoveData(TICKET_MOVE_TARGETS.inProgress, outcome.owner, now),
      });
      if (taken.count === 0) {
        const holder = await client.ticket.findUnique({ where: { id }, select: { claimedBy: true } });
        fail(`${id} was taken by ${holder?.claimedBy ?? "somebody"} a moment ago.`);
      }
      console.log(`${id} in progress, held by ${outcome.owner} on ${target()}`);
      break;
    }

    case "release": {
      const [id] = rest;
      if (!id) usage();
      /* Back to the backlog, not to nothing: the work is still wanted. */
      await move(id, TICKET_MOVE_TARGETS.open, actorFrom(rest));
      console.log(`${id} released on ${target()}`);
      break;
    }

    case "drop": {
      const [id] = rest;
      if (!id) usage();
      await move(id, TICKET_MOVE_TARGETS.declined, actorFrom(rest));
      console.log(`${id} declined on ${target()}`);
      break;
    }

    case "reopen": {
      const [id] = rest;
      if (!id) usage();
      const who = actorFrom(rest);
      const row = await client.ticket.findUnique({ where: { id }, select: { status: true, filedAs: true } });
      if (!row) fail(`No task ${id}.`);
      /*
       * Shipped is terminal in the move table, and stays so. The one way back
       * is a stamp that never landed: release:take marks the ticket shipped
       * before preflight and the push, so a chain stopped in between leaves a
       * Shipped ticket under a version origin/main has never seen. Asked of
       * origin/main, fetched first, never of the local file that was stamped.
       */
      if (row.status === TICKET_STATUSES.shipped) {
        execFileSync("git", ["fetch", "origin", "--quiet"], { stdio: "inherit" });
        const raw = execFileSync("git", ["show", "origin/main:src/data/featureTimeline.json"], { encoding: "utf8" });
        const published = JSON.parse(raw) as { id: string; version?: string }[];
        if (stampReachedMain(row.filedAs, published)) {
          fail(`${id} shipped as ${row.filedAs}, which is on main. A shipped ticket does not reopen; file a new one.`);
        }
        const now = new Date();
        const reopened = await client.ticket.updateMany({
          where: { id, status: TICKET_STATUSES.shipped },
          data: { ...ticketMoveData(TICKET_MOVE_TARGETS.open, who, now) },
        });
        if (reopened.count === 0) fail(`${id} changed under you; run pnpm task and look again.`);
        console.log(`${id} reopened on ${target()}: its stamp ${row.filedAs ?? "(none)"} never reached main.`);
        break;
      }
      await move(id, TICKET_MOVE_TARGETS.open, who);
      console.log(`${id} reopened on ${target()}`);
      break;
    }

    /* An opinion, not a move: no claim condition, and movedAt stays put. */
    case "grade": {
      const [id] = rest;
      if (!id) usage();
      const priority = gradeFlag<TicketPriority>("priority", rest, isTicketPriority);
      const effort = gradeFlag<TicketEffort>("effort", rest, isTicketEffort);
      if (priority === undefined && effort === undefined) usage();
      const data = { ...(priority !== undefined ? { priority } : {}), ...(effort !== undefined ? { effort } : {}) };
      const graded = await client.ticket.updateMany({ where: { id }, data });
      if (graded.count === 0) fail(`No task ${id}.`);
      console.log(`${id} graded P:${priority === undefined ? "as was" : priority ?? "none"} E:${effort === undefined ? "as was" : effort ?? "none"} on ${target()}`);
      break;
    }

    case "ship":
      fail("pnpm task ship is retired: pnpm release:take --ticket <id> writes the entry and marks the ticket shipped in one pass.");
      break;

    case "filed":
      fail("pnpm task filed is retired: the timeline holds shipped work only, and a ticket is not filed anywhere else.");
      break;

    default:
      usage();
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => void client.$disconnect());
