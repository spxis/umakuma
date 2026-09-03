import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { stringifyTimeline } from "../src/lib/backlogBoard";
import { getVancouverDateKey } from "../src/lib/dailySnapshot";
import { loadFeatureTimeline } from "../src/lib/featureTimeline";
import { CODENAMES, codenameKanaForMinor, type ReleaseCodename } from "../src/lib/releaseCodenames";
import { PrismaClient } from "@prisma/client";

import { codenameProblems, entryFromTicket, minorOf, nextVersion, shipEntry } from "../src/lib/releaseTake";

/** A title as a timeline id, for a ticket that was never filed under one. */
function slugFor(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

/**
 * Takes the next release number, in one pass, immediately before pushing.
 *
 * The counter is global and several sessions draw from it at once, so a number
 * taken when the work starts is usually gone by the time the work is ready.
 * Taking it at the end is the rule; doing it by hand is where it goes wrong,
 * because the number is four things that have to agree - package.json,
 * APP_VERSION, the timeline entry, and a codename whose reading has to start
 * on the kana that minor lands on and whose words no earlier name has used.
 *
 * So this asks git what has actually been published rather than trusting the
 * working tree, and writes all four together:
 *
 *   pnpm release:take <entry-id> --romaji "Hoshii Meibo" --ja "欲しい名簿" \
 *     --reading "ほしいめいぼ" --gloss "the list you wanted to see"
 *
 * It refuses rather than guesses: a name on the wrong kana, a word already
 * spoken for, a version somebody took while you were building. Run it, read
 * what it says, then `pnpm quality:check && pnpm preflight:prod` and push.
 */
const ROOT = process.cwd();
const BOARD = join(ROOT, "src", "data", "featureTimeline.json");
const CODENAMES_FILE = join(ROOT, "src", "lib", "releaseCodenames.ts");
const VERSION_FILE = join(ROOT, "src", "lib", "appVersion.ts");
const PACKAGE_FILE = join(ROOT, "package.json");

function flag(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at > -1 ? process.argv[at + 1] : undefined;
}

/** What main is actually on, which is the only version that counts. */
function publishedVersion(): string {
  execFileSync("git", ["fetch", "origin", "--quiet"], { stdio: "inherit" });
  const raw = execFileSync("git", ["show", "origin/main:package.json"], { encoding: "utf8" });
  const version = (JSON.parse(raw) as { version?: string }).version;
  if (!version) throw new Error("origin/main's package.json has no version.");
  return version;
}

function replaceOnce(file: string, from: string, to: string): void {
  const text = readFileSync(file, "utf8");
  if (!text.includes(from)) throw new Error(`${file} does not contain ${from}`);
  writeFileSync(file, text.replace(from, to));
}

/** The footer constant and the day it shipped, which move together. */
function writeAppVersion(published: string, version: string, day: string): void {
  const text = readFileSync(VERSION_FILE, "utf8");
  const from = `export const APP_VERSION = "${published}";`;
  if (!text.includes(from)) throw new Error(`${VERSION_FILE} does not hold ${published}.`);
  writeFileSync(
    VERSION_FILE,
    text
      .replace(from, `export const APP_VERSION = "${version}";`)
      .replace(/export const APP_VERSION_DATE = "[\d-]+";/, `export const APP_VERSION_DATE = "${day}";`),
  );
}

/** Appends the codename, keeping one per line in release order. */
function appendCodename(codename: ReleaseCodename): void {
  const source = readFileSync(CODENAMES_FILE, "utf8");
  const anchor = source.lastIndexOf("  { romaji:");
  if (anchor < 0) throw new Error("Could not find the end of the codename list.");
  const lineEnd = source.indexOf("\n", anchor) + 1;
  const line =
    `  { romaji: ${JSON.stringify(codename.romaji)}, ja: ${JSON.stringify(codename.ja)}, ` +
    `reading: ${JSON.stringify(codename.reading)}, gloss: ${JSON.stringify(codename.gloss)} },\n`;
  writeFileSync(CODENAMES_FILE, source.slice(0, lineEnd) + line + source.slice(lineEnd));
}

async function main(): Promise<void> {
  /*
   * Two ways in, because the queue is in the database and the shipped record
   * is in this file.
   *
   *   pnpm release:take <entry-id> …            an entry already in the file
   *   pnpm release:take --ticket <id> …         a ticket off the board
   *
   * The second is the usual one now. It reads what the work is from the
   * ticket, writes the shipped entry, and marks the ticket shipped so the
   * board and the file agree without anybody having to remember both.
   */
  const ticketId = flag("ticket");
  const id = ticketId ? undefined : process.argv[2];
  if (!ticketId && (!id || id.startsWith("--"))) {
    console.error(
      'Usage: pnpm release:take <entry-id> --romaji "…" --ja "…" --reading "…" --gloss "…"\n' +
        '   or: pnpm release:take --ticket <ticket-id> [--as <timeline-id>] --romaji "…" …',
    );
    process.exit(1);
  }

  const published = publishedVersion();
  const version = nextVersion(published);
  const minor = minorOf(version);
  const { kana, cycle } = codenameKanaForMinor(minor);

  /* A name may already be planned ahead for this minor; only ask when it is not. */
  const planned = CODENAMES[minor - 1];
  const codename: ReleaseCodename | null =
    planned ??
    (flag("romaji") && flag("ja") && flag("reading") && flag("gloss")
      ? { romaji: flag("romaji")!, ja: flag("ja")!, reading: flag("reading")!, gloss: flag("gloss")! }
      : null);

  if (!codename) {
    console.error(
      `0.${minor}.0 has no codename yet. It lands on ${kana} (cycle ${cycle}), so pass one whose reading starts there:\n` +
        '  --romaji "…" --ja "…" --reading "…" --gloss "…"',
    );
    process.exit(1);
  }

  if (!planned) {
    const problems = codenameProblems(codename, minor, CODENAMES);
    if (problems.length > 0) {
      console.error(`That codename will not pass the gate:\n${problems.map((p) => `  - ${p.message}`).join("\n")}`);
      process.exit(1);
    }
  }

  const now = new Date();
  const stamp = { version, releasedAt: `${now.toISOString().slice(0, 19)}Z`, date: getVancouverDateKey(now) };

  let entries;
  let shippedId: string;
  if (ticketId) {
    const client = new PrismaClient({ log: ["error"] });
    try {
      const ticket = await client.featureWish.findUnique({ where: { id: ticketId } });
      if (!ticket) throw new Error(`No ticket ${ticketId} on the board.`);
      shippedId = flag("as") ?? ticket.filedAs ?? slugFor(ticket.title);
      entries = [...loadFeatureTimeline(), entryFromTicket({ ...ticket, id: shippedId }, stamp)];
      await client.featureWish.update({
        where: { id: ticketId },
        data: { status: "shipped", filedAs: shippedId, claimedBy: null, claimedAt: null },
      });
    } finally {
      await client.$disconnect();
    }
  } else {
    shippedId = id as string;
    entries = shipEntry(loadFeatureTimeline(), shippedId, stamp);
  }

  writeFileSync(BOARD, stringifyTimeline(entries));
  if (!planned) appendCodename(codename);
  writeAppVersion(published, version, getVancouverDateKey(now));
  replaceOnce(PACKAGE_FILE, `"version": "${published}"`, `"version": "${version}"`);

  console.log(
    `${shippedId} is ${version} 「${codename.reading}」${codename.ja} (${codename.romaji}).\n` +
      `Published was ${published}. Now: pnpm quality:check && pnpm preflight:prod, then push.`,
  );
}

void main();
