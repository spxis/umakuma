import { execFileSync } from "node:child_process";

/**
 * Asking git what the source tree says, for the tests that sweep it.
 *
 * Five tests search the repository for a shape nobody should be writing any
 * more - a bare level badge, a hand-drawn filter count, a value falling back
 * to itself - and each had spelled out its own `execFileSync("git", ...)`,
 * its own split, and its own exclusion of test files. Same call, five times,
 * which is five chances to get one detail wrong.
 *
 * One of them did. Without `-I`, GNU grep answers a binary file with the line
 * "Binary file <path> matches", and a sweep reads that as an offender. BSD
 * grep on a developer's Mac skips it silently, so the Open Graph cards - PNGs
 * checked in under `src/app` - passed every local gate and took CI down on two
 * releases, naming two pictures as surfaces drawing a level badge.
 *
 * The guard belongs where the call is made, once, so the next sweep inherits
 * it rather than rediscovering it.
 */

/** Paths a sweep never reports, because they are the sweep or its fixtures. */
function isTestFile(line: string): boolean {
  return /\.test\.tsx?[:\s]|\.test\.tsx?$/.test(line);
}

/**
 * Lines in the tracked sources matching `pattern`, test files excluded.
 *
 * Returns `file:line:text`, the way `git grep -n` prints it. An empty result
 * is the passing case, so `expect(sweepSources(...)).toEqual([])` reads as the
 * rule it is enforcing.
 */
export function sweepSources(
  pattern: string,
  paths: readonly string[] = ["src"],
  options: { extended?: boolean; namesOnly?: boolean } = {},
): string[] {
  const flags = ["grep", "-I", options.namesOnly ? "-l" : "-n"];
  if (options.extended) flags.push("-E");
  try {
    return execFileSync("git", [...flags, pattern, "--", ...paths], { encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      .filter((line) => !isTestFile(line));
  } catch {
    /* git grep exits 1 when nothing matches, which is the answer "none". */
    return [];
  }
}

/**
 * The tracked source files under `paths`, test files excluded.
 *
 * For the sweeps that read each file themselves rather than matching a
 * pattern - a regex with a lookbehind is easier to run in the test than to
 * hand to git.
 */
export function trackedSourceFiles(paths: readonly string[] = ["src/**/*.ts", "src/**/*.tsx"]): string[] {
  return execFileSync("git", ["ls-files", "--", ...paths], { encoding: "utf8" })
    .split("\n")
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file));
}
