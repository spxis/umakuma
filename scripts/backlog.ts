import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { addEntry, claimEntry, formatBoard, releaseEntry, stringifyTimeline } from "../src/lib/backlogBoard";
import { FEATURE_AREA_VALUES, FEATURE_KIND_VALUES, isFeatureArea, isFeatureKind, type FeatureTimelineEntry } from "../src/lib/featureTimeline";

/**
 * The board, from a terminal.
 *
 *   pnpm backlog                                      what is open, and who has it
 *   pnpm backlog add <id> <area> "<name>" "<summary>" [bug]
 *   pnpm backlog claim <id> "<owner>"                 pick it up
 *   pnpm backlog release <id>                         put it down unshipped
 *
 * Every request John makes goes in before the work starts; every agent claims
 * before it builds. The timeline JSON is the board; this only edits it safely -
 * a free release number, today's date, the file's own escaping - so the two
 * ways that went wrong by hand (a colliding number, a half-rewritten file)
 * cannot happen from here.
 */

const FILE = join(process.cwd(), "src/data/featureTimeline.json");

function load(): FeatureTimelineEntry[] {
  return JSON.parse(readFileSync(FILE, "utf8")) as FeatureTimelineEntry[];
}

function save(entries: FeatureTimelineEntry[]): void {
  writeFileSync(FILE, stringifyTimeline(entries));
}

function todayInVancouver(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Vancouver" }).format(new Date());
}

function usage(): never {
  console.error(
    [
      "usage:",
      "  pnpm backlog",
      `  pnpm backlog add <id> <${FEATURE_AREA_VALUES.join("|")}> "<name>" "<summary>" [${FEATURE_KIND_VALUES.join("|")}]`,
      '  pnpm backlog claim <id> "<owner>"',
      "  pnpm backlog release <id>",
    ].join("\n"),
  );
  process.exit(2);
}

const [command = "list", ...rest] = process.argv.slice(2);

switch (command) {
  case "list": {
    console.log(formatBoard(load()));
    break;
  }
  case "add": {
    const [id, area, name, summary, kind = "feature"] = rest;
    if (!id || !area || !name || !summary || !isFeatureArea(area) || !isFeatureKind(kind)) usage();
    save(addEntry(load(), { id, area, name, summary, kind }, todayInVancouver()));
    console.log(`added ${id}`);
    break;
  }
  case "claim": {
    const [id, owner] = rest;
    if (!id || !owner) usage();
    save(claimEntry(load(), id, owner, new Date().toISOString()));
    console.log(`${id} claimed by ${owner}`);
    break;
  }
  case "release": {
    const [id] = rest;
    if (!id) usage();
    save(releaseEntry(load(), id));
    console.log(`${id} released`);
    break;
  }
  default:
    usage();
}
