import { beforeEach, describe, expect, it, vi } from "vitest";

import { LIST_ITEM_KINDS, LIST_VISIBILITIES } from "./domainConstants";

const accountFindFirst = vi.fn();
const findListBySlug = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("./prisma", () => ({
  prisma: {
    account: { findFirst: (args: unknown) => accountFindFirst(args) },
    /* Every character in these lists is outside the catalogue, which is fine:
       a sheet needs stroke data, not a WaniKani row. */
    wkSubjectCatalog: { findMany: async () => [] },
  },
}));
vi.mock("./studyLists", () => ({ findListBySlug: (...args: unknown[]) => findListBySlug(...args) }));
vi.mock("./strokeOrder", () => ({
  getStrokeOrder: (kanji: string) => ({ kanji, strokes: ["M10,10"], strokeCount: 1, viewBox: "0 0 109 109" }),
}));
vi.mock("./studySubjectTags", () => ({ fetchStudyTagRows: async () => [] }));
vi.mock("@/lib/studySubjectTags", () => ({ fetchStudyTagRows: async () => [] }));
vi.mock("./schoolGrades", () => ({ getSchoolGradeIndex: () => null, querySchoolGradeCatalog: () => ({ items: [], pagination: { totalItems: 0 } }) }));
vi.mock("@/lib/schoolGrades", () => ({ getSchoolGradeIndex: () => null, querySchoolGradeCatalog: () => ({ items: [], pagination: { totalItems: 0 } }) }));
vi.mock("./gradeReadings", () => ({ withOfficialReadings: (items: unknown[]) => items }));

const { PRACTICE_SOURCES, practiceEntriesFor } = await import("./practiceSource");

const READER = "reader-account";
const OWNER = "owner-account";

function list(overrides: Partial<{ visibility: string; shareToken: string | null }> = {}) {
  return {
    id: "list-1",
    name: "Week 1",
    visibility: LIST_VISIBILITIES.private,
    shareToken: null,
    items: [{ kind: LIST_ITEM_KINDS.kanji, key: "水" }],
    ...overrides,
  };
}

function sheetFor(owner: string | null, key: string | null = null) {
  return practiceEntriesFor(PRACTICE_SOURCES.list, 1, 1, 20, {
    accountId: READER,
    slug: "week-1",
    owner,
    key,
  });
}

beforeEach(() => {
  accountFindFirst.mockReset();
  findListBySlug.mockReset();
  accountFindFirst.mockResolvedValue({ id: OWNER });
});

/*
 * The address `/practice/list/<owner>/<slug>` is what makes this check
 * necessary, and it did not exist before it.
 *
 * The page guards its own address: only the member themselves or an admin
 * opens somebody's practice page. While the only list that page could reach
 * was the page owner's, that guard was the whole answer. An owner segment
 * pulls the two apart - the page is at the reader's address and the list
 * belongs to a third person - and the guard says nothing at all about them.
 */
describe("a sheet built from somebody else's list", () => {
  it("gives nothing for a private list, however the address is spelled", async () => {
    findListBySlug.mockResolvedValue(list());
    const sheet = await sheetFor("mika");
    expect(sheet.missing).toBe(true);
    expect(sheet.entries).toEqual([]);
    /* Not even its name: a title on a blank sheet still discloses the list. */
    expect(sheet.listName).toBeNull();
  });

  it("builds the sheet when the same list is public", async () => {
    findListBySlug.mockResolvedValue(list({ visibility: LIST_VISIBILITIES.public }));
    const sheet = await sheetFor("mika");
    expect(sheet.missing).toBe(false);
    expect(sheet.entries.map((entry) => entry.kanji)).toEqual(["水"]);
    expect(sheet.listName).toBe("Week 1");
  });

  it("wants the key for an unlisted list, and takes it", async () => {
    findListBySlug.mockResolvedValue(list({ visibility: LIST_VISIBILITIES.unlisted, shareToken: "abc123" }));
    expect((await sheetFor("mika")).missing).toBe(true);
    expect((await sheetFor("mika", "wrong")).missing).toBe(true);
    expect((await sheetFor("mika", "abc123")).entries).toHaveLength(1);
  });

  /* A broken link should not render as a working sheet with nothing on it. */
  it("gives nothing when the owner segment names nobody", async () => {
    accountFindFirst.mockResolvedValue(null);
    expect((await sheetFor("nobody")).missing).toBe(true);
    expect(findListBySlug).not.toHaveBeenCalled();
  });
});

describe("a sheet built from the reader's own list", () => {
  it("reads their own shelf without an owner segment, private or not", async () => {
    findListBySlug.mockResolvedValue(list());
    const sheet = await sheetFor(null);
    expect(accountFindFirst).not.toHaveBeenCalled();
    expect(findListBySlug).toHaveBeenCalledWith(READER, "week-1");
    expect(sheet.missing).toBe(false);
    expect(sheet.listName).toBe("Week 1");
  });

  /*
   * The same member, named the long way round. Somebody who copies the link
   * off their own list's page is holding an owner segment pointing at
   * themselves, and it has to mean what the short form means.
   */
  it("is still their own list when the owner segment is themselves", async () => {
    accountFindFirst.mockResolvedValue({ id: READER });
    findListBySlug.mockResolvedValue(list());
    expect((await sheetFor("reader")).missing).toBe(false);
  });
});
