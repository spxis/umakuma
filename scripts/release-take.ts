import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { stringifyTimeline } from "../src/lib/backlogBoard";
import { getVancouverDateKey } from "../src/lib/dailySnapshot";
import { loadFeatureTimeline } from "../src/lib/featureTimeline";
import { RELEASE_STEPS } from "../src/lib/releaseOrdinal";
import { CODENAMES, codenameKanaForMinor, type ReleaseCodename } from "../src/lib/releaseCodenames";
import { PrismaClient } from "@prisma/client";

import {
  codenameProblems,
  editAppVersion,
  editAppendingCodename,
  editReplacingOnce,
  entryFromTicket,
  higherVersion,
  nextVersion,
  shipEntry,
  type PlannedEdit,
} from "../src/lib/releaseTake";

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
/* The list, not the rules: they were split when the pair crossed the 500-line
   gate, and release:take writes only the list. */
/*
 * The names live in numbered parts, and a new one goes on the end of the last:
 * the list crossed the 500-line gate at release 486 and had to be split.
 */
function lastCodenamePart(): string {
  const dir = join(ROOT, "src", "lib");
  const parts = readdirSync(dir)
    .filter((name) => /^releaseCodenameList\d+\.ts$/.test(name))
    .sort((a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")));
  if (parts.length === 0) throw new Error("No codename list parts in src/lib.");
  return join(dir, parts[parts.length - 1]);
}

const CODENAMES_FILE = lastCodenamePart();
const VERSION_FILE = join(ROOT, "src", "lib", "appVersion.ts");
const PACKAGE_FILE = join(ROOT, "package.json");

function flag(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at > -1 ? process.argv[at + 1] : undefined;
}

/**
 * The highest version already spoken for: what main has published, or what
 * this checkout has taken since, whichever is further along.
 *
 * `origin/main` alone was wrong, and quietly. Several features can be built
 * and stamped before any of them is pushed - which is the whole point of
 * batching a deploy rather than waiting out five minutes of Vercel per
 * feature - and every one of those takes read the same published number and
 * handed back the same next one. Four releases would have shipped as four
 * copies of 0.430.0, and the timeline test would only have caught it at the
 * end, after four codenames had been chosen against the wrong kana.
 *
 * Still fetches first: main moving under a local run is the other half of the
 * same question, and it is the half that already bit us three times.
 */
function publishedVersion(): string {
  execFileSync("git", ["fetch", "origin", "--quiet"], { stdio: "inherit" });
  const raw = execFileSync("git", ["show", "origin/main:package.json"], { encoding: "utf8" });
  const remote = (JSON.parse(raw) as { version?: string }).version;
  if (!remote) throw new Error("origin/main's package.json has no version.");

  const local = (JSON.parse(readFileSync("package.json", "utf8")) as { version?: string }).version;
  return higherVersion(remote, local);
}

/** Everything the release rewrites, written only once all of them are possible. */
function applyEdits(edits: readonly PlannedEdit[]): void {
  for (const edit of edits) writeFileSync(edit.file, edit.contents);
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
        '   or: pnpm release:take --ticket <ticket-id> --summary "…" [--name "…"] [--tweak|--major] [--as <timeline-id>] --romaji "…" …\n' +
        "\n--tweak for a fix or a follow-up (moves the patch), --major for a big\nrelease (moves the major). A new feature is the default and moves the minor.\n" +
        "\n--summary is what a member reads on /releases. Write it for them: one\n" +
        "sentence or two of plain prose, not the ticket's own words, which are\n" +
        "addressed to whoever picks the work up. --name overrides the ticket's\n" +
        "title where that is written as an instruction too.",
    );
    process.exit(1);
  }

  const published = publishedVersion();
  /*
   * What kind of release this is, which is what decides the number: a feature
   * moves the minor, a tweak the patch, a big release the major. Named on the
   * command line rather than guessed from the ticket, because `kind` only
   * knows feature-or-bug and a correction to yesterday's feature is neither.
   */
  const step = flag("major") !== undefined || process.argv.includes("--major")
    ? RELEASE_STEPS.major
    : process.argv.includes("--tweak")
      ? RELEASE_STEPS.tweak
      : RELEASE_STEPS.feature;
  const version = nextVersion(published, step);
  const release = loadFeatureTimeline().filter((entry) => entry.version).length + 1;
  const { kana, cycle } = codenameKanaForMinor(release);

  /* A name may already be planned ahead for this minor; only ask when it is not. */
  const planned = CODENAMES[release - 1];
  const codename: ReleaseCodename | null =
    planned ??
    (flag("romaji") && flag("ja") && flag("reading") && flag("gloss")
      ? { romaji: flag("romaji")!, ja: flag("ja")!, reading: flag("reading")!, gloss: flag("gloss")! }
      : null);

  if (!codename) {
    console.error(
      `${version} has no codename yet. It lands on ${kana} (cycle ${cycle}), so pass one whose reading starts there:\n` +
        '  --romaji "…" --ja "…" --reading "…" --gloss "…"',
    );
    process.exit(1);
  }

  if (!planned) {
    const problems = codenameProblems(codename, release, CODENAMES);
    if (problems.length > 0) {
      console.error(`That codename will not pass the gate:\n${problems.map((p) => `  - ${p.message}`).join("\n")}`);
      process.exit(1);
    }
  }

  const now = new Date();
  const stamp = { version, releasedAt: `${now.toISOString().slice(0, 19)}Z`, date: getVancouverDateKey(now), release };

  let entries;
  let shippedId: string;
  /*
   * The board row is marked shipped after the files are written, not before.
   * A release that refuses half way used to leave the ticket closed and the
   * tree unreleased, which is the same half-state one level up.
   */
  let markTicketShipped: () => Promise<void> = async () => {};

  if (ticketId) {
    const client = new PrismaClient({ log: ["error"] });
    let ticket;
    try {
      ticket = await client.ticket.findUnique({ where: { id: ticketId } });
    } finally {
      await client.$disconnect();
    }

    if (!ticket) throw new Error(`No ticket ${ticketId} on the board.`);
    shippedId = flag("as") ?? ticket.filedAs ?? slugFor(ticket.title);
    /* The release states its own words. Refused rather than derived - see
       entryFromTicket, and the release that published an agent brief. */
    const summary = flag("summary");
    if (!summary) {
      throw new Error(
        "--summary is required with --ticket. /releases is a public page and a " +
          "ticket's detail is written to whoever picks the work up, not to a member. " +
          "Pass the sentence they should read.",
      );
    }
    entries = [
      ...loadFeatureTimeline(),
      entryFromTicket({ ...ticket, id: shippedId }, stamp, { summary, name: flag("name") }),
    ];

    const closing = shippedId;
    markTicketShipped = async () => {
      const writer = new PrismaClient({ log: ["error"] });
      try {
        await writer.ticket.update({
          where: { id: ticketId },
          data: { status: "shipped", filedAs: closing, claimedBy: null, claimedAt: null },
        });
      } finally {
        await writer.$disconnect();
      }
    };
  } else {
    shippedId = id as string;
    entries = shipEntry(loadFeatureTimeline(), shippedId, stamp);
  }

  /*
   * Worked out first, written second. Any of these can refuse - most often
   * because another session shipped while this one was choosing a codename -
   * and a refusal has to leave the tree exactly as it found it.
   */
  const edits: PlannedEdit[] = [
    { file: BOARD, contents: stringifyTimeline(entries) },
    ...(planned
      ? []
      : [editAppendingCodename(CODENAMES_FILE, readFileSync(CODENAMES_FILE, "utf8"), codename)]),
    editAppVersion(
      VERSION_FILE,
      readFileSync(VERSION_FILE, "utf8"),
      published,
      version,
      getVancouverDateKey(now),
    ),
    editReplacingOnce(
      PACKAGE_FILE,
      readFileSync(PACKAGE_FILE, "utf8"),
      `"version": "${published}"`,
      `"version": "${version}"`,
    ),
  ];

  applyEdits(edits);
  await markTicketShipped();

  console.log(
    `${shippedId} is ${version} 「${codename.reading}」${codename.ja} (${codename.romaji}).\n` +
      `Published was ${published}. Now: pnpm quality:check && pnpm preflight:prod, then push.`,
  );
}

void main();
