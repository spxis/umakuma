import { decryptToken } from "../src/lib/crypto";
import { prisma } from "../src/lib/prisma";
import { findCatalogGap } from "../src/lib/wanikani/catalogGap";
import { pickTokenAccount } from "../src/lib/wanikani/catalogToken";
import { parseSubjectRow } from "../src/lib/wanikani/catalogSync.helpers";
import type { SubjectUpsertRow } from "../src/lib/wanikani/catalogSync.types";
import { fetchWaniKani } from "../src/lib/wanikani/http";
import type { WaniKaniCollectionResponse } from "../src/lib/wanikani/types";

/**
 * Fill the holes in `WkSubjectCatalog`, and nothing else.
 *
 * The catalogue is where subject content comes from; anything absent from it
 * falls through to the WaniKani API on every request that wants it, which is
 * the whole cost the catalogue exists to avoid. The incremental sync can be
 * interrupted - one was, on 2026-08-30, and its resume path is still on the
 * state row - and a resumed run continues from its cursor rather than going
 * back for what it skipped. So the holes stay holes.
 *
 * **This inserts and never updates.** Every id it writes was established as
 * absent moments before, and the write is `createMany({ skipDuplicates: true })`,
 * so a row that exists is left exactly as it is even if the fetch disagrees
 * with it. Correcting stale content is the sync's job and it has content
 * comparison for exactly that; conflating the two here would make a backfill
 * capable of overwriting good data, which is not a thing it should be able to
 * do to a database in daily use.
 *
 * Dry run by default. `--apply` writes.
 *
 *   pnpm db:backfill:wk-catalog          # report the gap, write nothing
 *   pnpm db:backfill:wk-catalog --apply  # fetch and insert
 *
 * **It cannot be rehearsed under the offline mock.** `local-db.mjs` sets
 * `WANIKANI_MOCK=1`, and the mock answers `/subjects?ids=` out of
 * `WkSubjectCatalog` - the very table with the hole in it - so every id this
 * script asks for comes back "not served" and it inserts nothing. That is the
 * mock behaving correctly, not a failure: a run against the local database
 * still exercises the gap measurement and the insert path, and the fetch has
 * to be checked with a dry run against the real API.
 */

/** WaniKani takes up to 1000 ids on a filter; well under it keeps URLs sane. */
const IDS_PER_REQUEST = 100;

const DEFAULT_ACCOUNT_MATCH = "john";

type Args = {
  apply: boolean;
  tokenFromArg: string | null;
  accountLike: string;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const valueOf = (prefix: string) =>
    args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;

  return {
    apply: args.includes("--apply"),
    tokenFromArg: valueOf("--token="),
    accountLike: valueOf("--account-like=") ?? DEFAULT_ACCOUNT_MATCH,
  };
}

/**
 * A token to read subjects with.
 *
 * Subjects are the same for everybody, so any working token will do; the
 * account fallback exists so this runs without one being exported to the
 * environment first.
 */
async function resolveToken(args: Args): Promise<{ token: string; source: string } | null> {
  if (args.tokenFromArg) {
    return { token: args.tokenFromArg, source: "cli" };
  }

  const envToken = process.env.WK_CATALOG_API_TOKEN ?? process.env.WANIKANI_API_TOKEN ?? null;
  if (envToken) {
    return { token: envToken, source: "env" };
  }

  const accounts = await prisma.account.findMany({
    orderBy: [{ updatedAt: "desc" }],
    select: {
      nickname: true,
      joinedByEmail: true,
      wkUsername: true,
      tokenEncrypted: true,
      tokenIv: true,
      tokenTag: true,
    },
  });

  const choice = pickTokenAccount(accounts, args.accountLike);
  if (!choice) return null;

  const { account, named } = choice;
  return {
    token: decryptToken({
      encrypted: account.tokenEncrypted!,
      iv: account.tokenIv!,
      tag: account.tokenTag!,
    }),
    source: named ? `account-like:${args.accountLike}` : "most recently updated connected account",
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}

async function backfillMissingCatalogSubjects() {
  const args = parseArgs();
  const mode = args.apply ? "apply" : "dry-run";

  const gap = await findCatalogGap();
  console.log(`[${mode}] catalogue holds ${gap.held.length} subjects`);
  console.log(`[${mode}] the app can ask for ${gap.wanted.length}`);
  console.log(`[${mode}] missing ${gap.missing.length}`);

  if (gap.missing.length === 0) {
    console.log("Nothing to backfill.");
    return;
  }

  console.log(`[${mode}] ids: ${gap.missing.join(",")}`);

  const tokenResult = await resolveToken(args);
  if (!tokenResult) {
    throw new Error(
      `Missing token. Set WK_CATALOG_API_TOKEN/WANIKANI_API_TOKEN, pass --token, or ensure a matching account exists for --account-like=${args.accountLike}.`,
    );
  }
  console.log(`[${mode}] token source: ${tokenResult.source}`);

  const rows: SubjectUpsertRow[] = [];
  /*
   * Reported rather than thrown on. A subject WaniKani no longer serves, or one
   * with no level, is a fact about their data - the run should still place the
   * sixty-six that are fine.
   */
  const unparsed: number[] = [];
  const notReturned: number[] = [];

  for (const batch of chunk(gap.missing, IDS_PER_REQUEST)) {
    const path = `/subjects?ids=${batch.join(",")}`;
    const response = await fetchWaniKani<WaniKaniCollectionResponse>(path, tokenResult.token);

    if (response.status !== 200 || !response.data) {
      throw new Error(`WaniKani answered ${response.status} for ${batch.length} ids.`);
    }

    const returned = new Set<number>();
    for (const row of response.data.data ?? []) {
      returned.add(row.id);
      const parsed = parseSubjectRow(row, response.data.data_updated_at ?? null);
      if (parsed) {
        rows.push(parsed);
      } else {
        unparsed.push(row.id);
      }
    }

    for (const id of batch) {
      if (!returned.has(id)) notReturned.push(id);
    }
  }

  console.log(`[${mode}] fetched ${rows.length} usable subjects`);
  if (unparsed.length > 0) {
    console.log(`[${mode}] unusable (no type or level): ${unparsed.join(",")}`);
  }
  if (notReturned.length > 0) {
    console.log(`[${mode}] not served by WaniKani: ${notReturned.join(",")}`);
  }

  for (const row of rows.slice(0, 10)) {
    console.log(`  ${row.wkSubjectId}  L${row.level}  ${row.subjectType}  ${row.characters ?? "-"}`);
  }
  if (rows.length > 10) {
    console.log(`  ... and ${rows.length - 10} more`);
  }

  if (!args.apply) {
    console.log("Dry run. Re-run with --apply to insert these.");
    return;
  }

  /*
   * Insert-only. Every id here was absent when the gap was measured, and
   * `skipDuplicates` means one that arrived in between is left alone rather
   * than overwritten - so this cannot change a row that already exists.
   */
  const written = await prisma.wkSubjectCatalog.createMany({
    data: rows,
    skipDuplicates: true,
  });
  console.log(`[apply] inserted ${written.count} subjects`);

  const after = await findCatalogGap();
  console.log(`[apply] catalogue now holds ${after.held.length}; missing ${after.missing.length}`);
  if (after.missing.length > 0) {
    console.log(`[apply] still missing: ${after.missing.join(",")}`);
  }
}

backfillMissingCatalogSubjects()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
