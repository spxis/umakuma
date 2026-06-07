import { backfillCustomLibraryWaniKaniEnrichment } from "../src/lib/customStudy/customLibraryBackfill";
import { prisma } from "../src/lib/prisma";

type Args = {
  apply: boolean;
  accountId: string | null;
  libraryId: string | null;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);

  const apply = args.includes("--apply");
  const accountIdArg = args.find((arg) => arg.startsWith("--account-id="));
  const libraryIdArg = args.find((arg) => arg.startsWith("--library-id="));

  return {
    apply,
    accountId: accountIdArg ? accountIdArg.replace("--account-id=", "").trim() : null,
    libraryId: libraryIdArg ? libraryIdArg.replace("--library-id=", "").trim() : null,
  };
}

async function main() {
  const args = parseArgs();

  const libraries = await prisma.customStudyLibrary.findMany({
    where: {
      ...(args.accountId ? { accountId: args.accountId } : {}),
      ...(args.libraryId ? { id: args.libraryId } : {}),
    },
    orderBy: [{ accountId: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      accountId: true,
      name: true,
      itemCount: true,
      isActive: true,
    },
  });

  if (libraries.length === 0) {
    console.log("No matching custom libraries found.");
    return;
  }

  console.log(`Mode: ${args.apply ? "apply" : "dry-run"}`);
  console.log(`Libraries matched: ${libraries.length}`);

  for (const [index, library] of libraries.entries()) {
    console.log(
      `[${index + 1}/${libraries.length}] ${library.name} (${library.id}) account=${library.accountId} items=${library.itemCount} active=${library.isActive}`,
    );
  }

  if (!args.apply) {
    console.log("Dry-run complete. Re-run with --apply to execute backfill.");
    return;
  }

  let succeeded = 0;
  let failed = 0;

  for (const [index, library] of libraries.entries()) {
    process.stdout.write(`[${index + 1}/${libraries.length}] Backfilling ${library.name} (${library.id})... `);
    try {
      await backfillCustomLibraryWaniKaniEnrichment({
        accountId: library.accountId,
        libraryId: library.id,
      });
      succeeded += 1;
      console.log("done");
    } catch (error) {
      failed += 1;
      console.log("failed");
      console.error(error);
    }
  }

  console.log(`Backfill completed. success=${succeeded} failed=${failed}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
