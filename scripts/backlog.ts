import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaClient } from "@prisma/client";

import { addEntry, claimEntry, formatBoard, releaseEntry, stringifyTimeline } from "../src/lib/backlogBoard";
import { isFeatureArea, isFeatureKind, type FeatureTimelineEntry } from "../src/lib/featureTimeline";
import { TICKET_STATUSES } from "../src/lib/tickets";

/**
 * The board, from a terminal.
 *
 *   pnpm backlog                                      what is open, and who has it
 *   pnpm backlog wishes                               what has been asked for
 *
 * `add`, `claim`, `release` and `file` are retired and exit non-zero naming
 * the replacement: planned work lives on the board, and this file keeps only
 * what has shipped.
 *
 * Every request John makes goes in before the work starts; every agent claims
 * before it builds. The timeline JSON is the board; this only edits it safely -
 * a free release number, today's date, the file's own escaping - so the two
 * ways that went wrong by hand (a colliding number, a half-rewritten file)
 * cannot happen from here.
 *
 * Wishes are the one part that is not in the file. John can type one into the
 * admin page, which has no way to commit; `file` is the step that moves it
 * across, and it is a commit like any other entry.
 */

const FILE = join(process.cwd(), "src/data/featureTimeline.json");

function load(): FeatureTimelineEntry[] {
  return JSON.parse(readFileSync(FILE, "utf8")) as FeatureTimelineEntry[];
}

function save(entries: FeatureTimelineEntry[]): void {
  writeFileSync(FILE, stringifyTimeline(entries));
}

function todayInVancouver(): string {
  return dateInVancouver(new Date());
}

/*
 * Every date this script writes is a Vancouver calendar day, so a wish typed
 * at 7pm on the 2nd is not recorded as the 3rd because UTC had rolled over.
 */
function dateInVancouver(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Vancouver" }).format(instant);
}

/*
 * Connected only if something asks. Most of what this script does is file
 * work, and an agent reading the board should not need a database for it.
 * Held on an object so the narrowing survives to the disconnect at the end.
 */
const db: { client: PrismaClient | null } = { client: null };

function prisma(): PrismaClient {
  db.client ??= new PrismaClient({ log: ["error"] });
  return db.client;
}

/**
 * How many wishes are waiting, for the summary line.
 *
 * Never fatal: the board is read constantly and by agents that may have no
 * database reachable, and a wish count is not worth failing that over.
 */
async function openWishCount(): Promise<number> {
  try {
    return await Promise.race([
      prisma().ticket.count({ where: { status: TICKET_STATUSES.open } }),
      new Promise<number>((resolve) => setTimeout(() => resolve(0), 2000)),
    ]);
  } catch {
    return 0;
  }
}

function usage(): never {
  console.error(
    [
      "usage:",
      "  pnpm backlog                what has shipped, from the file",
      "  pnpm backlog wishes         what has been asked for, from the board",
      "",
      "add, claim, release and file are retired - planned work lives on the",
      "board. Use `pnpm task` for those, and `pnpm release:take --ticket` to",
      "ship one.",
    ].join("\n"),
  );
  process.exit(2);
}

/*
 * Wrapped rather than top-level: this file is compiled to CommonJS by tsx, so
 * a top-level await typechecks and then fails to run. The wish commands are
 * the first ones here that need one.
 */
async function main(): Promise<void> {
  try {
  const [command = "list", ...rest] = process.argv.slice(2);

    switch (command) {
      case "list": {
        console.log(formatBoard(load(), await openWishCount()));
        break;
      }
      /*
       * The queue moved to the database on 2026-09-03; this file now records
       * what has shipped. Adding or claiming here would write a row no other
       * session can see until it reaches main - which is the failure the move
       * was for - so both point at the board instead of doing it quietly.
       */
      case "add":
      case "claim":
      case "release":
      /*
       * `file` was the one left running, and it was the dangerous one.
       *
       * It wrote a `planned` entry into the JSON and marked the ticket filed,
       * which looks like progress and is not: release ordinals are counted as
       * the entries that carry a version, and a planned entry carries none -
       * so the row was invisible on /admin/releases rather than merely early,
       * and the ticket had left the board. A documented command that succeeds
       * and leaves the wrong state is worse than one that fails.
       *
       * A wish becomes work by becoming a claimed ticket, and reaches this
       * file when it ships, through `pnpm release:take --ticket`.
       */
      case "file": {
        console.error(
          [
            `\`pnpm backlog ${command}\` is retired: planned work lives on the shared board now.`,
            "",
            "  pnpm task                    what is open and who holds it",
            '  pnpm task add "<title>" [--detail "…"] [--area <area>] [--bug]',
            '  pnpm task claim <id> "<who>"',
            "  pnpm task release <id>",
            "",
            "When it ships, `pnpm release:take --ticket <id> --summary \"…\"` writes",
            "the entry and marks the ticket shipped in one pass.",
            "",
            "This file keeps the shipped record, and nothing else.",
          ].join("\n"),
        );
        process.exit(2);
      }
      case "add-legacy": {
        const [id, area, name, summary, kind = "feature"] = rest;
        if (!id || !area || !name || !summary || !isFeatureArea(area) || !isFeatureKind(kind)) usage();
        save(addEntry(load(), { id, area, name, summary, kind }, todayInVancouver()));
        console.log(`added ${id}`);
        break;
      }
      case "claim-legacy": {
        const [id, owner] = rest;
        if (!id || !owner) usage();
        save(claimEntry(load(), id, owner, new Date().toISOString()));
        console.log(`${id} claimed by ${owner}`);
        break;
      }
      case "release-legacy": {
        const [id] = rest;
        if (!id) usage();
        save(releaseEntry(load(), id));
        console.log(`${id} released`);
        break;
      }
      case "wishes": {
        const wishes = await prisma().ticket.findMany({
          where: { status: TICKET_STATUSES.open },
          orderBy: { createdAt: "asc" },
        });
        if (wishes.length === 0) {
          console.log("No wishes waiting.");
          break;
        }
        console.log(`${wishes.length} waiting\n`);
        for (const wish of wishes) {
          console.log(`${wish.id}  ${wish.kind === "bug" ? "BUG " : "    "} ${wish.title}`);
          console.log(`      area: ${wish.area ?? "unset"} · asked by ${wish.requestedBy ?? "unknown"}`);
          if (wish.detail) console.log(`      ${wish.detail.replace(/\n/g, "\n      ")}`);
          /* The command that actually moves it on. This printed `pnpm backlog
             file …` for months, so the listing taught the retired flow to
             every agent that read it. */
          console.log(`      pnpm task claim ${wish.id} "<who>"\n`);
        }
        break;
      }
      default:
          usage();
      }
  } finally {
    await db.client?.$disconnect();
  }
}

void main();

