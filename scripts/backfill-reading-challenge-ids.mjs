import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const challengeIdArg = args.find((arg) => arg.startsWith("--challenge-id="));
  const challengeId = challengeIdArg ? challengeIdArg.replace("--challenge-id=", "").trim() : null;

  return { apply, challengeId };
}

function toFixedPstDateKey(date) {
  const pstOffsetMs = 8 * 60 * 60 * 1000;
  const shifted = new Date(date.getTime() - pstOffsetMs);
  return shifted.toISOString().slice(0, 10);
}

function resolveChallengeIdForDate(dateKey, campaigns, fallbackChallengeId) {
  const matching = campaigns
    .filter((campaign) => campaign.startDatePst <= dateKey && campaign.goalDatePst >= dateKey)
    .sort((a, b) => b.startDatePst.localeCompare(a.startDatePst));

  return matching[0]?.id ?? fallbackChallengeId;
}

function summarizeBuckets(buckets) {
  return Object.entries(buckets)
    .map(([challengeId, ids]) => `${challengeId}:${ids.length}`)
    .join(", ");
}

async function updateRowsByBuckets({
  model,
  buckets,
  apply,
}) {
  let updated = 0;

  for (const [challengeId, ids] of Object.entries(buckets)) {
    if (ids.length === 0) {
      continue;
    }

    if (apply) {
      await model.updateMany({
        where: { id: { in: ids } },
        data: { challengeId },
      });
    }

    updated += ids.length;
  }

  return updated;
}

async function main() {
  const { apply, challengeId: explicitChallengeId } = parseArgs();

  const campaigns = await prisma.readingChallenge.findMany({
    orderBy: [{ startDatePst: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      status: true,
      startDatePst: true,
      goalDatePst: true,
    },
  });

  if (campaigns.length === 0) {
    throw new Error("No reading campaigns found. Create at least one campaign before backfilling.");
  }

  if (explicitChallengeId && !campaigns.some((campaign) => campaign.id === explicitChallengeId)) {
    throw new Error(`Unknown challenge id: ${explicitChallengeId}`);
  }

  const activeCampaign = campaigns.find((campaign) => campaign.status === "active") ?? null;
  const defaultChallengeId = explicitChallengeId ?? activeCampaign?.id ?? campaigns[0]?.id;

  if (!defaultChallengeId) {
    throw new Error("Could not resolve a fallback campaign id.");
  }

  console.log(`Mode: ${apply ? "apply" : "dry-run"}`);
  console.log(`Fallback campaign: ${defaultChallengeId}`);
  console.log(`Campaigns: ${campaigns.map((campaign) => `${campaign.id}(${campaign.status})`).join(", ")}`);

  const signoffs = await prisma.readingSignoff.findMany({
    where: { challengeId: null },
    select: { id: true, signoffDatePst: true },
  });

  const signoffBuckets = {};
  for (const row of signoffs) {
    const challengeId = resolveChallengeIdForDate(row.signoffDatePst, campaigns, defaultChallengeId);
    signoffBuckets[challengeId] = signoffBuckets[challengeId] ?? [];
    signoffBuckets[challengeId].push(row.id);
  }

  const signoffEntries = await prisma.readingSignoffEntry.findMany({
    where: { challengeId: null },
    select: { id: true, signoffDatePst: true },
  });

  const signoffEntryBuckets = {};
  for (const row of signoffEntries) {
    const challengeId = resolveChallengeIdForDate(row.signoffDatePst, campaigns, defaultChallengeId);
    signoffEntryBuckets[challengeId] = signoffEntryBuckets[challengeId] ?? [];
    signoffEntryBuckets[challengeId].push(row.id);
  }

  const books = await prisma.readingChallengeBook.findMany({
    where: { challengeId: null },
    select: { id: true, accountId: true, isbn: true, createdAt: true },
  });

  let skippedBookConflicts = 0;
  const bookBuckets = {};
  for (const row of books) {
    const dateKey = toFixedPstDateKey(row.createdAt);
    const challengeId = resolveChallengeIdForDate(dateKey, campaigns, defaultChallengeId);

    const conflict = await prisma.readingChallengeBook.findFirst({
      where: {
        challengeId,
        accountId: row.accountId,
        isbn: row.isbn,
      },
      select: { id: true },
    });

    if (conflict) {
      skippedBookConflicts += 1;
      continue;
    }

    bookBuckets[challengeId] = bookBuckets[challengeId] ?? [];
    bookBuckets[challengeId].push(row.id);
  }

  const members = await prisma.readingChallengeMember.findMany({
    where: { challengeId: null },
    select: { id: true, accountId: true, createdAt: true },
  });

  let skippedMemberConflicts = 0;
  const memberBuckets = {};
  for (const row of members) {
    const dateKey = toFixedPstDateKey(row.createdAt);
    const challengeId = resolveChallengeIdForDate(dateKey, campaigns, defaultChallengeId);

    const conflict = await prisma.readingChallengeMember.findFirst({
      where: {
        challengeId,
        accountId: row.accountId,
      },
      select: { id: true },
    });

    if (conflict) {
      skippedMemberConflicts += 1;
      continue;
    }

    memberBuckets[challengeId] = memberBuckets[challengeId] ?? [];
    memberBuckets[challengeId].push(row.id);
  }

  console.log(`ReadingSignoff candidates: ${signoffs.length} (${summarizeBuckets(signoffBuckets) || "none"})`);
  console.log(`ReadingSignoffEntry candidates: ${signoffEntries.length} (${summarizeBuckets(signoffEntryBuckets) || "none"})`);
  console.log(`ReadingChallengeBook candidates: ${books.length} (${summarizeBuckets(bookBuckets) || "none"}), skipped conflicts=${skippedBookConflicts}`);
  console.log(`ReadingChallengeMember candidates: ${members.length} (${summarizeBuckets(memberBuckets) || "none"}), skipped conflicts=${skippedMemberConflicts}`);

  const updatedSignoffs = await updateRowsByBuckets({ model: prisma.readingSignoff, buckets: signoffBuckets, apply });
  const updatedEntries = await updateRowsByBuckets({ model: prisma.readingSignoffEntry, buckets: signoffEntryBuckets, apply });
  const updatedBooks = await updateRowsByBuckets({ model: prisma.readingChallengeBook, buckets: bookBuckets, apply });
  const updatedMembers = await updateRowsByBuckets({ model: prisma.readingChallengeMember, buckets: memberBuckets, apply });

  console.log(`Updated ReadingSignoff rows: ${updatedSignoffs}`);
  console.log(`Updated ReadingSignoffEntry rows: ${updatedEntries}`);
  console.log(`Updated ReadingChallengeBook rows: ${updatedBooks}`);
  console.log(`Updated ReadingChallengeMember rows: ${updatedMembers}`);

  if (!apply) {
    console.log("Dry-run complete. Re-run with --apply to persist changes.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
