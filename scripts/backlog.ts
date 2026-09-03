import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaClient } from "@prisma/client";

import { addEntry, claimEntry, formatBoard, releaseEntry, stringifyTimeline } from "../src/lib/backlogBoard";
import {
  FEATURE_AREA_VALUES,
  FEATURE_KIND_VALUES,
  isFeatureArea,
  isFeatureKind,
  type FeatureTimelineEntry,
} from "../src/lib/featureTimeline";
import { TICKET_STATUSES, suggestedEntryId } from "../src/lib/tickets";

/**
 * The board, from a terminal.
 *
 *   pnpm backlog                                      what is open, and who has it
 *   pnpm backlog add <id> <area> "<name>" "<summary>" [bug]
 *   pnpm backlog claim <id> "<owner>"                 pick it up
 *   pnpm backlog release <id>                         put it down unshipped
 *   pnpm backlog wishes                               what has been asked for
 *   pnpm backlog file <ticketId> <area> [id]            a wish becomes planned work
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
      "  pnpm backlog",
      `  pnpm backlog add <id> <${FEATURE_AREA_VALUES.join("|")}> "<name>" "<summary>" [${FEATURE_KIND_VALUES.join("|")}]`,
      '  pnpm backlog claim <id> "<owner>"',
      "  pnpm backlog release <id>",
      "  pnpm backlog wishes",
      `  pnpm backlog file <ticketId> <${FEATURE_AREA_VALUES.join("|")}> [entry-id]`,
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
      case "release": {
        console.error(
          [
            `\`pnpm backlog ${command}\` is retired: planned work lives on the shared board now.`,
            "",
            "  pnpm task                    what is open and who holds it",
            '  pnpm task add "<title>" [--detail "…"] [--area <area>] [--bug]',
            '  pnpm task claim <id> "<who>"',
            "  pnpm task release <id>",
            "",
            "This file keeps the shipped record; `pnpm release:take` still writes it.",
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
          console.log(`      pnpm backlog file ${wish.id} ${wish.area ?? "<area>"}\n`);
        }
        break;
      }
      /*
       * A wish becomes real work.
       *
       * The entry is written from the wish's own words, so what John asked for is
       * what the board says, and the wish is marked filed with the id it became -
       * the two halves stay linked rather than the row being deleted.
       */
      case "file": {
        const [ticketId, areaArg, entryIdArg] = rest;
        if (!ticketId) usage();

        const wish = await prisma().ticket.findUnique({ where: { id: ticketId } });
        if (!wish) {
          console.error(`No wish "${ticketId}". Run: pnpm backlog wishes`);
          process.exit(1);
        }
        if (wish.status !== TICKET_STATUSES.open) {
          console.error(`"${ticketId}" is ${wish.status}, not open.`);
          process.exit(1);
        }

        const area = areaArg ?? wish.area ?? "";
        if (!isFeatureArea(area)) usage();
        const kind = isFeatureKind(wish.kind) ? wish.kind : "feature";
        const entryId = entryIdArg ?? suggestedEntryId(wish.title);

        save(
          addEntry(
            load(),
            {
              id: entryId,
              area,
              kind,
              name: wish.title,
              summary: `${wish.detail?.trim() || `${wish.title}.`} Wished ${dateInVancouver(wish.createdAt)}${
                wish.requestedBy ? ` by ${wish.requestedBy}` : ""
              }.`,
            },
            todayInVancouver(),
          ),
        );
        await prisma().ticket.update({
          where: { id: ticketId },
          data: { status: TICKET_STATUSES.filed, filedAs: entryId },
        });
        console.log(`filed ${ticketId} as ${entryId} (${area})`);
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

