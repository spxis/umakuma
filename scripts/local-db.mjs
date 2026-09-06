/**
 * Local development database controller.
 *
 * Brings a disposable Postgres container up and down, restores a production
 * backup into it, and runs any command pointed at it. Everything a new machine
 * needs is committed: `docker-compose.local.yml`, this script, and the seeder.
 *
 *   pnpm local:db:up          start the container
 *   pnpm local:db:restore     load the newest ./backups/*.dump, then push schema
 *   pnpm local:seed           create the synthetic test user
 *   pnpm dev:local            run the dev server against the local database
 *   pnpm local:db:down        stop the container (keeps data)
 *   pnpm local:db:reset       destroy and recreate it empty
 *   pnpm db:backup:prod       dump PRODUCTION into ./backups
 *   pnpm db:backup:dev        dump the local container into ./backups
 *
 * The same script also reaches the DS1 staging snapshot, a nightly copy of
 * production that both Macs share — see deploy/staging/README.md:
 *
 *   pnpm staging:link         store the DS1 connection string in .env.local
 *   pnpm staging:pull         copy DS1's newest dump into ./backups
 *   pnpm dev:staging          run the dev server against DS1 staging
 *   pnpm staging:psql         open a psql shell on DS1 staging
 *   pnpm local:db:restore --from-ds1    pull DS1's newest dump, then restore it
 */
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import process from "node:process";

const COMPOSE_FILE = "docker-compose.local.yml";
const CONTAINER = "umakuma-localdb";
const BACKUP_DIR = resolve(process.cwd(), "backups");

/** Single source of truth for the local connection string. */
export const LOCAL_DATABASE_URL = "postgresql://umakuma:umakuma@127.0.0.1:55432/umakuma";

// --- DS1 staging snapshot ---------------------------------------------------
// Production, copied to DS1 every night at 03:30. Writable, but rebuilt on that
// schedule, so anything written to it is disposable by design.
const STAGING_ENV_KEY = "STAGING_DATABASE_URL";
const STAGING_PORT = 55432;
const STAGING_DIR = process.env.STAGING_DIR ?? "/volume2/docker/staging/umakuma";
// Tried when the stored address does not answer, so a travelling laptop still connects.
const STAGING_TAILNET_HOST = process.env.STAGING_TAILNET_HOST ?? "100.87.30.7";
// Host, user and key come from the Onibako machines file, exactly as
// deploy/staging/deploy-staging-ds1.sh reads them. No credentials live here.
const ONIBAKO_REMOTE_ENV = process.env.ONIBAKO_REMOTE_ENV ?? resolve(process.cwd(), "../onibako/.env.remote");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result;
}

function capture(command, args, options = {}) {
  return spawnSync(command, args, { encoding: "utf8", ...options });
}

function compose(...args) {
  run("docker", ["compose", "-f", COMPOSE_FILE, ...args]);
}

function localEnv() {
  return {
    ...process.env,
    DATABASE_URL: LOCAL_DATABASE_URL,
    DIRECT_URL: LOCAL_DATABASE_URL,
    // Answer WaniKani calls from the local database instead of the network.
    WANIKANI_MOCK: "1",
  };
}

function requireContainer() {
  const probe = capture("docker", ["exec", CONTAINER, "pg_isready", "-U", "umakuma", "-d", "umakuma"]);
  if (probe.status !== 0) {
    console.error(`The "${CONTAINER}" container is not running. Start it with: pnpm local:db:up`);
    process.exit(1);
  }
}

function loadDotEnv() {
  for (const filename of [".env", ".env.local"]) {
    const path = resolve(process.cwd(), filename);
    if (existsSync(path)) process.loadEnvFile(path);
  }
}

function newestDump() {
  if (!existsSync(BACKUP_DIR)) return null;
  const dumps = readdirSync(BACKUP_DIR)
    .filter((name) => name.endsWith(".dump"))
    .map((name) => join(BACKUP_DIR, name))
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);
  return dumps[0] ?? null;
}

function pushSchema() {
  console.log("\nApplying the Prisma schema to the local database...");
  run("pnpm", ["exec", "prisma", "db", "push", "--accept-data-loss", "--skip-generate"], { env: localEnv() });
}

/** Read one KEY=value out of a dotenv file without loading it into this process. */
function readEnvValue(file, key) {
  if (!existsSync(file)) return null;
  const line = readFileSync(file, "utf8")
    .split("\n")
    .reverse()
    .find((candidate) => candidate.trimStart().startsWith(`${key}=`));
  if (!line) return null;
  return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
}

/** Store a value in .env.local, replacing any existing line for that key. */
function setEnvLocal(key, value) {
  const path = resolve(process.cwd(), ".env.local");
  const lines = existsSync(path) ? readFileSync(path, "utf8").split("\n") : [];
  const kept = lines.filter((line) => !line.trimStart().startsWith(`${key}=`));
  while (kept.length > 0 && kept.at(-1).trim() === "") kept.pop();
  kept.push(`${key}=${value}`, "");
  writeFileSync(path, kept.join("\n"));
  chmodSync(path, 0o600);
}

/** DS1 ssh coordinates. Overridable, but the Onibako machines file owns them by default. */
function ds1() {
  const host = process.env.STAGING_SSH_HOST ?? readEnvValue(ONIBAKO_REMOTE_ENV, "ONIBAKO_DS1_HOST");
  const user =
    process.env.STAGING_SSH_USER ??
    readEnvValue(ONIBAKO_REMOTE_ENV, "ONIBAKO_DS1_USER") ??
    readEnvValue(ONIBAKO_REMOTE_ENV, "ONIBAKO_SSH_USER");
  const configured = process.env.STAGING_SSH_KEY ?? readEnvValue(ONIBAKO_REMOTE_ENV, "ONIBAKO_SSH_KEY_PATH");
  // The machines file writes the key path with either prefix; expand both.
  const key = configured?.replace(/^(~|\$HOME)/, process.env.HOME ?? "");
  if (!host || !user || !key || !existsSync(key)) {
    console.error(
      `Could not resolve the DS1 ssh details from ${ONIBAKO_REMOTE_ENV}.\n` +
        "Set STAGING_SSH_HOST, STAGING_SSH_USER and STAGING_SSH_KEY, or point ONIBAKO_REMOTE_ENV at the machines file.",
    );
    process.exit(1);
  }
  return { host, user, key };
}

function sshTo({ host, user, key }, command) {
  return capture("ssh", ["-i", key, "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", `${user}@${host}`, command]);
}

/** Reachability only — deliberately no credentials, so nothing secret reaches the process list. */
function answers(url) {
  const { hostname, port } = new URL(url);
  return capture("pg_isready", ["-h", hostname, "-p", port || String(STAGING_PORT), "-t", "5"]).status === 0;
}

/** The staging connection string, preferring whichever address actually answers. */
function stagingDatabaseUrl() {
  loadDotEnv();
  const stored = process.env[STAGING_ENV_KEY];
  if (!stored) {
    console.error(`${STAGING_ENV_KEY} is not set on this machine. Run: pnpm staging:link`);
    process.exit(1);
  }
  const candidates = [stored];
  if (new URL(stored).hostname !== STAGING_TAILNET_HOST) {
    const tailnet = new URL(stored);
    tailnet.hostname = STAGING_TAILNET_HOST;
    candidates.push(tailnet.toString());
  }
  const reachable = candidates.find(answers);
  if (!reachable) {
    console.error(
      `Staging did not answer on ${candidates.map((url) => new URL(url).hostname).join(" or ")}.\n` +
        "Check the stack with: ./deploy/staging/deploy-staging-ds1.sh --status",
    );
    process.exit(1);
  }
  return reachable;
}

function stagingEnv() {
  const url = stagingDatabaseUrl();
  return {
    ...process.env,
    DATABASE_URL: url,
    DIRECT_URL: url,
    // Staging carries real accounts with real encrypted tokens. Never spend them
    // on live WaniKani calls: answer from the snapshot instead.
    WANIKANI_MOCK: "1",
  };
}


/** The main working tree's .env, which is where production credentials live. */
function mainCheckoutEnv() {
  const common = capture("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  if (common.status !== 0) return null;
  const path = join(dirname(common.stdout.trim()), ".env");
  return existsSync(path) ? path : null;
}

function isLocalUrl(value) {
  try {
    const host = new URL(value).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

/**
 * The production URL, from the environment if it is there and from the main
 * checkout's .env if a worktree has overridden it to the container.
 */
function productionUrl() {
  for (const value of [process.env.DIRECT_URL, process.env.DATABASE_URL]) {
    if (value && !isLocalUrl(value)) return value;
  }
  const envPath = mainCheckoutEnv();
  if (!envPath) return null;
  const text = readFileSync(envPath, "utf8");
  for (const key of ["DIRECT_URL", "DATABASE_URL"]) {
    const line = text.split("\n").find((entry) => entry.startsWith(`${key}=`));
    const value = line?.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
    if (value && !isLocalUrl(value)) return value;
  }
  return null;
}

/** The dump itself, once somebody has said which database. */
function dumpTo(url) {
  mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
  const out = join(BACKUP_DIR, `umakuma-${stamp}.dump`);
  /* Printed from the URL handed to pg_dump, so it cannot disagree with what
     was actually dumped. Reading it was the only thing that caught the old
     bug; it stays, as the receipt rather than as the defence. */
  console.log(`Backing up ${new URL(url).hostname} to ${out} ...`);
  run("pg_dump", ["--dbname", url, "--format=custom", "--no-owner", "--no-privileges", "--file", out]);
  const listed = capture("pg_restore", ["--list", out]);
  if (listed.status !== 0) {
    console.error("Backup wrote a file but it did not verify. Do not rely on it.");
    process.exit(1);
  }
  const tables = listed.stdout.split("\n").filter((line) => line.includes("TABLE DATA")).length;
  console.log(`\nBackup verified: ${tables} table(s) with data.`);
  console.log(`Restore with: pnpm local:db:restore -- ${out}`);
}

const commands = {
  up() {
    compose("up", "-d", "--wait");
    console.log(`\nLocal database ready on ${LOCAL_DATABASE_URL}`);
  },

  down() {
    compose("down");
    console.log("\nContainer stopped. Data is kept in the umakuma-localdb volume.");
  },

  reset() {
    compose("down", "-v");
    compose("up", "-d", "--wait");
    pushSchema();
    console.log("\nLocal database reset to an empty schema.");
  },

  /** Restore a production dump so the local database has the real subject catalog. */
  restore(args) {
    requireContainer();
    const rest = args.filter((value) => value !== "--from-ds1");
    // `--from-ds1` fetches last night's staging snapshot instead of reusing a stale local file.
    if (rest.length !== args.length) commands.pull();
    const dump = rest[0] ? resolve(rest[0]) : newestDump();
    if (!dump || !existsSync(dump)) {
      console.error(
        "No dump found. Take one with `pnpm db:backup:prod`, pull DS1's newest with `pnpm staging:pull`,\n" +
          "or pass a path: pnpm local:db:restore -- <file.dump>",
      );
      process.exit(1);
    }
    console.log(`Restoring ${dump} into the local database...`);
    // Restore is noisy about objects that do not exist yet on a fresh volume.
    const result = capture("pg_restore", [
      "--dbname", LOCAL_DATABASE_URL, "--no-owner", "--no-privileges", "--clean", "--if-exists", dump,
    ]);
    const fatal = (result.stderr ?? "")
      .split("\n")
      .filter((line) => line.trim() && !/does not exist, skipping/i.test(line));
    if (result.status !== 0 && fatal.length > 0) {
      console.error(fatal.slice(0, 12).join("\n"));
      process.exit(1);
    }
    pushSchema();
    console.log("\nRestore complete. Next: pnpm local:seed");
  },

  push() {
    requireContainer();
    pushSchema();
  },

  /**
   * Dump the REMOTE database defined in .env. Never writes to it.
   *
   * **It refuses to dump a local database unless you say `--local`.** This is
   * the command AGENTS.md makes mandatory before every write to production,
   * so its whole job is to be the safety net under something irreversible -
   * and it used to dump the wrong database and call it success. The target is
   * `DIRECT_URL ?? DATABASE_URL`, and a worktree's .env points DIRECT_URL at
   * the container: run it there with an inline DATABASE_URL for Neon and
   * `loadEnvFile` leaves your inline value alone, but the `??` never reaches
   * it. You get 127.0.0.1 and "Backup verified: 43 table(s) with data."
   *
   * Found 2026-09-06, one command before deleting a production account. The
   * hostname was printed and read; nothing else would have caught it.
   *
   * So a local dump has to be asked for, and the two variables disagreeing
   * about which host they mean is refused outright - that disagreement is
   * exactly the state a worktree is in, and it is never what somebody wants.
   */
  /**
   * Backing up, with the database named in the command rather than inferred.
   *
   * There was one `backup`, and it took `DIRECT_URL ?? DATABASE_URL`. A
   * worktree's `.env` points DIRECT_URL at the local container, so running it
   * there with an inline DATABASE_URL for Neon never reached that value: you
   * got 127.0.0.1 and "Backup verified: 43 table(s) with data." That is the
   * command AGENTS.md makes mandatory before every irreversible write to
   * production, so it was a safety net that could quietly catch nothing.
   *
   * John's fix, and it is the right one: name them. `db:backup:prod` and
   * `db:backup:dev` say which database in the words you type, so there is no
   * precedence to get wrong and nothing to infer. The bare `db:backup` is kept
   * only to refuse and point at the two, because it is in older habits and in
   * every agent's memory.
   */
  "backup:prod"() {
    loadDotEnv();
    const url = productionUrl();
    if (!url) {
      console.error(
        [
          "Could not find the production database URL.",
          "",
          "Looked at DIRECT_URL and DATABASE_URL here, then at the main checkout's",
          `.env (${mainCheckoutEnv() ?? "not found"}). All of them are local or unset.`,
          "",
          "Set DIRECT_URL to the Neon URL, or run this from the main checkout.",
        ].join("\n"),
      );
      process.exit(1);
    }
    dumpTo(url);
  },

  "backup:dev"() {
    dumpTo(LOCAL_DATABASE_URL);
  },

  backup() {
    console.error(
      [
        "`pnpm db:backup` no longer guesses which database you mean.",
        "",
        "  pnpm db:backup:prod    the production database on Neon",
        "  pnpm db:backup:dev     the local container",
        "",
        "It used to take DIRECT_URL ?? DATABASE_URL, and in a worktree that is the",
        "local container - so it could dump the wrong database and still print",
        "\"Backup verified\". Before a production write you want db:backup:prod.",
      ].join("\n"),
    );
    process.exit(1);
  },

  psql(args) {
    if (args.includes("--staging")) {
      const url = new URL(stagingDatabaseUrl());
      // Passed as PG* rather than a URL argument, so the password stays out of `ps`.
      run("psql", [], {
        env: {
          ...process.env,
          PGHOST: url.hostname,
          PGPORT: url.port || String(STAGING_PORT),
          PGUSER: decodeURIComponent(url.username),
          PGPASSWORD: decodeURIComponent(url.password),
          PGDATABASE: url.pathname.slice(1),
        },
      });
      return;
    }
    requireContainer();
    run("docker", ["exec", "-it", CONTAINER, "psql", "-U", "umakuma", "-d", "umakuma"]);
  },

  /** Run any command against the local database, or against DS1 staging with --staging. */
  run(args) {
    const staging = args[0] === "--staging";
    const rest = staging ? args.slice(1) : args;
    if (rest.length === 0) {
      console.error("Usage: node scripts/local-db.mjs run [--staging] -- <command> [args...]");
      process.exit(1);
    }
    if (staging) {
      const env = stagingEnv();
      console.log(`Running against DS1 staging (${new URL(env.DATABASE_URL).hostname}), rebuilt nightly at 03:30.\n`);
      run(rest[0], rest.slice(1), { env });
      return;
    }
    requireContainer();
    run(rest[0], rest.slice(1), { env: localEnv() });
  },

  /** Fetch the DS1 staging password over ssh and store the connection string in .env.local. */
  link() {
    const remote = ds1();
    const probe = sshTo(remote, `sed -n 's/^POSTGRES_PASSWORD=//p' ${STAGING_DIR}/.env.staging`);
    const password = (probe.stdout ?? "").trim();
    if (probe.status !== 0 || !password) {
      console.error(`Could not read the staging password from DS1 (${STAGING_DIR}/.env.staging).`);
      console.error("Deploy the stack first: ./deploy/staging/deploy-staging-ds1.sh");
      process.exit(1);
    }
    const url = `postgresql://umakuma:${encodeURIComponent(password)}@${remote.host}:${STAGING_PORT}/umakuma`;
    setEnvLocal(STAGING_ENV_KEY, url);
    // The password is never printed — .env.local is the only copy on this machine.
    console.log(`${STAGING_ENV_KEY} written to .env.local: umakuma@${remote.host}:${STAGING_PORT}/umakuma`);
    console.log("Next: pnpm dev:staging");
  },

  /** Copy DS1's newest verified dump into ./backups. */
  pull() {
    const remote = ds1();
    const listing = sshTo(remote, `ls -1t ${STAGING_DIR}/dumps/*.dump 2>/dev/null | head -1`);
    const newest = (listing.stdout ?? "").trim();
    if (!newest) {
      console.error(`No dump found on DS1 in ${STAGING_DIR}/dumps.`);
      process.exit(1);
    }
    mkdirSync(BACKUP_DIR, { recursive: true });
    const local = join(BACKUP_DIR, basename(newest));
    if (existsSync(local)) {
      console.log(`Already have ${basename(newest)}.`);
      return;
    }
    console.log(`Pulling ${basename(newest)} from DS1 ...`);
    run("rsync", [
      "-az",
      "--partial",
      "-e",
      `ssh -i ${remote.key} -o BatchMode=yes -o ConnectTimeout=10`,
      `${remote.user}@${remote.host}:${newest}`,
      `${BACKUP_DIR}/`,
    ]);
    if (capture("pg_restore", ["--list", local]).status !== 0) {
      console.error("The pulled dump did not verify. Do not rely on it.");
      process.exit(1);
    }
    console.log(`\nPulled and verified: ${local}`);
  },
};

const [command, ...rest] = process.argv.slice(2);
const handler = commands[command];
if (!handler) {
  console.error(`Unknown command "${command ?? ""}". Expected one of: ${Object.keys(commands).join(", ")}`);
  process.exit(1);
}
handler(rest.filter((value) => value !== "--"));
