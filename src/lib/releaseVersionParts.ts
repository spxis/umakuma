export type VersionParts = { major: number; minor: number; patch: number };

/**
 * A version, in pieces.
 *
 * Its own module because both `releaseOrdinal` and `releaseTake` need it and
 * `releaseTake` imports the ordinal - without the split the two would import
 * each other.
 */
export function parseVersion(value: string): VersionParts | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value.trim());
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}
