/**
 * Seeds a fully synthetic account into a LOCAL database so the app can be used
 * end to end without a real WaniKani account or token.
 *
 * The account signs in through the real invite-code flow, so nothing here adds
 * a bypass to the app itself. Its `assignmentCache` is generated from the real
 * `WkSubjectCatalog` rows already present in the database, which is what makes
 * the games, explorers and study queue behave like a real player's.
 *
 * Refuses to run against anything but localhost.
 *
 * Usage:
 *   pnpm local:seed                      # create/refresh the test user
 *   pnpm local:seed -- --level 20        # different WaniKani level
 *   pnpm local:seed -- --favorite 30     # size of the favorites list
 *   pnpm local:seed -- --remove          # delete the test user
 */
import process from "node:process";

import { PrismaClient, type Prisma } from "@prisma/client";

import { encryptToken } from "../src/lib/crypto";
import { hashInviteCode } from "../src/lib/inviteCode";
import { seededRandom, type RandomSource } from "../src/lib/gameRandom";
import { mockTokenForAccount } from "../src/lib/wanikani/mockApi";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "host.docker.internal"]);
const PARKED_SYNC_AT = new Date("2999-01-01T00:00:00.000Z");
const SRS_STAGES = { apprentice: [1, 2, 3, 4], guru: [5, 6], master: [7], enlightened: [8], burned: [9] } as const;
const DAY_MS = 24 * 60 * 60 * 1000;

type Options = {
  level: number;
  nickname: string;
  code: string;
  remove: boolean;
  troubleCount: number;
  favoriteCount: number;
};

function parseArgs(argv: string[]): Options {
  const read = (flag: string, fallback: string): string => {
    const index = argv.indexOf(flag);
    return index >= 0 && argv[index + 1] ? argv[index + 1]! : fallback;
  };
  const level = Number(read("--level", "12"));
  if (!Number.isInteger(level) || level < 1 || level > 60) {
    throw new Error("--level must be an integer between 1 and 60.");
  }
  return {
    level,
    nickname: read("--nickname", "Testkuma"),
    code: read("--code", "TEST01").toUpperCase(),
    remove: argv.includes("--remove"),
    troubleCount: Number(read("--trouble", "25")),
    favoriteCount: Number(read("--favorite", "15")),
  };
}

/** Hard stop: this script writes fake data and scrubs tokens. */
function assertLocalDatabase(): void {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Run this through `pnpm local:seed`.");
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error("DATABASE_URL is not a valid URL.");
  }
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(
      `Refusing to run against non-local database host "${hostname}". ` +
      "This script seeds fake accounts and replaces stored tokens; point DATABASE_URL at the local container first.",
    );
  }
}

function pickStage(random: RandomSource): number {
  const roll = random();
  if (roll < 0.12) return 0; // locked / not started
  if (roll < 0.45) return SRS_STAGES.apprentice[Math.floor(random() * 4)]!;
  if (roll < 0.7) return SRS_STAGES.guru[Math.floor(random() * 2)]!;
  if (roll < 0.82) return SRS_STAGES.master[0];
  if (roll < 0.92) return SRS_STAGES.enlightened[0];
  return SRS_STAGES.burned[0];
}

function buildAssignmentCache(
  subjects: Array<{ wkSubjectId: number; subjectType: string; level: number }>,
  random: RandomSource,
  now: number,
): Prisma.InputJsonValue {
  return subjects.map((subject, index) => {
    const stage = pickStage(random);
    const started = stage >= 1;
    const startedAt = new Date(now - Math.floor(random() * 240) * DAY_MS);
    const passedAt = stage >= 5 ? new Date(startedAt.getTime() + 7 * DAY_MS) : null;
    // Roughly a fifth of started items are due now, so review queues are non-empty.
    const availableAt = stage >= 1 && stage <= 8
      ? new Date(now + (random() < 0.2 ? -1 : 1) * Math.floor(random() * 5 + 1) * DAY_MS)
      : null;

    return {
      id: 900_000_000 + index,
      object: "assignment",
      data_updated_at: new Date(now).toISOString(),
      data: {
        subject_id: subject.wkSubjectId,
        subject_type: subject.subjectType,
        srs_stage: stage,
        unlocked_at: new Date(startedAt.getTime() - DAY_MS).toISOString(),
        started_at: started ? startedAt.toISOString() : null,
        passed_at: passedAt?.toISOString() ?? null,
        available_at: availableAt?.toISOString() ?? null,
        burned_at: stage === 9 ? new Date(startedAt.getTime() + 120 * DAY_MS).toISOString() : null,
      },
    };
  }) as unknown as Prisma.InputJsonValue;
}

function emptyRow() {
  return { radical: 0, kanji: 0, vocabulary: 0, total: 0 };
}

function buildItemSpread(rows: Array<{ subjectType: string; stage: number }>) {
  const spread = {
    apprentice: emptyRow(), guru: emptyRow(), master: emptyRow(),
    enlightened: emptyRow(), burned: emptyRow(), totals: emptyRow(),
  };
  const groupFor = (stage: number) =>
    stage >= 9 ? "burned" : stage === 8 ? "enlightened" : stage === 7 ? "master" : stage >= 5 ? "guru" : stage >= 1 ? "apprentice" : null;

  for (const row of rows) {
    const group = groupFor(row.stage);
    if (!group) continue;
    const key = row.subjectType as "radical" | "kanji" | "vocabulary";
    spread[group][key] += 1;
    spread[group].total += 1;
    spread.totals[key] += 1;
    spread.totals.total += 1;
  }
  return spread as unknown as Prisma.InputJsonValue;
}

async function main() {
  assertLocalDatabase();
  const options = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  const wkUserId = `local-test-${options.nickname.toLowerCase()}`;

  if (options.remove) {
    const deleted = await prisma.account.deleteMany({ where: { wkUserId } });
    console.log(deleted.count > 0 ? `Removed test user ${options.nickname}.` : "No test user to remove.");
    await prisma.$disconnect();
    return;
  }

  // Safety: a local copy of production still carries real encrypted tokens.
  // Every account gets a mock token instead, so a local run can never reach the
  // real WaniKani API. The token encodes its own account id, which is how the
  // offline stand-in attributes a request.
  const existing = await prisma.account.findMany({ select: { id: true } });
  for (const row of existing) {
    const mock = encryptToken(mockTokenForAccount(row.id));
    await prisma.account.update({
      where: { id: row.id },
      data: {
        tokenEncrypted: mock.encrypted,
        tokenIv: mock.iv,
        tokenTag: mock.tag,
        nextSyncAllowedAt: PARKED_SYNC_AT,
        lastSyncedAt: new Date(),
      },
    });
  }
  console.log(`Replaced WaniKani tokens with mock tokens on ${existing.length} account(s).`);

  const subjects = await prisma.wkSubjectCatalog.findMany({
    where: { level: { lte: options.level }, hiddenAt: null, characters: { not: null } },
    select: { wkSubjectId: true, subjectType: true, level: true },
    orderBy: { wkSubjectId: "asc" },
  });
  if (subjects.length === 0) {
    throw new Error("No WkSubjectCatalog rows found. Restore a database backup first (pnpm local:db:restore).");
  }

  const random = seededRandom(`${wkUserId}:${options.level}`);
  const now = Date.now();
  const assignmentCache = buildAssignmentCache(subjects, random, now);
  const rows = (assignmentCache as unknown as Array<{ data: { subject_type: string; srs_stage: number } }>)
    .map((row) => ({ subjectType: row.data.subject_type, stage: row.data.srs_stage }));

  const started = rows.filter((row) => row.stage >= 1);
  const counts = {
    reviewCount: started.length * 4,
    burnedCount: rows.filter((row) => row.stage >= 9).length,
    pendingReviews: Math.floor(started.length * 0.2),
    radicalCount: rows.filter((row) => row.subjectType === "radical" && row.stage >= 1).length,
    vocabularyCount: rows.filter((row) => row.subjectType === "vocabulary" && row.stage >= 1).length,
    apprenticeCount: rows.filter((row) => row.stage >= 1 && row.stage <= 4).length,
    guruCount: rows.filter((row) => row.stage >= 5 && row.stage <= 6).length,
    masterCount: rows.filter((row) => row.stage === 7).length,
    enlightenedCount: rows.filter((row) => row.stage === 8).length,
  };

  const placeholder = encryptToken(mockTokenForAccount("pending"));
  const shared = {
    nickname: options.nickname,
    wkUsername: options.nickname.toLowerCase(),
    wkLevel: options.level,
    inviteCodeHash: hashInviteCode(options.code),
    tokenEncrypted: placeholder.encrypted,
    tokenIv: placeholder.iv,
    tokenTag: placeholder.tag,
    assignmentCache,
    assignmentCacheUpdatedAt: new Date(),
    itemSpread: buildItemSpread(rows),
    lastActivityAt: new Date(),
    lastSyncedAt: new Date(),
    nextSyncAllowedAt: PARKED_SYNC_AT,
    lastSyncStatus: "idle",
    score: options.level * 1000 + counts.reviewCount,
    ...counts,
  };

  const account = await prisma.account.upsert({
    where: { wkUserId },
    create: { wkUserId, ...shared },
    update: shared,
  });

  // The mock token embeds the account id, which only exists after the upsert.
  const accountToken = encryptToken(mockTokenForAccount(account.id));
  await prisma.account.update({
    where: { id: account.id },
    data: {
      tokenEncrypted: accountToken.encrypted,
      tokenIv: accountToken.iv,
      tokenTag: accountToken.tag,
    },
  });

  // Give Practice real signal: both tagged lists, plus a wrong-heavy review
  // history so the Toughest list has something to rank.
  // Only started items qualify, because that is all the game pool draws from.
  await prisma.studySubjectTag.deleteMany({ where: { accountId: account.id } });
  await prisma.studyReviewAttempt.deleteMany({ where: { accountId: account.id } });
  const startedSubjectIds = new Set(
    (assignmentCache as unknown as Array<{ data: { subject_id: number; srs_stage: number } }>)
      .filter((row) => row.data.srs_stage >= 1)
      .map((row) => row.data.subject_id),
  );
  const troubleSubjects = subjects
    .filter((subject) => startedSubjectIds.has(subject.wkSubjectId))
    .slice(0, options.troubleCount);
  if (troubleSubjects.length > 0) {
    await prisma.studySubjectTag.createMany({
      data: troubleSubjects.map((subject) => ({
        accountId: account.id, subjectId: subject.wkSubjectId, trouble: true, favorite: false,
      })),
    });
    await prisma.studyReviewAttempt.createMany({
      data: troubleSubjects.flatMap((subject) =>
        Array.from({ length: 6 }, (_, attempt) => ({
          accountId: account.id,
          assignmentId: 900_000_000,
          subjectId: subject.wkSubjectId,
          subjectType: subject.subjectType,
          result: attempt % 3 === 0 ? ("correct" as const) : ("wrong" as const),
          submittedAt: new Date(now - attempt * DAY_MS),
        })),
      ),
    });
  }

  // The favorites list is the other half of Practice, so it needs its own items.
  const favoriteSubjects = subjects
    .filter((subject) => startedSubjectIds.has(subject.wkSubjectId))
    .slice(options.troubleCount, options.troubleCount + options.favoriteCount);
  if (favoriteSubjects.length > 0) {
    await prisma.studySubjectTag.createMany({
      data: favoriteSubjects.map((subject) => ({
        accountId: account.id, subjectId: subject.wkSubjectId, trouble: false, favorite: true,
      })),
    });
  }

  console.log("");
  console.log(`Test user ready: ${account.nickname} (@${account.wkUsername}) at level ${account.wkLevel}`);
  console.log(`  accountId     ${account.id}`);
  console.log(`  items         ${subjects.length} subjects, ${started.length} started`);
  console.log(`  trouble tags  ${troubleSubjects.length}`);
  console.log(`  favorite tags ${favoriteSubjects.length}`);
  console.log("");
  console.log(`  Sign in at    http://localhost:6400/invite`);
  console.log(`  Invite code   ${options.code}`);
  console.log(`  Then visit    http://localhost:6400/users/${account.wkUsername}/game`);
  console.log("");
  await prisma.$disconnect();
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
