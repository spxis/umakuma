import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { TICKET_LIMITS } from "../src/lib/tickets";

/**
 * Brings every ticket whose detail is over the cap back under it, once.
 *
 *   pnpm dlx tsx scripts/tickets-trim-overflow.ts          report only
 *   pnpm dlx tsx scripts/tickets-trim-overflow.ts --run    write
 *
 * The cap is `@db.VarChar(4000)` on `Ticket.detail` (UK-01 in
 * docs/plans/board-convergence). Postgres refuses the schema push while a
 * row exceeds it, which is the point of a cap in the database - so the rows
 * that already do have to be trimmed first. Nothing is lost: the full text
 * goes to docs/plans/board-convergence/overflow/<id>.md, committed with the
 * schema change, and the trimmed detail ends with a line saying where.
 *
 * A production write, so `pnpm db:backup:prod` before `--run`, and the
 * production URL passed inline from a worktree.
 */
const client = new PrismaClient({ log: ["error"] });
const OUT = join(process.cwd(), "docs", "plans", "board-convergence", "overflow");
const KEEP = TICKET_LIMITS.detail - 100;
const POINTER = (id: string) => `\n\n[Trimmed to fit the board. Full text: docs/plans/board-convergence/overflow/${id}.md]`;

function target(): string {
  const url = process.env.DATABASE_URL ?? "";
  if (url.includes("127.0.0.1") || url.includes("localhost")) return "local";
  return `PRODUCTION (${/@([^/:]+)/.exec(url)?.[1] ?? "unknown"})`;
}

async function main(): Promise<void> {
  const run = process.argv.includes("--run");
  const rows = await client.ticket.findMany({ select: { id: true, title: true, status: true, detail: true } });
  const over = rows.filter((row) => (row.detail?.length ?? 0) > TICKET_LIMITS.detail);

  console.log(`${over.length} of ${rows.length} tickets over ${TICKET_LIMITS.detail} characters on ${target()}`);
  for (const row of over) console.log(`  ${row.id}  ${row.status.padEnd(11)} ${row.detail!.length}  ${row.title}`);
  if (!run) {
    console.log("\nDry run. Pass --run to write the overflow files and trim the rows.");
    return;
  }

  mkdirSync(OUT, { recursive: true });
  for (const row of over) {
    const detail = row.detail!;
    writeFileSync(
      join(OUT, `${row.id}.md`),
      `# ${row.title}\n\nTicket \`${row.id}\`, ${row.status}. The full detail as it stood before the ` +
        `${TICKET_LIMITS.detail}-character cap, moved here by scripts/tickets-trim-overflow.ts.\n\n---\n\n${detail}\n`,
    );
    await client.ticket.update({
      where: { id: row.id },
      data: { detail: detail.slice(0, KEEP).trimEnd() + POINTER(row.id) },
    });
    console.log(`  trimmed ${row.id} to ${KEEP} + pointer; full text in overflow/${row.id}.md`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => void client.$disconnect());
