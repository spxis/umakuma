import { FEATURE_STATUSES, type FeatureTimelineEntry } from "./featureTimeline";
import { codenameKanaForMinor, toHiragana, type ReleaseCodename } from "./releaseCodenames";
import { compareVersions, RELEASE_STEPS, versionAfter, type ReleaseStep } from "./releaseOrdinal";

/**
 * Taking a release number, as rules rather than as a ritual.
 *
 * Several sessions ship from this repository at once and all of them draw
 * from one counter, so a number taken when the work starts is usually gone by
 * the time the work is ready. The answer is to take it immediately before
 * pushing - which is right, and which nobody does correctly by hand, because
 * "the number" is four things that have to agree:
 *
 * - `package.json` and `APP_VERSION`, which a test compares;
 * - the timeline entry, which must carry that version and a stamp that is not
 *   in the future;
 * - the codename, whose reading must begin with the kana the minor lands on -
 *   so moving 0.263 to 0.264 changes ろ to わ and invalidates the name;
 * - and that codename's romaji words, which may not repeat any earlier name's.
 *
 * Between two sessions on one afternoon that went wrong eight times: three
 * renumbers, two codenames rejected for a repeated word (`ga` is not a
 * particle the rule exempts), one for the wrong kana, and two releases that
 * claimed to have shipped a few minutes into the future.
 *
 * These are the pure parts. `scripts/release-take.ts` reads the files, asks
 * git what the last published version is, and writes the four places at once.
 */

/** Only `na` and `no` may recur: they are grammar, not words. */
const PARTICLES = new Set(["na", "no"]);


export { parseVersion, type VersionParts } from "./releaseVersionParts";

/**
 * The next release, which is always the next minor.
 *
 * A feature moves the minor and nothing else; the site has never shipped a
 * patch, and a release that did would break the codename walk, since the
 * gojūon is indexed by minor alone.
 */
export function nextVersion(published: string, step: ReleaseStep = RELEASE_STEPS.feature): string {
  return versionAfter(published, step);
}


/** Every romaji word already spoken for, particles aside. */
export function usedCodenameWords(codenames: readonly ReleaseCodename[]): Set<string> {
  const used = new Set<string>();
  for (const codename of codenames) {
    for (const word of codename.romaji.toLowerCase().split(/\s+/)) {
      if (!PARTICLES.has(word)) used.add(word);
    }
  }
  return used;
}

export type CodenameProblem = { field: "kana" | "words" | "pair" | "gloss"; message: string };

/**
 * Why a proposed codename would fail the gate, or nothing.
 *
 * Checked here rather than discovered by running the suite, because the
 * failure arrives at the end of a release - after the build, with a push
 * waiting - and every retry costs another full gate.
 */
export function codenameProblems(
  candidate: ReleaseCodename,
  release: number,
  existing: readonly ReleaseCodename[],
): CodenameProblem[] {
  const problems: CodenameProblem[] = [];
  const { kana } = codenameKanaForMinor(release);

  if (!toHiragana(candidate.reading).startsWith(kana)) {
    problems.push({
      field: "kana",
      message: `Release ${release} lands on ${kana}, and "${candidate.reading}" does not start with it.`,
    });
  }

  const used = usedCodenameWords(existing);
  for (const word of candidate.romaji.toLowerCase().split(/\s+/)) {
    if (!PARTICLES.has(word) && used.has(word)) {
      problems.push({ field: "words", message: `"${word}" is already used by an earlier codename.` });
    }
  }

  for (const field of ["romaji", "ja", "reading"] as const) {
    if (existing.some((codename) => codename[field] === candidate[field])) {
      problems.push({ field: "pair", message: `Another codename already has that ${field}.` });
    }
  }

  if (candidate.gloss.trim().length <= 3) {
    problems.push({ field: "gloss", message: "A codename needs an English gloss of its own." });
  }

  return problems;
}

export type ShipStamp = {
  version: string;
  releasedAt: string;
  date: string;
  /**
   * Which release this is, counting from the first.
   *
   * Recorded because the version stopped carrying it: with major, minor and
   * patch meaning what they ordinarily mean, 1.7.4 does not say it is the
   * 484th release - and the codename list is positional, so something has to.
   */
  release: number;
};

/**
 * The entry as it reads once it has shipped.
 *
 * The planning fields go: a release has a real date rather than an estimate,
 * no queue position, and no owner, because it is finished rather than held.
 */
/**
 * A ticket, as the shipped entry it becomes.
 *
 * The queue is in the database and the shipped record is in the file, so
 * something has to turn one into the other at the moment a release goes out.
 * This is that seam: the ticket supplies what the work *is*, the stamp
 * supplies what the release *was*, and the entry that lands in the commit
 * carries both.
 *
 * **The ticket's own words are not the entry's.** They used to be, and the
 * assumption underneath was that a ticket reads as a feature description. Most
 * do; the ones most likely to be shipped this way do not, because they are
 * written as instructions to whoever picks the work up. `/releases` is a
 * public page, and one release published "TOP PRIORITY: the header's right
 * side carries the member, not the release" with WHAT GOES, CONSTRAINTS and a
 * list of `src/` paths as its summary, beside entries that read as one
 * member-facing line.
 *
 * So the release states its own summary, and `release:take` refuses without
 * one. Of the three ways to fix this - require a summary, cap the length, or
 * take the commit subject - only the first makes somebody write the member's
 * sentence. A commit subject is closer than a ticket detail and still written
 * to the repo rather than to a reader of the releases page.
 */
export type ShippableTicket = {
  /** The timeline id to file it under; the ticket's `filedAs`, or a fresh slug. */
  id: string;
  title: string;
  detail?: string | null;
  area?: string | null;
  kind?: string | null;
};

/** What the member reads on `/releases`, written for them rather than derived. */
export type PublishedWords = {
  /** One sentence or two, in plain prose. */
  summary: string;
  /** The entry's title, when the ticket's own is written as an instruction. */
  name?: string | null;
};

/**
 * Anything that gives away a summary written to an agent rather than a member.
 *
 * Cheap and deliberately narrow: requiring `--summary` is the fix, and this
 * only catches the case where the ticket's detail is pasted straight into it.
 */
const BRIEF_MARKERS: readonly { test: RegExp; problem: string }[] = [
  { test: /\n/, problem: "runs to more than one line" },
  { test: /\bsrc\//, problem: "names a source path" },
  { test: /\b(TOP PRIORITY|WHAT GOES|CONSTRAINTS|DO NOT|MUST NOT|ASK JOHN)\b/, problem: "carries an instruction heading" },
  { test: /\bRequested \d{4}-\d{2}-\d{2}\b/, problem: "carries the ticket's own bookkeeping" },
];

/** How long a release summary may run before it stops being a summary. */
export const MAX_RELEASE_SUMMARY = 400;

/** What is wrong with a proposed summary, or nothing. */
export function releaseSummaryProblems(summary: string): string[] {
  const trimmed = summary.trim();
  const problems: string[] = [];
  if (trimmed.length === 0) problems.push("is empty");
  if (trimmed.length > MAX_RELEASE_SUMMARY) {
    problems.push(`runs to ${trimmed.length} characters, past the ${MAX_RELEASE_SUMMARY} a summary may take`);
  }
  for (const marker of BRIEF_MARKERS) {
    if (marker.test.test(trimmed)) problems.push(marker.problem);
  }
  return problems;
}

export function entryFromTicket(
  ticket: ShippableTicket,
  stamp: ShipStamp,
  published: PublishedWords,
): FeatureTimelineEntry {
  const problems = releaseSummaryProblems(published.summary);
  if (problems.length > 0) {
    throw new Error(
      `That summary ${problems.join(", and ")}. /releases is a public page: ` +
        "pass --summary with the sentence a member should read, not the ticket's own words.",
    );
  }

  return {
    id: ticket.id,
    name: (published.name ?? ticket.title).trim(),
    area: (ticket.area ?? "platform") as FeatureTimelineEntry["area"],
    kind: (ticket.kind ?? "feature") as FeatureTimelineEntry["kind"],
    status: FEATURE_STATUSES.shipped,
    date: stamp.date,
    version: stamp.version,
    release: stamp.release,
    releasedAt: stamp.releasedAt,
    summary: published.summary.trim(),
  };
}

export function shipEntry(
  entries: readonly FeatureTimelineEntry[],
  id: string,
  stamp: ShipStamp,
): FeatureTimelineEntry[] {
  const found = entries.find((entry) => entry.id === id);
  if (!found) {
    throw new Error(
      `No entry "${id}" in the timeline. Planned work lives on the board now: ` +
        `run \`pnpm task\` to find its ticket, then ship it with --ticket <id>.`,
    );
  }
  if (found.status === FEATURE_STATUSES.shipped) {
    throw new Error(`"${id}" already shipped as ${found.version ?? "an earlier release"}.`);
  }
  if (entries.some((entry) => entry.version === stamp.version)) {
    throw new Error(`${stamp.version} is already taken; fetch and try again.`);
  }

  return entries.map((entry) => {
    if (entry.id !== id) return entry;
    const shipped: FeatureTimelineEntry = {
      ...entry,
      status: FEATURE_STATUSES.shipped,
      date: stamp.date,
      version: stamp.version,
      release: stamp.release,
      releasedAt: stamp.releasedAt,
    };
    delete shipped.dateIsEstimate;
    delete shipped.release;
    delete shipped.owner;
    delete shipped.claimedAt;
    return shipped;
  });
}

/**
 * A file the release is about to rewrite, worked out before anything is written.
 *
 * The script used to write its four files one after another with no rollback,
 * so a failure part way through left the first two applied and the last two
 * not: the tree looked like a release had been taken when none had, and the
 * re-run refused because the codename it had just appended was "already used
 * by an earlier codename". Recovery was a `git checkout` of two files, which
 * is only obvious to somebody who knows what the script does.
 *
 * It happened twice on 2026-09-03, both times because another session shipped
 * mid-flight: the published version is read from `origin/main`, so the local
 * files no longer held the version the edit expected.
 *
 * Every edit is now computed first and written only once all of them are
 * possible. The checks are the same ones as before - they simply happen while
 * nothing has been touched.
 */
export type PlannedEdit = { file: string; contents: string };

/** The text with one occurrence swapped, or an error naming what was missing. */
export function editReplacingOnce(file: string, text: string, from: string, to: string): PlannedEdit {
  if (!text.includes(from)) {
    throw new Error(`${file} does not contain ${from} - has somebody else shipped since you started?`);
  }
  return { file, contents: text.replace(from, to) };
}

/** The footer constant and the day it shipped, which move together. */
export function editAppVersion(
  file: string,
  text: string,
  published: string,
  version: string,
  day: string,
  release: number,
): PlannedEdit {
  const from = `export const APP_VERSION = "${published}";`;
  if (!text.includes(from)) {
    throw new Error(`${file} does not hold ${published} - has somebody else shipped since you started?`);
  }

  return {
    file,
    contents: text
      .replace(from, `export const APP_VERSION = "${version}";`)
      .replace(/export const APP_VERSION_DATE = "[\d-]+";/, `export const APP_VERSION_DATE = "${day}";`)
      /* The count as well as the number: the version stopped carrying it, and
         the footer needs it to say what this release is called. */
      .replace(/export const APP_VERSION_RELEASE = \d+;/, `export const APP_VERSION_RELEASE = ${release};`),
  };
}

/** The codename appended, one per line, in release order. */
export function editAppendingCodename(
  file: string,
  source: string,
  codename: ReleaseCodename,
): PlannedEdit {
  const anchor = source.lastIndexOf("  { romaji:");
  if (anchor < 0) throw new Error(`Could not find the end of the codename list in ${file}.`);

  const lineEnd = source.indexOf("\n", anchor) + 1;
  const line =
    `  { romaji: ${JSON.stringify(codename.romaji)}, ja: ${JSON.stringify(codename.ja)}, ` +
    `reading: ${JSON.stringify(codename.reading)}, gloss: ${JSON.stringify(codename.gloss)} },\n`;

  return { file, contents: source.slice(0, lineEnd) + line + source.slice(lineEnd) };
}


/**
 * The higher of two versions by minor, which is the one already spoken for.
 *
 * Version allocation is a single global counter that several sessions draw
 * from, and it has gone wrong in both directions. Main moving under a local
 * run is the known half. The other half only appears once features are built
 * in a batch and stamped before any of them is pushed: every take reads the
 * same published number and hands back the same next one, so four releases
 * come out as four copies of one version.
 */
export function higherVersion(remote: string, local: string | null | undefined): string {
  if (!local) return remote;
  return compareVersions(local, remote) > 0 ? local : remote;
}
