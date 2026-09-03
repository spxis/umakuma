import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { stringifyTimeline } from "../src/lib/backlogBoard";
import type { FeatureTimelineEntry } from "../src/lib/featureTimeline";

/**
 * Moves everything not yet shipped out of the file and onto the board.
 *
 *   pnpm task:import           what would move
 *   pnpm task:import --write   move it
 *
 * The two halves were doing one job badly. `featureTimeline.json` held both
 * the shipped record and the queue, so a claim was invisible until it reached
 * main and a request could be destroyed by resolving a conflict on the file -
 * which happened three times in one afternoon. The queue belongs in a place
 * every session can read at once; the shipped record belongs in the commit
 * that shipped it.
 *
 * Run once. Afterwards the file holds shipped entries only, and `pnpm task`
 * is where planned work lives.
 */
const FILE = join(process.cwd(), "src/data/featureTimeline.json");
const client = new PrismaClient({ log: ["error"] });

async function main(): Promise<void> {
  const write = process.argv.includes("--write");
  const entries = JSON.parse(readFileSync(FILE, "utf8")) as FeatureTimelineEntry[];
  const planned = entries.filter((entry) => entry.status !== "shipped");

  console.log(`${planned.length} unshipped entries in the file, ${entries.length - planned.length} shipped.\n`);
  for (const entry of planned) {
    console.log(`  ${entry.kind === "bug" ? "BUG " : "    "} ${entry.id} · ${entry.name}${entry.owner ? ` · held by ${entry.owner}` : ""}`);
  }
  if (!write) {
    console.log("\nNothing written. Add --write to move them.");
    return;
  }

  for (const entry of planned) {
    /*
     * Keyed on the timeline id in `filedAs`, so running this twice does not
     * make two of everything - the id is the one stable name each of these
     * has had since it was filed.
     */
    const existing = await client.ticket.findFirst({ where: { filedAs: entry.id } });
    if (existing) continue;
    await client.ticket.create({
      data: {
        title: entry.name,
        detail: entry.summary ?? null,
        area: entry.area ?? null,
        kind: entry.kind ?? "feature",
        status: entry.owner ? "in_progress" : "open",
        claimedBy: entry.owner ?? null,
        claimedAt: entry.owner ? new Date(entry.claimedAt ?? Date.now()) : null,
        filedAs: entry.id,
        requestedBy: "featureTimeline.json",
      },
    });
  }

  writeFileSync(FILE, stringifyTimeline(entries.filter((entry) => entry.status === "shipped")));
  console.log(`\nMoved ${planned.length}. The file now holds shipped entries only.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => void client.$disconnect());
