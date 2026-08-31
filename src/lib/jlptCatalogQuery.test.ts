import { describe, expect, it } from "vitest";

import {
  buildCatalogOrderBy,
  buildCatalogWhere,
  isDownloadRequest,
  toCatalogQuery,
} from "./jlptCatalogQuery";
import type { JlptCatalogQuery } from "./jlptCatalogTypes";

/**
 * The query layer, now shared between the admin catalogue and member study.
 *
 * It was three hundred lines inside an admin route, which is why a member with
 * no WaniKani account could not read a table that has never had a WaniKani
 * column. Two callers now depend on it behaving identically, so the parsing and
 * the ordering are worth pinning down.
 */

function url(search: string): URL {
  return new URL(`https://example.com/api/jlpt/catalog${search}`);
}

const BASE: JlptCatalogQuery = {
  page: 1,
  pageSize: 40,
  nLevel: null,
  enrichment: "all",
  search: null,
  sortBy: "nLevel",
  sortDir: "asc",
};

describe("reading a catalogue query off a URL", () => {
  it("defaults to the whole catalogue", () => {
    expect(toCatalogQuery(url(""))).toEqual(BASE);
  });

  it("reads a level, and treats 'all' as no filter", () => {
    expect(toCatalogQuery(url("?nLevel=3"))?.nLevel).toBe(3);
    expect(toCatalogQuery(url("?nLevel=all"))?.nLevel).toBeNull();
  });

  it("refuses a level that is not a JLPT level", () => {
    expect(toCatalogQuery(url("?nLevel=6"))).toBeNull();
    expect(toCatalogQuery(url("?nLevel=0"))).toBeNull();
  });

  it("refuses a page size that would read the whole table", () => {
    // The cap is what stops one request pulling every row into memory.
    expect(toCatalogQuery(url("?pageSize=99999"))).toBeNull();
    expect(toCatalogQuery(url("?pageSize=5000"))?.pageSize).toBe(5000);
  });

  it("treats an empty search as no search", () => {
    expect(toCatalogQuery(url("?search="))?.search).toBeNull();
    expect(toCatalogQuery(url("?search=%20%20"))?.search).toBeNull();
    expect(toCatalogQuery(url("?search=fire"))?.search).toBe("fire");
  });

  it("recognises a download only when asked for explicitly", () => {
    expect(isDownloadRequest(url("?download=1"))).toBe(true);
    expect(isDownloadRequest(url("?download=0"))).toBe(false);
    expect(isDownloadRequest(url(""))).toBe(false);
  });
});

describe("what the query filters on", () => {
  it("filters nothing by default", () => {
    expect(buildCatalogWhere(BASE)).toEqual({});
  });

  it("uses a bare condition for a single filter rather than wrapping it", () => {
    expect(buildCatalogWhere({ ...BASE, nLevel: 5 })).toEqual({ nLevel: 5 });
  });

  it("combines several filters with AND", () => {
    const where = buildCatalogWhere({ ...BASE, nLevel: 5, search: "fire" });
    expect(where.AND).toHaveLength(2);
  });

  it("searches the character, the meaning and the Heisig keyword", () => {
    const where = buildCatalogWhere({ ...BASE, search: "fire" });
    const fields = (where.OR ?? []).map((clause) => Object.keys(clause)[0]);
    expect(fields).toEqual(["kanji", "primaryMeaning", "heisigKeyword"]);
  });
});

describe("how results are ordered", () => {
  /*
   * The tie-breakers are the whole reason this is tested. Sorting by stroke
   * count alone leaves rows with the same count in whatever order Postgres
   * returns them, which is not stable between queries - so paging through the
   * catalogue can show one character twice and skip another entirely.
   */
  it("always breaks ties on level then character", () => {
    const order = buildCatalogOrderBy({ ...BASE, sortBy: "kanji", sortDir: "desc" });
    expect(order[0]).toEqual({ kanji: "desc" });
    expect(order.slice(1)).toEqual([{ nLevel: "asc" }, { kanji: "asc" }]);
  });

  it("honours the requested direction", () => {
    expect(buildCatalogOrderBy({ ...BASE, sortDir: "desc" })[0]).toEqual({ nLevel: "desc" });
  });
});
