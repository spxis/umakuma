import { describe, expect, it } from "vitest";

import {
  alreadyHeld,
  certificateSummary,
  highestCertificate,
  toCertificates,
  validateCertificate,
} from "./jlptCertificates";
import { JLPT_FIRST_YEAR } from "./jlptCertification";

const THIS_YEAR = 2026;

function row(id: string, system: string, level: number, year: number) {
  return { id, system, level, year };
}

describe("toCertificates", () => {
  /*
   * N1 is level 1 and N5 is level 5, so the hardest certificate has the
   * smallest number. Sorting on the number alone would put N5 first.
   */
  it("leads with the hardest certificate, not the newest", () => {
    const certificates = toCertificates([
      row("a", "modern", 5, 2018),
      row("b", "modern", 3, 2022),
      row("c", "modern", 4, 2020),
    ]);
    expect(certificates.map((entry) => entry.label)).toEqual(["N3", "N4", "N5"]);
  });

  it("breaks a tie on the more recent sitting", () => {
    const certificates = toCertificates([row("old", "modern", 2, 2015), row("new", "modern", 2, 2024)]);
    expect(certificates.map((entry) => entry.id)).toEqual(["new", "old"]);
  });

  it("writes an old certificate in the old scheme", () => {
    expect(toCertificates([row("a", "classic", 2, 2007)])[0]!.label).toBe("Level 2 (pre-2010)");
  });

  /* A row that names a level the test never had is not a certificate. */
  it("drops a row that cannot be a certificate", () => {
    expect(toCertificates([row("a", "classic", 5, 2007), row("b", "martian", 3, 2020)])).toEqual([]);
  });
});

describe("certificateSummary", () => {
  it("says nothing when there is nothing to say", () => {
    expect(certificateSummary([])).toBeNull();
  });

  it("names one certificate on its own", () => {
    expect(certificateSummary(toCertificates([row("a", "modern", 4, 2021)]))).toBe("N4");
  });

  /* The count is the point: the other sittings are still recorded. */
  it("counts the rest behind the hardest", () => {
    const certificates = toCertificates([
      row("a", "modern", 5, 2018),
      row("b", "modern", 3, 2022),
      row("c", "modern", 4, 2020),
    ]);
    expect(certificateSummary(certificates)).toBe("N3 + 2 more");
    expect(highestCertificate(certificates)?.label).toBe("N3");
  });
});

describe("validateCertificate", () => {
  it("takes a level the test offered that year", () => {
    expect(validateCertificate({ year: 2022, level: 3 }, THIS_YEAR, JLPT_FIRST_YEAR)).toEqual({
      ok: true,
      certificate: { system: "modern", level: 3, year: 2022 },
    });
  });

  /* The old test ran four levels; N5 has no counterpart before 2010. */
  it("refuses a level that did not exist in that year", () => {
    const result = validateCertificate({ year: 2007, level: 5 }, THIS_YEAR, JLPT_FIRST_YEAR);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("2007");
  });

  /*
   * The same number is a different certificate either side of 2010: level 3 in
   * 2007 is old Level 3, which sits between today's N4 and N2, and is not N3
   * at all - N3 was created in the restructure to bridge that gap.
   */
  it("reads the same number as the test that ran that year", () => {
    const older = validateCertificate({ year: 2007, level: 3 }, THIS_YEAR, JLPT_FIRST_YEAR);
    const newer = validateCertificate({ year: 2022, level: 3 }, THIS_YEAR, JLPT_FIRST_YEAR);
    expect(older.ok === true && older.certificate.system).toBe("classic");
    expect(newer.ok === true && newer.certificate.system).toBe("modern");
  });

  it("reads a pre-2010 year as the old test", () => {
    expect(validateCertificate({ year: 2007, level: 4 }, THIS_YEAR, JLPT_FIRST_YEAR)).toEqual({
      ok: true,
      certificate: { system: "classic", level: 4, year: 2007 },
    });
  });

  it("refuses a sitting that has not happened", () => {
    expect(validateCertificate({ year: THIS_YEAR + 1, level: 2 }, THIS_YEAR, JLPT_FIRST_YEAR).ok).toBe(false);
    expect(validateCertificate({ year: 1979, level: 2 }, THIS_YEAR, JLPT_FIRST_YEAR).ok).toBe(false);
  });

  it("asks for what it is missing", () => {
    expect(validateCertificate({ year: null, level: 2 }, THIS_YEAR, JLPT_FIRST_YEAR)).toEqual({
      ok: false,
      error: "Tell us the year you passed.",
    });
    expect(validateCertificate({ year: 2020, level: null }, THIS_YEAR, JLPT_FIRST_YEAR)).toEqual({
      ok: false,
      error: "Tell us which level you passed.",
    });
  });
});

describe("alreadyHeld", () => {
  const certificates = toCertificates([row("a", "modern", 3, 2022)]);

  it("knows the same sitting again", () => {
    expect(alreadyHeld(certificates, { system: "modern", level: 3, year: 2022 })).toBe(true);
  });

  /* Sitting N3 twice in different years is two certificates, and both count. */
  it("treats another year as another certificate", () => {
    expect(alreadyHeld(certificates, { system: "modern", level: 3, year: 2024 })).toBe(false);
  });
});
