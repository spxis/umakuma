import { readFileSync } from "node:fs";
import { join } from "node:path";

import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SourceCredit from "@/app/shared/SourceCredit";
import { SOURCE_KEY_VALUES, SOURCE_KEYS, sourcePath } from "@/lib/sourceCredits";

import SourceReportPanel from "./SourceReportPanel";
import SourceTabs from "./SourceTabs";
import { SOURCE_DESCRIPTIONS } from "./Sources.constants";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

function render(node: Parameters<typeof renderToStaticMarkup>[0]): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(node)}</body>`).window.document;
}

/**
 * Every credit leads first to a page of ours about the source, and from there
 * to the source. A credit that jumped straight out answered "who" and nothing
 * else - not how much we hold, not when it came in, not under what terms.
 */
describe("where a credit leads", () => {
  it("links the source name to our page about it, and the licence to its text", () => {
    const doc = render(<SourceCredit source={SOURCE_KEYS.tatoeba} label="Example sentences from" />);
    const [ours, licence] = [...doc.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(ours).toBe("/sources/tatoeba");
    expect(licence).toContain("creativecommons.org");
  });

  it("has a page for every source, and copy for every page", () => {
    for (const key of SOURCE_KEY_VALUES) {
      expect(sourcePath(key)).toBe(`/sources/${key}`);
      expect(SOURCE_DESCRIPTIONS[key].takes.length).toBeGreaterThan(0);
      expect(SOURCE_DESCRIPTIONS[key].terms.length).toBeGreaterThan(20);
    }
  });

  /* No caller should still hold a credit object; the key is what a page needs. */
  it("is addressed by key everywhere it is drawn", () => {
    for (const path of [
      "src/app/shared/ExampleSentences.tsx",
      "src/app/shared/KanjiDetailModal.tsx",
      "src/app/shared/KanjiStrokeAnimation.tsx",
      "src/app/shared/SubjectDetailPanel.tsx",
      "src/app/shared/subject-page/UsedInWordsBlock.tsx",
      "src/app/shared/subject-page/MnemonicsBlock.tsx",
      "src/app/kanji/[character]/KanjiDictionaryDetail.tsx",
    ]) {
      expect(read(path), path).not.toContain("SOURCE_CREDITS.");
    }
  });
});

describe("the sources page", () => {
  it("offers every source as a tab, marking the open one", () => {
    const doc = render(<SourceTabs current={SOURCE_KEYS.kanjivg} />);
    const tabs = [...doc.querySelectorAll("a")];
    expect(tabs.map((a) => a.getAttribute("href"))).toEqual(SOURCE_KEY_VALUES.map(sourcePath));
    expect(tabs.filter((a) => a.getAttribute("aria-current") === "page").map((a) => a.textContent)).toEqual([
      SOURCE_DESCRIPTIONS.kanjivg.tab,
    ]);
  });

  it("says how much we hold, when it came in, and where it is from", () => {
    const doc = render(
      <SourceReportPanel
        source={SOURCE_KEYS.kanjidic2}
        report={{
          key: SOURCE_KEYS.kanjidic2,
          generatedAtMs: Date.parse("2026-09-03T00:00:00Z"),
          counts: [{ label: "Characters", value: 10384 }],
          lastImportedAt: "2026-09-01",
          version: "2026-244",
        }}
      />,
    );
    const text = doc.body.textContent ?? "";
    expect(text).toContain("10,384");
    expect(text).toContain("2 days ago");
    expect(text).toContain("2026-244");
    expect(text).toContain("CC BY-SA 4.0");
    /* The way out, and it leaves the site. */
    const out = [...doc.querySelectorAll("a")].find((a) => a.getAttribute("href")?.startsWith("http://www.edrdg.org"));
    expect(out?.getAttribute("target")).toBe("_blank");
  });

  it("is reachable from the footer", () => {
    expect(read("src/app/AppFooter.tsx")).toContain("SOURCES_HREF");
  });
});
