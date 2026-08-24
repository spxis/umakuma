import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

import { z } from "zod";

const MAX_AUTOMATED_WK_LEVEL = 3;

const configSchema = z.object({
  nickname: z.string().trim().min(2).max(32),
  expectedWkUsername: z.string().trim().min(1),
  token: z.string().trim().min(10),
  automation: z.object({
    startAvailableLessons: z.boolean().default(true),
    submitDueReviews: z.boolean().default(true),
    reviewResult: z.enum(["correct", "wrong"]).default("correct"),
    pollIntervalMinutes: z.number().int().min(5).max(1440).default(15),
    maxWritesPerCycle: z.number().int().min(1).max(500).default(100),
  }),
});

type TestAccountConfig = z.infer<typeof configSchema>;
type AssignmentRow = {
  id: number;
  data: {
    srs_stage?: unknown;
    unlocked_at?: unknown;
    started_at?: unknown;
  };
};

type CliOptions = {
  configPath: string;
  apply: boolean;
  registerOnly: boolean;
  watch: boolean;
};

function loadEnvironment(): void {
  for (const filename of [".env", ".env.local"]) {
    const path = resolve(process.cwd(), filename);
    if (existsSync(path)) process.loadEnvFile(path);
  }
}

function parseArgs(argv: string[]): CliOptions {
  const configIndex = argv.indexOf("--config");
  const configPath = configIndex >= 0 ? argv[configIndex + 1] : null;
  if (!configPath) {
    throw new Error(
      "Usage: --config /absolute/path/to/account.local.json [--apply | --register-only] [--watch]",
    );
  }
  if (!resolve(configPath).endsWith(".local.json")) {
    throw new Error("Credential config must use the ignored .local.json suffix.");
  }
  const apply = argv.includes("--apply");
  const registerOnly = argv.includes("--register-only");
  if (apply && registerOnly) throw new Error("Choose either --apply or --register-only.");
  return { configPath: resolve(configPath), apply, registerOnly, watch: argv.includes("--watch") };
}

function loadConfig(path: string): TestAccountConfig {
  const parsedJson = JSON.parse(readFileSync(path, "utf8")) as unknown;
  const parsed = configSchema.safeParse(parsedJson);
  if (!parsed.success) throw new Error("Invalid test-account config. Compare it with account.template.json.");
  if (parsed.data.token === "paste-personal-access-token-here") {
    throw new Error("Replace the template token in the local config.");
  }
  return parsed.data;
}

function isAvailableLesson(row: AssignmentRow): boolean {
  return row.data.srs_stage === 0 && typeof row.data.unlocked_at === "string" && row.data.started_at === null;
}

function isDueReview(row: AssignmentRow): boolean {
  return typeof row.data.srs_stage === "number" && row.data.srs_stage >= 1 && row.data.srs_stage <= 8;
}

async function runCycle(config: TestAccountConfig, apply: boolean, registerOnly: boolean): Promise<void> {
  const { fetchAllCollectionPages, fetchWaniKani, postWaniKani, putWaniKani } = await import(
    "../src/lib/wanikani/http"
  );
  const userResponse = await fetchWaniKani<{ data: { username: string; level: number } }>(
    "/user",
    config.token,
  );
  const user = userResponse.data?.data;
  if (!user?.username || user.username.toLowerCase() !== config.expectedWkUsername.toLowerCase()) {
    throw new Error(`Token user does not match expectedWkUsername (${config.expectedWkUsername}).`);
  }

  const [lessonCollection, reviewCollection] = await Promise.all([
    config.automation.startAvailableLessons
      ? fetchAllCollectionPages("/assignments?srs_stages=0", config.token)
      : Promise.resolve({ data: [] }),
    config.automation.submitDueReviews
      ? fetchAllCollectionPages("/assignments?immediately_available_for_review=true", config.token)
      : Promise.resolve({ data: [] }),
  ]);
  const lessons = (lessonCollection.data as AssignmentRow[]).filter(isAvailableLesson);
  const reviews = (reviewCollection.data as AssignmentRow[]).filter(isDueReview);
  const levelCapReached = user.level >= MAX_AUTOMATED_WK_LEVEL;
  const plannedWrites = levelCapReached
    ? []
    : [
        ...lessons.map((row) => ({ kind: "lesson" as const, assignmentId: row.id })),
        ...reviews.map((row) => ({ kind: "review" as const, assignmentId: row.id })),
      ].slice(0, config.automation.maxWritesPerCycle);

  console.log(JSON.stringify({
    wkUsername: user.username,
    wkLevel: user.level,
    mode: apply ? "apply" : registerOnly ? "register-only" : "dry-run",
    availableLessons: lessons.length,
    dueReviews: reviews.length,
    plannedWrites: plannedWrites.length,
    levelCapReached,
  }));
  if (!apply && !registerOnly) return;

  const { saveAccountFromToken } = await import("../src/lib/accountUpsert");
  const account = await saveAccountFromToken({ token: config.token, nickname: config.nickname });
  if (registerOnly) {
    console.log(JSON.stringify({ accountId: account.id, wkUsername: user.username, registered: true }));
    return;
  }
  let startedLessons = 0;
  let submittedReviews = 0;
  let skipped = 0;

  for (const operation of plannedWrites) {
    try {
      if (operation.kind === "lesson") {
        await putWaniKani(`/assignments/${operation.assignmentId}/start`, config.token, {});
        startedLessons += 1;
      } else {
        const incorrect = config.automation.reviewResult === "wrong" ? 1 : 0;
        await postWaniKani("/reviews", config.token, {
          review: {
            assignment_id: operation.assignmentId,
            incorrect_meaning_answers: incorrect,
            incorrect_reading_answers: incorrect,
          },
        });
        submittedReviews += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "WaniKani API error";
      if (message.includes("404") || message.includes("409") || message.includes("422")) {
        skipped += 1;
        continue;
      }
      throw error;
    }
  }

  await saveAccountFromToken({ token: config.token, nickname: config.nickname });
  console.log(JSON.stringify({
    accountId: account.id,
    wkUsername: user.username,
    startedLessons,
    submittedReviews,
    skipped,
  }));
}

async function main(): Promise<void> {
  loadEnvironment();
  const options = parseArgs(process.argv.slice(2));
  const config = loadConfig(options.configPath);
  if (options.watch && !options.apply) throw new Error("--watch requires --apply.");

  do {
    await runCycle(config, options.apply, options.registerOnly);
    if (!options.watch) break;
    await new Promise<void>((resolvePromise) => {
      setTimeout(resolvePromise, config.automation.pollIntervalMinutes * 60_000);
    });
  } while (true);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Test-account automation failed.");
  process.exitCode = 1;
});
