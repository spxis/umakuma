import { parseVersion } from "./releaseVersionParts";

/**
 * What a version number means here.
 *
 * John's scheme: **major is the big releases, minor is new features, patch is
 * tweaks.** Ordinary semver, read the way everybody reads it.
 *
 * - `1` is production - the site became one a member could actually use when a
 *   single review interface served both feeds.
 * - A feature moves the minor and resets the patch.
 * - A tweak - a fix, a follow-up, a correction to the feature before it -
 *   moves the patch.
 *
 * **Releases before production keep the `0.N.0` they shipped under.** They are
 * the record of what happened, and half of them carry no classification at
 * all, so renumbering them as features and tweaks would be inventing a history
 * rather than restating one.
 *
 * ## The ordinal is a separate thing
 *
 * The codename list is positional - the 467th release takes the 467th name,
 * and the kana that name must start on is `(ordinal - 1) % 44` along the
 * gojūon. That used to be read out of the minor, because the minor *was* the
 * count. Under this scheme it is not: 1.7.4 is the 480th release, and nothing
 * in those three numbers says so. So the count comes from counting - how many
 * releases the record holds - and the version says what kind of release each
 * one was.
 */

/** The first production release: one review interface over both feeds. */
export const PRODUCTION_MAJOR = 1;

/** Whether a release adds something or adjusts something. */
export const RELEASE_STEPS = {
  /** Something a member can now do. Moves the minor. */
  feature: "feature",
  /** A fix or a follow-up to what came before. Moves the patch. */
  tweak: "tweak",
  /** Big enough to be its own thing. Moves the major. Decided, never derived. */
  major: "major",
} as const;

export type ReleaseStep = (typeof RELEASE_STEPS)[keyof typeof RELEASE_STEPS];

/** True once a version is written the way a shipped product writes them. */
export function isProductionVersion(version: string): boolean {
  const parts = parseVersion(version);
  return parts !== null && parts.major >= PRODUCTION_MAJOR;
}

/**
 * The number the next release wears.
 *
 * The first release after the pre-production run is 1.0.0 whatever step it is
 * called, because there is no 0.x minor to carry forward: the scheme starts
 * there.
 */
export function versionAfter(published: string, step: ReleaseStep): string {
  const parts = parseVersion(published);
  if (!parts) throw new Error(`"${published}" is not a version this repository uses.`);
  if (parts.major < PRODUCTION_MAJOR) return `${PRODUCTION_MAJOR}.0.0`;

  if (step === RELEASE_STEPS.major) return `${parts.major + 1}.0.0`;
  if (step === RELEASE_STEPS.feature) return `${parts.major}.${parts.minor + 1}.0`;
  return `${parts.major}.${parts.minor}.${parts.patch + 1}`;
}

/**
 * Which of two versions is later.
 *
 * Compared field by field rather than by any single number, because no single
 * field is the count any more.
 */
export function compareVersions(left: string, right: string): number {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) throw new Error(`"${!a ? left : right}" is not a version this repository uses.`);
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}
