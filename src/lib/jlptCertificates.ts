import {
  JLPT_SYSTEMS,
  formatJlptLevel,
  isJlptSystem,
  jlptSystemForYear,
  levelsForSystem,
  type JlptSystem,
} from "./jlptCertification";

/**
 * The certificates a member reports holding.
 *
 * A member may hold several: the ladder is meant to be climbed, and somebody
 * who sat N5, then N4, then N3 holds three certificates rather than one
 * current level. The profile used to keep a single answer, so reporting a new
 * pass quietly erased the last one.
 *
 * Order is by how hard the certificate is, not by when it was earned: N1 is
 * level 1 and N5 is level 5, so the levels sort ascending and the most
 * advanced reads first. A tie - the same level in both systems - puts the more
 * recent sitting first.
 */
export type JlptCertificateRow = {
  id: string;
  system: string;
  level: number;
  year: number;
};

export type JlptCertificate = {
  id: string;
  system: JlptSystem;
  level: number;
  year: number;
  /** "N3", or "Level 2 (pre-2010)". */
  label: string;
};

/** Keeps the rows that name a certificate that could exist, and orders them. */
export function toCertificates(rows: readonly JlptCertificateRow[]): JlptCertificate[] {
  return rows
    .flatMap((row) => {
      if (!isJlptSystem(row.system)) return [];
      if (!(levelsForSystem(row.system) as readonly number[]).includes(row.level)) return [];
      return [{
        id: row.id,
        system: row.system,
        level: row.level,
        year: row.year,
        label: formatJlptLevel(row.system, row.level),
      }];
    })
    .sort((left, right) => left.level - right.level || right.year - left.year);
}

/** The hardest certificate held, which is the one a member leads with. */
export function highestCertificate(certificates: readonly JlptCertificate[]): JlptCertificate | null {
  return certificates[0] ?? null;
}

/**
 * What the profile card says.
 *
 * The hardest certificate, and how many others there are - "N3" alone, or
 * "N3 + 2 more". The count is the point: a member who sat three tests should
 * see that the other two are still recorded.
 */
export function certificateSummary(certificates: readonly JlptCertificate[]): string | null {
  const highest = highestCertificate(certificates);
  if (!highest) return null;
  const others = certificates.length - 1;
  return others > 0 ? `${highest.label} + ${others} more` : highest.label;
}

/** Whether this certificate is already held, so adding it again is a no-op rather than a duplicate. */
export function alreadyHeld(
  certificates: readonly JlptCertificate[],
  candidate: { system: JlptSystem; level: number; year: number },
): boolean {
  return certificates.some(
    (held) => held.system === candidate.system && held.level === candidate.level && held.year === candidate.year,
  );
}

export type NewCertificate = { system: JlptSystem; level: number; year: number };

export type CertificateValidation = { ok: true; certificate: NewCertificate } | { ok: false; error: string };

/**
 * One certificate, checked before it is written.
 *
 * The year decides the system, so a level is checked against the test that
 * actually ran that year: N3 did not exist before 2010, and Level 4 has not
 * been offered since 2009.
 */
export function validateCertificate(
  input: { year: number | null; level: number | null },
  currentYear: number,
  firstYear: number,
): CertificateValidation {
  const { year, level } = input;
  if (year === null) return { ok: false, error: "Tell us the year you passed." };
  if (!Number.isInteger(year) || year < firstYear || year > currentYear) {
    return { ok: false, error: `The year must be between ${firstYear} and ${currentYear}.` };
  }

  const system = jlptSystemForYear(year);
  if (system === null) return { ok: false, error: "That year is before the JLPT existed." };
  if (level === null) return { ok: false, error: "Tell us which level you passed." };
  if (!(levelsForSystem(system) as readonly number[]).includes(level)) {
    return { ok: false, error: `${formatJlptLevel(system, level)} was not offered in ${year}.` };
  }

  return { ok: true, certificate: { system, level, year } };
}

/** The systems, exported here so a caller needs one import for certificates. */
export { JLPT_SYSTEMS };
