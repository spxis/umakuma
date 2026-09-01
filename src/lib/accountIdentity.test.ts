import { describe, expect, it } from "vitest";

import {
  DISPLAY_NAME_MAX_LENGTH,
  SLUG_MAX_LENGTH,
  generateFriendlyName,
  normalizeDisplayName,
  resolveDisplayName,
  slugify,
  isReservedSlug,
  RESERVED_SLUGS,
  uniqueSlug,
} from "./accountIdentity";

describe("slugify", () => {
  it("keeps an existing username usable as an address", () => {
    expect(slugify("johnmorrisdotca")).toBe("johnmorrisdotca");
    expect(slugify("KanjiMasterHana123")).toBe("kanjimasterhana123");
  });

  it("turns spaces and punctuation into single hyphens", () => {
    expect(slugify("Aria  Plumeria!")).toBe("aria-plumeria");
    expect(slugify("O'Brien")).toBe("obrien");
  });

  it("never starts or ends with a hyphen", () => {
    expect(slugify("  --hello--  ")).toBe("hello");
  });

  /*
   * A Japanese name or an emoji reduces to nothing here. Returning null rather
   * than an empty string forces the caller to generate a name instead of
   * producing an address nobody can type.
   */
  it("gives nothing back when nothing usable survives", () => {
    expect(slugify("さくら")).toBeNull();
    expect(slugify("🎌🎌")).toBeNull();
    expect(slugify("")).toBeNull();
    expect(slugify(null)).toBeNull();
  });

  it("refuses a slug too short to be an address", () => {
    expect(slugify("ab")).toBeNull();
    expect(slugify("abc")).toBe("abc");
  });

  it("caps length without leaving a trailing hyphen", () => {
    const long = slugify("a".repeat(60));
    expect(long).toHaveLength(SLUG_MAX_LENGTH);
    expect(long?.endsWith("-")).toBe(false);
  });
});

describe("uniqueSlug", () => {
  it("keeps the preferred slug when it is free", () => {
    expect(uniqueSlug("jay", new Set())).toBe("jay");
  });

  /*
   * A counter rather than random noise: the second Jay is jay-2, which reads
   * as a name rather than as something the machine made up.
   */
  it("counts up when the slug is taken", () => {
    expect(uniqueSlug("jay", new Set(["jay"]))).toBe("jay-2");
    expect(uniqueSlug("jay", new Set(["jay", "jay-2"]))).toBe("jay-3");
  });

  it("stays inside the length cap while adding a suffix", () => {
    const long = "a".repeat(SLUG_MAX_LENGTH);
    expect(uniqueSlug(long, new Set([long])).length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
  });
});

describe("generateFriendlyName", () => {
  it("reads as a name, not an id", () => {
    expect(generateFriendlyName(() => 0)).toMatch(/^[a-z]+-[a-z]+-\d{3}$/);
  });

  it("is a valid slug already, so it can be an address as it stands", () => {
    for (let i = 0; i < 50; i += 1) {
      const name = generateFriendlyName();
      expect(slugify(name)).toBe(name);
    }
  });

  it("varies", () => {
    const names = new Set(Array.from({ length: 50 }, () => generateFriendlyName()));
    expect(names.size).toBeGreaterThan(1);
  });
});

describe("normalizeDisplayName", () => {
  it("trims and collapses what someone typed", () => {
    expect(normalizeDisplayName("  Jay   Morris  ")).toBe("Jay Morris");
  });

  it("treats a cleared field as no name rather than an empty one", () => {
    expect(normalizeDisplayName("   ")).toBeNull();
    expect(normalizeDisplayName(null)).toBeNull();
  });

  it("keeps a Japanese name, which is a name even though it is not a slug", () => {
    expect(normalizeDisplayName("さくら")).toBe("さくら");
  });

  it("caps a very long name", () => {
    expect(normalizeDisplayName("x".repeat(200))).toHaveLength(DISPLAY_NAME_MAX_LENGTH);
  });
});

describe("resolveDisplayName", () => {
  it("prefers what the member chose", () => {
    expect(resolveDisplayName({ displayName: "Sakura", nickname: "John", slug: "john" })).toBe("Sakura");
  });

  it("falls back to the invite nickname, then the slug", () => {
    expect(resolveDisplayName({ displayName: null, nickname: "John", slug: "john" })).toBe("John");
    expect(resolveDisplayName({ displayName: null, nickname: null, slug: "brave-koi-401" })).toBe("brave-koi-401");
  });

  it("never renders a blank where a name belongs", () => {
    expect(resolveDisplayName({})).toBe("Member");
    expect(resolveDisplayName({ displayName: "   " })).toBe("Member");
  });
});

/*
 * Words the site uses about itself.
 *
 * Not a routing problem - every member page is under `/users/`, so no slug can
 * shadow `/admin` or `/api` however it is spelled. It is impersonation:
 * `/users/admin` or `/users/support` reads as the site speaking rather than as
 * a member, and the first person whose display name is "Admin" would take it
 * without meaning anything by it.
 */
describe("reserved slugs", () => {
  it("hands a reserved word the numbered suffix, like any collision", () => {
    expect(uniqueSlug("admin", new Set())).toBe("admin-2");
    expect(uniqueSlug("support", new Set())).toBe("support-2");
  });

  it("does not turn anyone away - only the address moves", () => {
    /* "Admin" as a display name still gets an account, just not that slug. */
    const slug = uniqueSlug("admin", new Set());
    expect(slug).toMatch(/^admin-\d+$/);
    expect(isReservedSlug(slug)).toBe(false);
  });

  it("skips a numbered candidate that is itself reserved", () => {
    /* Nothing in the list ends in a suffix today; the guard is for when it does. */
    expect(isReservedSlug(uniqueSlug("admin", new Set(["admin-2"])))).toBe(false);
  });

  it("leaves ordinary names alone", () => {
    for (const name of ["jay", "emi", "kanjimaster", "administrators-club"]) {
      expect(uniqueSlug(name, new Set())).toBe(name);
    }
  });

  it("matches case-insensitively and ignores surrounding space", () => {
    expect(isReservedSlug("ADMIN")).toBe(true);
    expect(isReservedSlug("  Support ")).toBe(true);
    expect(isReservedSlug("jay")).toBe(false);
  });

  /* A reserved word that cannot be produced by slugify would never be tested. */
  it("only lists words a slug could actually be", () => {
    for (const word of RESERVED_SLUGS) {
      expect(word, `${word} is not a possible slug`).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
