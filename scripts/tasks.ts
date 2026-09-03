import { PrismaClient } from "@prisma/client";

import { FEATURE_AREA_VALUES, isFeatureArea, isFeatureKind } from "../src/lib/featureTimeline";
import { TASK_LEASE_MS, claimTask, isWaiting, taskLine } from "../src/lib/ticketClaims";

/**
 * The shared task board, from a terminal.
 *
 *   pnpm task                              what is open and who holds it
 *   pnpm task add "<title>" [--detail "…"] [--area study] [--bug]
 *   pnpm task claim <id> "<who>"           check one out
 *   pnpm task release <id>                 put it back
 *   pnpm task drop <id>                    answered no, kept on the record
 *   pnpm task filed <id> <timeline-id>     it became planned work in the file
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
 * commit. `pnpm task filed` is the handoff between the two.
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
      `  pnpm task add "<title>" [--detail "…"] [--area <${FEATURE_AREA_VALUES.join("|")}>] [--bug]`,
      '  pnpm task claim <id> "<who>"',
      "  pnpm task release <id>",
      "  pnpm task drop <id>",
      "  pnpm task ship <id> <timeline-id>",
      "  pnpm task filed <id> <timeline-id>",
      "",
      "add :local to any of these to use the local database.",
    ].join("\n"),
  );
  process.exit(2);
}

/** Which database this is about to write to, said out loud before it does. */
function target(): string {
  const url = process.env.DATABASE_URL ?? "";
  if (url.includes("127.0.0.1") || url.includes("localhost")) return "local";
  const host = /@([^/:]+)/.exec(url)?.[1] ?? "unknown";
  return `PRODUCTION (${host})`;
}

async function main(): Promise<void> {
  const [command = "list", ...rest] = process.argv.slice(2);

  switch (command) {
    case "list": {
      const tasks = await client.ticket.findMany({
        where: { status: { notIn: ["declined", "shipped"] } },
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      });
      const waiting = tasks.filter((task) => isWaiting(task.status));
      const held = tasks.length - waiting.length;
      console.log(`${waiting.length} waiting · ${held} in progress · on ${target()}\n`);
      for (const task of tasks) {
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
      const kind = rest.includes("--bug") ? "bug" : "feature";
      if (!isFeatureKind(kind)) usage();
      const created = await client.ticket.create({
        data: { title, detail: flag("detail", rest) ?? null, area: area ?? null, kind, requestedBy: flag("by", rest) ?? null },
      });
      console.log(`added ${created.id} on ${target()}`);
      break;
    }

    case "claim": {
      const [id, owner] = rest;
      if (!id || !owner) usage();
      const task = await client.ticket.findUnique({ where: { id } });
      if (!task) {
        console.error(`No task ${id}.`);
        process.exit(1);
      }
      const outcome = claimTask(task, owner);
      if (!outcome.ok) {
        console.error(
          outcome.reason === "closed"
            ? `${id} is ${outcome.heldBy}; there is nothing to pick up.`
            : `${id} is held by ${outcome.heldBy}. Ask them to release it.`,
        );
        process.exit(1);
      }

      /*
       * The semaphore, and the reason this is `updateMany` rather than
       * `update`.
       *
       * Reading the row and then writing it is two round trips, and two
       * agents reading "free" at the same moment both write and both believe
       * they hold it - which is exactly the collision the board exists to
       * prevent. The condition goes into the write instead, so the database
       * decides: whoever's UPDATE matches a row wins, the other matches none
       * and is told to ask. The check above is only for the message.
       *
       * A hold nobody has renewed inside the lease is treated as free, or one
       * crashed session takes a ticket out of circulation for good.
       */
      const staleBefore = new Date(Date.now() - TASK_LEASE_MS);
      const taken = await client.ticket.updateMany({
        where: {
          id,
          status: { notIn: ["shipped", "declined"] },
          OR: [{ claimedBy: null }, { claimedBy: outcome.owner }, { claimedAt: { lt: staleBefore } }],
        },
        data: { claimedBy: outcome.owner, claimedAt: new Date(), status: "in_progress" },
      });

      if (taken.count === 0) {
        const now = await client.ticket.findUnique({ where: { id }, select: { claimedBy: true } });
        console.error(`${id} was taken by ${now?.claimedBy ?? "somebody"} a moment ago.`);
        process.exit(1);
      }
      console.log(`${id} in progress, held by ${outcome.owner} on ${target()}`);
      break;
    }

    case "release": {
      const [id] = rest;
      if (!id) usage();
      /* Back to the backlog, not to nothing: the work is still wanted. */
      await client.ticket.update({ where: { id }, data: { claimedBy: null, claimedAt: null, status: "open" } });
      console.log(`${id} released on ${target()}`);
      break;
    }

    /* Done. The file entry that records it is the one thing the queue keeps. */
    case "ship": {
      const [id, filedAs] = rest;
      if (!id || !filedAs) usage();
      await client.ticket.update({
        where: { id },
        data: { status: "shipped", filedAs, claimedBy: null, claimedAt: null },
      });
      console.log(`${id} shipped as ${filedAs} on ${target()}`);
      break;
    }

    case "drop": {
      const [id] = rest;
      if (!id) usage();
      await client.ticket.update({ where: { id }, data: { status: "declined", claimedBy: null, claimedAt: null } });
      console.log(`${id} declined on ${target()}`);
      break;
    }

    /* The handoff: the queue's row points at the file entry that replaced it. */
    case "filed": {
      const [id, filedAs] = rest;
      if (!id || !filedAs) usage();
      await client.ticket.update({ where: { id }, data: { status: "filed", filedAs, claimedBy: null, claimedAt: null } });
      console.log(`${id} filed as ${filedAs} on ${target()}`);
      break;
    }

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
