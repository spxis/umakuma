/**
 * The simulated cohort: members who use the site the way students do.
 *
 * The boards need somebody on them before the first real member arrives, and
 * a number typed into a column proves nothing. So these members are played:
 * each one has a persona - how often they turn up, when in their evening, how
 * many lessons they take, how much they remember, what they play - and the
 * script walks them through the site's own rules, one session at a time, from
 * the day they joined to now. Lessons open state rows, reviews move stages on
 * the shared schedule, XP is paid through the same caps, games are planned by
 * the site's planner and scored by the site's scoring.
 *
 * Every one of them carries `userType = test`, which is how they are found,
 * listed and removed. Nothing public reads that column.
 *
 *   pnpm cohort list
 *   pnpm cohort add 32 [--seed autumn] [--window 120]   invent members, dated over the window
 *   pnpm cohort play [--until <iso>]                    carry everyone forward to now
 *   pnpm cohort remove
 *
 * `play` is the one to run on a schedule. It is safe to run any time: a
 * member's days are decided from their slug and the date, so a day already
 * passed over comes out the same way again, and only sessions after their
 * last recorded activity are played.
 *
 * Refuses a remote database without `--allow-remote`, and expects
 * `pnpm db:backup` before a production run - these accounts land on
 * leaderboards.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

import { getVancouverDateKey } from "../src/lib/dailySnapshot";
import { sessionsBetween, sessionRandom, localDayOf, localDayKey } from "../src/lib/cohort/cohortDays";
import { chooseGame, gamesToday } from "../src/lib/cohort/cohortGames";
import { inventCohort } from "../src/lib/cohort/cohortPersona";
import {
  createCohortAccounts,
  dailyTaken,
  loadCohortAccounts,
  loadMember,
  loadWorld,
  playGame,
  removeCohort,
  saveStanding,
  saveStudy,
  takenSlugs,
  type CohortAccountRow,
} from "../src/lib/cohort/cohortStore";
import { applyPlacement, studySession, type CohortWorld } from "../src/lib/cohort/cohortStudy";
import { resolveStreak } from "../src/lib/xp/xpStreak";
import type { GameRunRequest } from "../src/lib/gameRunCreate";

type Command = "list" | "add" | "play" | "remove";

type Options = {
  command: Command;
  count: number;
  seed: string;
  windowDays: number;
  until: Date;
  allowRemote: boolean;
};

function parseArgs(argv: string[]): Options {
  const [command = "list", ...rest] = argv;
  if (!["list", "add", "play", "remove"].includes(command)) {
    throw new Error(`Unknown command "${command}". Use list, add <n>, play or remove.`);
  }
  const value = (flag: string): string | null => {
    const index = rest.indexOf(flag);
    return index >= 0 ? rest[index + 1] ?? null : null;
  };
  const count = command === "add" ? Number(rest.find((arg) => /^\d+$/.test(arg)) ?? "0") : 0;
  if (command === "add" && (!Number.isInteger(count) || count <= 0)) throw new Error("add needs a count: pnpm cohort add 32");
  const until = value("--until");
  return {
    command: command as Command,
    count,
    seed: value("--seed") ?? getVancouverDateKey(new Date()),
    windowDays: Number(value("--window") ?? "120"),
    until: until ? new Date(until) : new Date(),
    allowRemote: rest.includes("--allow-remote"),
  };
}

function loadEnvironment(): void {
  for (const filename of [".env", ".env.local"]) {
    const path = resolve(process.cwd(), filename);
    if (existsSync(path)) process.loadEnvFile(path);
  }
}

function isLocalDatabase(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return ["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(hostname);
  } catch {
    return false;
  }
}

async function list(): Promise<void> {
  const accounts = await loadCohortAccounts();
  const world = await loadWorld();
  console.log(`${accounts.length} simulated member(s):`);
  for (const account of accounts) {
    const member = await loadMember(account, world);
    if (!member) continue;
    const streak = resolveStreak(member.ledger.dayKeys(), getVancouverDateKey(new Date()), []);
    const persona = member.persona;
    console.log(
      `  /${persona.slug.padEnd(22)} ${persona.displayName.padEnd(22)} ${persona.country}  ${persona.archetype.padEnd(9)} ` +
        `${persona.stream}  level ${String(member.level).padStart(3)}  xp ${String(member.ledger.xp).padStart(6)}  ` +
        `streak ${String(streak.current).padStart(3)}  items ${String(member.states.size).padStart(5)}  ` +
        `last ${member.lastActivityAt?.toISOString().slice(0, 10) ?? "never"}`,
    );
  }
  if (accounts.length === 0) console.log("  (none yet - try: pnpm cohort add 32, then pnpm cohort play)");
}

async function add(options: Options): Promise<CohortAccountRow[]> {
  const invented = inventCohort({
    count: options.count,
    seed: options.seed,
    taken: await takenSlugs(),
    now: options.until,
    joinWindowDays: options.windowDays,
  });
  const created = await createCohortAccounts(invented);
  for (const account of created) {
    console.log(`Created ${account.displayName} at /${account.slug}, joined ${account.createdAt.toISOString().slice(0, 10)}`);
  }
  console.log(`\n${created.length} member(s) created. Run \`pnpm cohort play\` to give them their history.`);
  return created;
}

type PendingGame = { at: Date; request: GameRunRequest };

/** Everything one member does between their last recorded session and `until`. */
async function playMember(account: CohortAccountRow, world: CohortWorld, until: Date): Promise<void> {
  const member = await loadMember(account, world);
  if (!member) return;
  const persona = member.persona;
  const sessions = sessionsBetween(persona, member.lastActivityAt, until);
  if (sessions.length === 0) {
    console.log(`  ${persona.displayName}: nothing new`);
    return;
  }

  const games: PendingGame[] = [];
  const todayKey = getVancouverDateKey(until);
  let dailyUsed = await dailyTaken(account.id, until);
  const totals = { reviews: 0, correct: 0, lessons: 0 };

  for (const session of sessions) {
    const random = sessionRandom(persona, session.at);
    if (member.placedAt === null && persona.placementFloor > 1) applyPlacement(member, world, session.at, random);

    const outcome = studySession({ member, world, at: session.at, random, withLessons: session.first });
    totals.reviews += outcome.reviews;
    totals.correct += outcome.correct;
    totals.lessons += outcome.lessons;

    if (session.first) {
      let at = member.lastActivityAt ?? session.at;
      for (let played = 0; played < gamesToday(persona, random); played += 1) {
        at = new Date(at.getTime() + 60_000 + Math.floor(random() * 240_000));
        const dailyAvailable = !dailyUsed && getVancouverDateKey(at) === todayKey;
        const request = chooseGame({ persona, level: Math.min(member.level, 60), dailyAvailable, random });
        if (request.kind === "daily") dailyUsed = true;
        games.push({ at, request });
      }
    }
  }

  const study = await saveStudy(account.id, member);
  const played: string[] = [];
  for (const game of games) {
    const result = await playGame({ accountId: account.id, member, request: game.request, at: game.at });
    if (result) played.push(`${result.kind} ${result.correct}/${result.answered} (${result.score})`);
  }
  const xpRows = await saveStanding(account.id, member);

  const local = localDayKey(localDayOf(member.lastActivityAt ?? until, persona.utcOffsetHours));
  console.log(
    `  ${persona.displayName.padEnd(22)} ${sessions.length} session(s) to ${local}: ` +
      `${totals.reviews} reviews (${totals.correct} right), ${totals.lessons} lessons, ${played.length} game(s), ` +
      `level ${member.level}, xp ${member.ledger.xp} · wrote ${study.states} states, ${study.attempts} answers, ${xpRows} xp rows` +
      (played.length > 0 ? `\n      ${played.join("; ")}` : ""),
  );
}

async function play(options: Options): Promise<void> {
  const world = await loadWorld();
  if (world.subjects.length === 0) throw new Error("No UkSubject rows. Seed the ladder first (pnpm ladder:seed).");
  const accounts = await loadCohortAccounts();
  if (accounts.length === 0) {
    console.log("No simulated members yet. Try: pnpm cohort add 32");
    return;
  }
  console.log(`Playing ${accounts.length} member(s) up to ${options.until.toISOString()}:`);
  for (const account of accounts) await playMember(account, world, options.until);
}

async function main(): Promise<void> {
  loadEnvironment();
  const options = parseArgs(process.argv.slice(2));

  if (!isLocalDatabase(process.env.DATABASE_URL) && !options.allowRemote) {
    console.error(
      "Refusing to run: DATABASE_URL is not local.\n" +
        "These accounts land on leaderboards. Take `pnpm db:backup` first, then pass --allow-remote to mean it,\n" +
        "or run `pnpm cohort:local ...` to use the local database.",
    );
    process.exitCode = 1;
    return;
  }

  const { prisma } = await import("../src/lib/prisma");
  try {
    if (options.command === "list") await list();
    if (options.command === "add") await add(options);
    if (options.command === "play") await play(options);
    if (options.command === "remove") console.log(`Removed ${await removeCohort()} simulated member(s) and everything they did.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
