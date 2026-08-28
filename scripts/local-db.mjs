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
 *   pnpm db:backup            dump the REMOTE database into ./backups
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";

const COMPOSE_FILE = "docker-compose.local.yml";
const CONTAINER = "umakuma-localdb";
const BACKUP_DIR = resolve(process.cwd(), "backups");

/** Single source of truth for the local connection string. */
export const LOCAL_DATABASE_URL = "postgresql://umakuma:umakuma@127.0.0.1:55432/umakuma";

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
  return { ...process.env, DATABASE_URL: LOCAL_DATABASE_URL, DIRECT_URL: LOCAL_DATABASE_URL };
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
    const dump = args[0] ? resolve(args[0]) : newestDump();
    if (!dump || !existsSync(dump)) {
      console.error(
        "No dump found. Create one with `pnpm db:backup`, or pass a path: pnpm local:db:restore -- <file.dump>",
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

  /** Dump the REMOTE database defined in .env. Never writes to it. */
  backup() {
    loadDotEnv();
    const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
    if (!url) {
      console.error("DIRECT_URL or DATABASE_URL must be set in .env to take a backup.");
      process.exit(1);
    }
    mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
    const out = join(BACKUP_DIR, `umakuma-${stamp}.dump`);
    console.log(`Backing up ${new URL(url).hostname} to ${out} ...`);
    run("pg_dump", ["--dbname", url, "--format=custom", "--no-owner", "--no-privileges", "--file", out]);
    const listed = capture("pg_restore", ["--list", out]);
    if (listed.status !== 0) {
      console.error("Backup wrote a file but it did not verify. Do not rely on it.");
      process.exit(1);
    }
    const tables = (listed.stdout.match(/TABLE DATA/g) ?? []).length;
    console.log(`\nBackup verified: ${tables} table(s) with data.`);
    console.log(`Restore with: pnpm local:db:restore -- ${out}`);
  },

  psql() {
    requireContainer();
    run("docker", ["exec", "-it", CONTAINER, "psql", "-U", "umakuma", "-d", "umakuma"]);
  },

  /** Run any command against the local database. */
  run(args) {
    if (args.length === 0) {
      console.error("Usage: node scripts/local-db.mjs run -- <command> [args...]");
      process.exit(1);
    }
    requireContainer();
    run(args[0], args.slice(1), { env: localEnv() });
  },
};

const [command, ...rest] = process.argv.slice(2);
const handler = commands[command];
if (!handler) {
  console.error(`Unknown command "${command ?? ""}". Expected one of: ${Object.keys(commands).join(", ")}`);
  process.exit(1);
}
handler(rest.filter((value) => value !== "--"));
