#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * A worktree of one's own.
 *
 * Several sessions work this repository at once, and for a long time they all
 * worked the same checkout. One working tree with several writers loses work
 * in ways that never announce themselves: a `git add -A` sweeps somebody
 * else's half-finished file into an unrelated commit, a rebase drops a
 * deletion nobody notices, a stash pop lands in the middle of another
 * session's edit. All three happened on 2026-09-02, and one board entry was
 * lost outright.
 *
 *   pnpm worktree mine          # ../umakuma-worktrees/mine, branched off origin/main
 *   pnpm worktree mine --port 6402
 *
 * The install is the part worth automating: a symlinked `node_modules` looks
 * like it works - vitest and tsc are perfectly happy - and then Turbopack
 * refuses to build, because the symlink points outside the project root. A
 * real `pnpm install` in the worktree is hard-linked from the same store, so
 * it costs seconds and a few megabytes.
 */
const [, , rawName, ...rest] = process.argv;

if (!rawName || rawName.startsWith("-")) {
  console.error("Usage: pnpm worktree <name> [--port 6402] [--from origin/main]");
  process.exit(1);
}

const flag = (name, fallback) => {
  const at = rest.indexOf(`--${name}`);
  return at > -1 && rest[at + 1] ? rest[at + 1] : fallback;
};

const name = rawName.replace(/[^a-zA-Z0-9._-]/g, "-");
const base = flag("from", "origin/main");
const port = flag("port", null);
const root = process.cwd();
const parent = join(root, "..", "umakuma-worktrees");
const path = join(parent, name);

const run = (command, args, options = {}) =>
  execFileSync(command, args, { stdio: "inherit", cwd: root, ...options });

if (existsSync(path)) {
  console.error(`${path} already exists. Use it, or remove it with: git worktree remove ${path}`);
  process.exit(1);
}

mkdirSync(parent, { recursive: true });
run("git", ["fetch", "origin", "--quiet"]);
/* Branched, not detached: a named branch is what a push and a claim can refer to. */
run("git", ["worktree", "add", path, "-b", `work/${name}`, base]);

console.log(`\nInstalling into ${path} (hard-linked from the shared store, not copied)…`);
run("pnpm", ["install", "--frozen-lockfile", "--prefer-offline"], { cwd: path });

/* The dev server ports have to differ or the second session silently gets the first one's app. */
const dev = port ? `WEB_PORT=${port} pnpm dev:local` : "pnpm dev:local";
console.log(
  [
    "",
    `Ready: ${path}`,
    `  cd ${path}`,
    `  ${dev}`,
    "",
    "Branch work/" + name + ", off " + base + ". Ship from here rather than the shared checkout:",
    "  pnpm release:take <entry-id> --romaji … --ja … --reading … --gloss …",
    "  pnpm quality:check && pnpm preflight:prod && git push origin HEAD:main",
    "",
    "When it is finished: git worktree remove " + path,
  ].join("\n"),
);
