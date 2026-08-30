/**
 * Synthetic members, for trying the site as somebody who is not you.
 *
 * There is no such thing as a "Google account" in this schema. Signing in
 * matches the session's email against `Account.joinedByEmail`, so an account
 * that arrived through Google is just a row with an email on it and no
 * WaniKani connection. That is exactly what this creates.
 *
 * Scores are played, not invented. The script reads each question's answer
 * from the database and then submits it over HTTP like a browser would, so
 * runs are scored by the real scoring code and land on the real scoreboards.
 * Writing plausible numbers straight into `GameRun` would prove nothing.
 *
 * Map mode is the default because it needs no WaniKani: it is the game a
 * member with no connection can actually play, which is the case worth
 * testing.
 *
 * Usage:
 *   pnpm test-members -- --list
 *   pnpm test-members -- --create 3 --play 2
 *   pnpm test-members -- --play 5 --accuracy 0.9
 *   pnpm test-members -- --remove
 *
 * Defaults to the local database and refuses anything else without
 * --allow-remote, because these accounts appear on leaderboards.
 */

import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { encode } from "next-auth/jwt";

/** Every synthetic member's email ends here, which is how they are found again. */
const TEST_EMAIL_DOMAIN = "test.umakuma.local";

const FIRST_NAMES = [
  "Aiko", "Ben", "Cass", "Dana", "Emi", "Finn", "Gwen", "Haru",
  "Iris", "Jun", "Kira", "Leo", "Mika", "Nao", "Owen", "Rin",
];
const LAST_NAMES = ["Aoki", "Brook", "Chen", "Dahl", "Endo", "Frost", "Goto", "Hale"];

type Options = {
  create: number;
  play: number;
  accuracy: number;
  list: boolean;
  remove: boolean;
  baseUrl: string;
  allowRemote: boolean;
};

function parseArgs(argv: string[]): Options {
  const value = (flag: string): string | null => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] ?? null : null;
  };
  const number = (flag: string, fallback: number): number => {
    const raw = value(flag);
    if (raw === null) return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) throw new Error(`${flag} needs a number, got "${raw}".`);
    return parsed;
  };

  return {
    create: number("--create", 0),
    play: number("--play", 0),
    accuracy: number("--accuracy", 0.8),
    list: argv.includes("--list"),
    remove: argv.includes("--remove"),
    baseUrl: value("--base-url") ?? `http://localhost:${process.env.WEB_PORT ?? 6400}`,
    allowRemote: argv.includes("--allow-remote"),
  };
}

function loadEnvironment(): void {
  for (const filename of [".env", ".env.local"]) {
    const path = resolve(process.cwd(), filename);
    if (existsSync(path)) process.loadEnvFile(path);
  }
}

/**
 * Whether the configured database is on this machine.
 *
 * These rows show up on leaderboards, so pointing this at the database the
 * family uses daily should take more than a typo.
 */
function isLocalDatabase(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

/** A name and the slug that addresses it, unique against what is already taken. */
function inventMember(taken: ReadonlySet<string>): { displayName: string; slug: string; email: string } {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const displayName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const base = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    if (!taken.has(slug)) {
      return { displayName, slug, email: `${slug}@${TEST_EMAIL_DOMAIN}` };
    }
  }
  const fallback = `member-${Date.now().toString(36)}`;
  return { displayName: "Test Member", slug: fallback, email: `${fallback}@${TEST_EMAIL_DOMAIN}` };
}

async function sessionCookie(email: string, secret: string): Promise<string> {
  const token = await encode({ token: { name: email, email, sub: email }, secret });
  return `next-auth.session-token=${token}`;
}

type PlayResult = { runId: string; score: number; correct: number; answered: number } | null;

/**
 * One Map run, played over HTTP.
 *
 * The answer comes from the database rather than from the payload, because the
 * payload deliberately does not say which tile is right. A wrong answer is a
 * real wrong answer - some other option - not a skipped question, so streaks
 * and accuracy come out the way they would for a person.
 */
async function playOneRun(
  prisma: PrismaClient,
  accountId: string,
  cookie: string,
  baseUrl: string,
  accuracy: number,
): Promise<PlayResult> {
  const start = await fetch(`${baseUrl}/api/game/${accountId}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ kind: "map", category: "vocabulary", batchSize: 10, direction: "find", answerMode: "auto" }),
  });

  if (!start.ok) {
    console.error(`  could not start a run: ${start.status} ${(await start.text()).slice(0, 160)}`);
    return null;
  }

  const { run, questions } = (await start.json()) as {
    run: { id: string };
    questions: { id: string; position: number }[];
  };

  const answers = await prisma.gameQuestion.findMany({
    where: { runId: run.id },
    select: { id: true, targetSubjectId: true, optionSubjectIds: true, leftSubjectId: true, rightSubjectId: true },
  });
  const byId = new Map(answers.map((row) => [row.id, row]));

  let correct = 0;
  let answered = 0;

  for (const question of [...questions].sort((a, b) => a.position - b.position)) {
    const truth = byId.get(question.id);
    if (!truth) continue;

    const options = truth.optionSubjectIds.length > 0
      ? truth.optionSubjectIds
      : [truth.leftSubjectId, truth.rightSubjectId];
    const wrong = options.filter((id) => id !== truth.targetSubjectId);

    // Miss on purpose sometimes, by choosing a real other tile.
    const answerCorrectly = Math.random() < accuracy || wrong.length === 0;
    const selectedSubjectId = answerCorrectly ? truth.targetSubjectId : pick(wrong);

    const response = await fetch(`${baseUrl}/api/game/${accountId}/runs/${run.id}/answer`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ questionId: question.id, selectedSubjectId }),
    });

    if (!response.ok) {
      console.error(`  answer rejected: ${response.status} ${(await response.text()).slice(0, 120)}`);
      break;
    }

    answered += 1;
    if (answerCorrectly) correct += 1;
  }

  const finished = await prisma.gameRun.findUnique({
    where: { id: run.id },
    select: { score: true, status: true },
  });

  return { runId: run.id, score: finished?.score ?? 0, correct, answered };
}

async function main(): Promise<void> {
  loadEnvironment();
  const options = parseArgs(process.argv.slice(2));

  const databaseUrl = process.env.DATABASE_URL;
  if (!isLocalDatabase(databaseUrl) && !options.allowRemote) {
    console.error(
      "Refusing to run: DATABASE_URL is not local.\n" +
        "These accounts appear on leaderboards, so pass --allow-remote to mean it,\n" +
        "or run under `node scripts/local-db.mjs run -- ...` to use the local database.",
    );
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();

  try {
    const existing = await prisma.account.findMany({
      where: { joinedByEmail: { endsWith: `@${TEST_EMAIL_DOMAIN}` } },
      select: { id: true, slug: true, displayName: true, joinedByEmail: true },
      orderBy: { createdAt: "asc" },
    });

    if (options.remove) {
      const ids = existing.map((account) => account.id);
      if (ids.length === 0) {
        console.log("No test members to remove.");
        return;
      }
      // Runs first: a GameRun points at the account, not the other way round.
      const runs = await prisma.gameRun.deleteMany({ where: { accountId: { in: ids } } });
      const removed = await prisma.account.deleteMany({ where: { id: { in: ids } } });
      console.log(`Removed ${removed.count} test member(s) and ${runs.count} run(s).`);
      return;
    }

    if (options.list || (options.create === 0 && options.play === 0)) {
      console.log(`${existing.length} test member(s):`);
      for (const account of existing) {
        const runs = await prisma.gameRun.count({ where: { accountId: account.id, status: "completed" } });
        console.log(`  /${account.slug}  ${account.displayName}  <${account.joinedByEmail}>  ${runs} completed run(s)`);
      }
      if (existing.length === 0) console.log("  (none yet - try --create 3 --play 2)");
      return;
    }

    const taken = new Set(
      (await prisma.account.findMany({ select: { slug: true } }))
        .map((row) => row.slug)
        .filter((slug): slug is string => Boolean(slug)),
    );

    const members = [...existing];

    for (let i = 0; i < options.create; i += 1) {
      const invented = inventMember(taken);
      taken.add(invented.slug);

      const account = await prisma.account.create({
        data: {
          nickname: invented.displayName,
          displayName: invented.displayName,
          slug: invented.slug,
          joinedByEmail: invented.email,
          joinedByName: invented.displayName,
        },
        select: { id: true, slug: true, displayName: true, joinedByEmail: true },
      });

      members.push(account);
      console.log(`Created ${account.displayName} at /${account.slug} <${account.joinedByEmail}>`);
    }

    if (options.play > 0) {
      const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
      if (!secret) {
        console.error("Cannot play: no AUTH_SECRET in the environment.");
        process.exitCode = 1;
        return;
      }

      for (const member of members) {
        if (!member.joinedByEmail) continue;
        const cookie = await sessionCookie(member.joinedByEmail, secret);
        console.log(`${member.displayName} playing ${options.play} run(s):`);

        for (let round = 0; round < options.play; round += 1) {
          const result = await playOneRun(prisma, member.id, cookie, options.baseUrl, options.accuracy);
          if (result) {
            console.log(`  run ${round + 1}: ${result.correct}/${result.answered} correct, score ${result.score}`);
          }
        }
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
