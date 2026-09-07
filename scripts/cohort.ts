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
 *   pnpm cohort add 16 [--seed autumn] [--window 365]   invent members, dated over the window
 *   pnpm cohort play [--until <iso>] [--max-sessions 14]  carry everyone forward
 *   pnpm cohort remove
 *
 * Every command takes `--dry-run`, which says what it would do and writes
 * nothing. On `play` that is the answer to "what is this about to do to
 * production", which is worth having before finding out.
 *
 * `play` is the one to run on a schedule. It is safe to run any time: a
 * member's days are decided from their slug and the date, so a day already
 * passed over comes out the same way again, and only sessions after their
 * last recorded activity are played.
 *
 * Refuses a remote database without `--allow-remote`, and expects
 * `pnpm db:backup:prod` before a production run - these accounts land on
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
  takenSlugs,
  type CohortAccountRow,
} from "../src/lib/cohort/cohortStore";
import { saveStanding, saveStudy } from "../src/lib/cohort/cohortWrite";
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
  /** Most sessions one run replays per member. Null for all of them. */
  maxSessions: number | null;
  /** Say what would happen and write nothing. */
  dryRun: boolean;
};

/** Flags that take a value, and flags that are just present. */
const VALUE_FLAGS = ["--seed", "--window", "--until", "--max-sessions"] as const;
const BOOLEAN_FLAGS = ["--allow-remote", "--dry-run"] as const;

/**
 * Reads the command line strictly, because the loose version had teeth.
 *
 * The count used to be "the first bare number anywhere in the arguments",
 * which meant `cohort add --window 365 16` read 365 as the count and would
 * have invented three hundred and sixty-five members on a leaderboard. A
 * flag's value is consumed with the flag now, so only a genuine positional
 * can be the count.
 *
 * Unknown flags are refused rather than ignored, and that is not pedantry:
 * `--max-session 5` silently meant "no cap at all", which is the one setting
 * that stops a run outgrowing the time it has.
 */
function parseArgs(argv: string[]): Options {
  const [command = "list", ...rest] = argv;
  if (!["list", "add", "play", "remove"].includes(command)) {
    throw new Error(`Unknown command "${command}". Use list, add <n>, play or remove.`);
  }

  const values = new Map<string, string>();
  const flags = new Set<string>();
  const positional: string[] = [];

  for (let at = 0; at < rest.length; at += 1) {
    const token = rest[at]!;
    if ((VALUE_FLAGS as readonly string[]).includes(token)) {
      const value = rest[at + 1];
      if (value === undefined || value.startsWith("--")) throw new Error(`${token} needs a value.`);
      values.set(token, value);
      at += 1;
    } else if ((BOOLEAN_FLAGS as readonly string[]).includes(token)) {
      flags.add(token);
    } else if (token.startsWith("--")) {
      throw new Error(
        `Unknown flag "${token}". Known: ${[...VALUE_FLAGS, ...BOOLEAN_FLAGS].join(", ")}.`,
      );
    } else {
      positional.push(token);
    }
  }

  /** A whole number above zero, or a message naming the flag that was wrong. */
  const wholeAbove = (what: string, raw: string): number => {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${what} needs a whole number above zero, not "${raw}".`);
    return parsed;
  };

  if (command !== "add" && positional.length > 0) {
    throw new Error(`${command} takes no count. Did you mean: pnpm cohort add ${positional[0]}?`);
  }
  if (command === "add" && positional.length !== 1) {
    throw new Error("add needs exactly one count: pnpm cohort add 16");
  }

  const untilRaw = values.get("--until");
  const until = untilRaw === undefined ? new Date() : new Date(untilRaw);
  if (Number.isNaN(until.getTime())) throw new Error(`--until needs a date I can read, not "${untilRaw}".`);

  const seed = values.get("--seed");
  if (seed !== undefined && seed.trim() === "") throw new Error("--seed needs a name.");

  return {
    command: command as Command,
    count: command === "add" ? wholeAbove("add's count", positional[0]!) : 0,
    seed: seed ?? getVancouverDateKey(new Date()),
    windowDays: wholeAbove("--window", values.get("--window") ?? "120"),
    until,
    allowRemote: flags.has("--allow-remote"),
    maxSessions: values.has("--max-sessions") ? wholeAbove("--max-sessions", values.get("--max-sessions")!) : null,
    dryRun: flags.has("--dry-run"),
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
  if (accounts.length === 0) console.log("  (none yet - try: pnpm cohort add 16, then pnpm cohort play)");
}

async function add(options: Options): Promise<CohortAccountRow[]> {
  const invented = inventCohort({
    count: options.count,
    seed: options.seed,
    taken: await takenSlugs(),
    now: options.until,
    joinWindowDays: options.windowDays,
  });

  if (options.dryRun) {
    console.log(`Would create ${invented.length} member(s), seed "${options.seed}", over ${options.windowDays} days:`);
    for (const member of invented) {
      console.log(`  ${member.displayName.padEnd(24)} /${member.slug.padEnd(22)} joined ${member.createdAt.toISOString().slice(0, 10)}`);
    }
    console.log("\nNothing written. Drop --dry-run to do it.");
    return [];
  }

  const created = await createCohortAccounts(invented);
  for (const account of created) {
    console.log(`Created ${account.displayName} at /${account.slug}, joined ${account.createdAt.toISOString().slice(0, 10)}`);
  }
  console.log(`\n${created.length} member(s) created. Run \`pnpm cohort play\` to give them their history.`);
  return created;
}

/**
 * Takes the whole cohort out, and says who first.
 *
 * There is no way to remove one - the set is the unit, and everything they
 * did goes with them by cascade. So the list is printed before the delete
 * rather than a count after it: "Removed 31" tells you nothing you can check,
 * and by then it is gone.
 */
async function remove(options: Options): Promise<void> {
  const accounts = await loadCohortAccounts();
  if (accounts.length === 0) {
    console.log("No simulated members to remove.");
    return;
  }

  console.log(`${options.dryRun ? "Would remove" : "Removing"} ${accounts.length} member(s) and everything they did:`);
  for (const account of accounts) console.log(`  /${account.slug ?? account.nickname}`);
  if (options.dryRun) {
    console.log("\nNothing written. Drop --dry-run to do it.");
    return;
  }
  console.log(`\nRemoved ${await removeCohort()} simulated member(s).`);
}

type PendingGame = { at: Date; request: GameRunRequest };

/** Everything one member does between their last recorded session and `until`. */
async function playMember(
  account: CohortAccountRow,
  world: CohortWorld,
  until: Date,
  maxSessions: number | null,
  dryRun: boolean,
): Promise<void> {
  const member = await loadMember(account, world);
  if (!member) return;
  const persona = member.persona;
  const all = sessionsBetween(persona, member.lastActivityAt, until);
  if (all.length === 0) {
    console.log(`  ${persona.displayName}: nothing new`);
    return;
  }

  /*
   * At most `maxSessions` of them this time.
   *
   * A tick that has months to replay cannot finish inside a request, and the
   * one that gets killed is the one that half-writes. Capping turns "catch up
   * a year in one go, or die trying" into "catch up over several ticks", each
   * of which completes. Uncapped by default, because the first build of a
   * cohort is meant to replay everything in one long run from a terminal.
   */
  const sessions = maxSessions === null ? all : all.slice(0, maxSessions);
  const remaining = all.length - sessions.length;

  /* Before anything is simulated, because the point of a dry run is to answer
     "what is this about to do to production" without doing any of it. */
  if (dryRun) {
    const first = sessions[0]!.at.toISOString().slice(0, 10);
    const last = sessions[sessions.length - 1]!.at.toISOString().slice(0, 10);
    console.log(
      `  ${persona.displayName.padEnd(22)} would play ${sessions.length} session(s), ${first} to ${last}` +
        (remaining > 0 ? ` · ${remaining} would be left for the next run` : ""),
    );
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

  /* The study rows and the resume point, in one commit. Everything after this
     is either idempotent or safe to lose - see `saveStudy`. */
  const study = await saveStudy(account.id, member);
  const played: string[] = [];
  let skipped = 0;
  for (const game of games) {
    const result = await playGame({ accountId: account.id, member, request: game.request, at: game.at });
    if (result) played.push(`${result.kind} ${result.correct}/${result.answered} (${result.score})`);
    /* A game the planner could not build - too few items at that level, or a
       pool a persona's settings do not reach. Counted rather than swallowed:
       a member showing "0 game(s)" for weeks is either a quiet persona or a
       broken pool, and the two used to look identical. */
    else skipped += 1;
  }
  const xpRows = await saveStanding(account.id, member);

  const local = localDayKey(localDayOf(member.lastActivityAt ?? until, persona.utcOffsetHours));
  console.log(
    `  ${persona.displayName.padEnd(22)} ${sessions.length} session(s) to ${local}: ` +
      `${totals.reviews} reviews (${totals.correct} right), ${totals.lessons} lessons, ${played.length} game(s), ` +
      `level ${member.level}, xp ${member.ledger.xp} · wrote ${study.states} states, ${study.attempts} answers, ${xpRows} xp rows` +
      (skipped > 0 ? `, ${skipped} game(s) the planner could not build` : "") +
      (remaining > 0 ? ` · ${remaining} session(s) left for the next run` : "") +
      (played.length > 0 ? `\n      ${played.join("; ")}` : ""),
  );
}

async function play(options: Options): Promise<void> {
  const world = await loadWorld();
  if (world.subjects.length === 0) throw new Error("No UkSubject rows. Seed the ladder first (pnpm ladder:seed).");
  const accounts = await loadCohortAccounts();
  if (accounts.length === 0) {
    console.log("No simulated members yet. Try: pnpm cohort add 16");
    return;
  }
  console.log(
    `${options.dryRun ? "Dry run: " : ""}Playing ${accounts.length} member(s) up to ${options.until.toISOString()}` +
      (options.maxSessions === null ? "" : `, at most ${options.maxSessions} session(s) each`) + ":",
  );
  for (const account of accounts) await playMember(account, world, options.until, options.maxSessions, options.dryRun);
}

async function main(): Promise<void> {
  loadEnvironment();
  const options = parseArgs(process.argv.slice(2));

  if (!isLocalDatabase(process.env.DATABASE_URL) && !options.allowRemote) {
    console.error(
      "Refusing to run: DATABASE_URL is not local.\n" +
        "These accounts land on leaderboards. Take `pnpm db:backup:prod` first, then pass --allow-remote to mean it,\n" +
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
    if (options.command === "remove") await remove(options);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
