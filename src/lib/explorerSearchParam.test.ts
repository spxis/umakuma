import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  clearExplorerSearch,
  EXPLORER_SEARCH_PARAM,
  LEGACY_EXPLORER_SEARCH_PARAMS,
  readExplorerSearch,
  writeExplorerSearch,
} from "./explorerSearchParam";

/**
 * One name for a search, across every explorer.
 *
 * There were four. The grade explorer used `q`; the WaniKani, JLPT and study
 * explorers each had their own, and the shared search bar coped by writing all
 * three on every submit and reading whichever matched the surface it happened
 * to be on. Nothing was broken by it - and no link to a search could be
 * guessed, because the address for "find this here" depended on which explorer
 * "here" was.
 */
describe("reading a search out of an address", () => {
  it("takes the one name", () => {
    expect(readExplorerSearch(new URLSearchParams("q=%E6%B0%B4"))).toBe("水");
  });

  /* Links already sent to people keep working. */
  it.each(LEGACY_EXPLORER_SEARCH_PARAMS)("still understands %s", (legacy) => {
    expect(readExplorerSearch(new URLSearchParams(`${legacy}=%E6%B0%B4`))).toBe("水");
  });

  it("prefers the current name when an address carries both", () => {
    expect(readExplorerSearch(new URLSearchParams("findJlpt=old&q=new"))).toBe("new");
  });

  it("treats whitespace as no search at all", () => {
    expect(readExplorerSearch(new URLSearchParams("q=%20%20"))).toBe("");
    expect(readExplorerSearch(new URLSearchParams(""))).toBe("");
  });
});

describe("writing a search into an address", () => {
  it("sets the one name and clears the old ones", () => {
    const params = new URLSearchParams("findLevel=old&findJlpt=old&findStudy=old&level=17");
    writeExplorerSearch(params, "水");

    expect(params.get(EXPLORER_SEARCH_PARAM)).toBe("水");
    for (const legacy of LEGACY_EXPLORER_SEARCH_PARAMS) {
      expect(params.get(legacy), `${legacy} should be gone`).toBeNull();
    }
    /* Everything else in the address is left alone. */
    expect(params.get("level")).toBe("17");
  });

  /*
   * Leaving a legacy name beside the new one is worse than either alone: the
   * next reader cannot tell which the page is obeying.
   */
  it("does not leave two names behind", () => {
    const params = new URLSearchParams("findJlpt=old");
    writeExplorerSearch(params, "new");
    expect(params.toString()).toBe("q=new");
  });

  it("clears rather than storing an empty search", () => {
    const params = new URLSearchParams("q=old&findLevel=old");
    clearExplorerSearch(params);
    expect(params.toString()).toBe("");
  });

  it("round-trips", () => {
    const params = new URLSearchParams();
    writeExplorerSearch(params, "  ばら  ");
    expect(readExplorerSearch(params)).toBe("ばら");
  });
});

/*
 * The point of the exercise: the address for a search is the same shape
 * wherever it is, so a link can be built - or guessed - without knowing which
 * explorer it lands on.
 */
describe("nothing writes the old names any more", () => {
  const skip = ["explorerSearchParam.ts", "explorerSearchParam.test.ts"];

  function sourceFiles(): string[] {
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.tsx?$/.test(name) && !skip.includes(name)) found.push(full);
      }
    };
    walk(join(process.cwd(), "src"));
    return found;
  }

  it("has no explorer spelling the parameter for itself", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const source = readFileSync(file, "utf8");
      for (const legacy of LEGACY_EXPLORER_SEARCH_PARAMS) {
        if (source.includes(`"${legacy}"`) || source.includes(`${legacy}=`)) {
          offenders.push(`${file.replace(`${process.cwd()}/`, "")}: ${legacy}`);
        }
      }
    }

    expect(
      offenders,
      "read and write a search through explorerSearchParam rather than naming the parameter",
    ).toEqual([]);
  });

  /* The search results link into the explorers, so they have to agree too. */
  it("builds explorer links with the shared name", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/globalSearch.ts"), "utf8");
    expect(source).toContain("EXPLORER_SEARCH_PARAM");
  });
});
