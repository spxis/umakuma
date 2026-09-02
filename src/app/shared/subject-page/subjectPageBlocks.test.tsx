import { readFileSync } from "node:fs";
import { join } from "node:path";

import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { RELATED_GROUPS } from "@/lib/relatedSubjects";
import { SOURCE_CREDITS } from "@/lib/sourceCredits";

import MnemonicsBlock from "./MnemonicsBlock";
import RelatedGroupBlock from "./RelatedGroupBlock";
import { SUBJECT_PAGE_COPY } from "./SubjectPage.constants";
import UsedInWordsBlock from "./UsedInWordsBlock";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

function render(node: Parameters<typeof renderToStaticMarkup>[0]): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(node)}</body>`).window.document;
}

/**
 * Blocks, not pages.
 *
 * A subject page is an ordered list of blocks, each fed by one source and each
 * rendering nothing at all when it has nothing. That second half is what these
 * check: a block with no data must leave no heading, no border and no credit
 * behind - a shelf with a label and nothing on it reads as a page that broke.
 */
describe("a block with nothing to say", () => {
  it("draws nothing for a kanji with no compounds", () => {
    expect(renderToStaticMarkup(<UsedInWordsBlock words={[]} />)).toBe("");
  });

  it("draws nothing for a subject with no mnemonics", () => {
    expect(renderToStaticMarkup(<MnemonicsBlock mnemonics={null} />)).toBe("");
    expect(renderToStaticMarkup(<MnemonicsBlock mnemonics={{ meaning: "", reading: "" }} />)).toBe("");
  });

  it("draws nothing for an empty relation", () => {
    expect(renderToStaticMarkup(<RelatedGroupBlock group={{ id: RELATED_GROUPS.usedIn, items: [] }} />)).toBe("");
  });
});

describe("the words a kanji appears in", () => {
  const doc = render(
    <UsedInWordsBlock
      words={[
        {
          written: "水曜日",
          pronounced: "すいようび",
          gloss: "Wednesday",
          kanji: [{ label: "曜", href: "/kanji/%E6%9B%9C", reading: "よう", meaning: "Weekday", level: 5 }],
        },
      ]}
    />,
  );

  it("shows the word, its reading and its gloss", () => {
    const text = doc.body.textContent ?? "";
    expect(text).toContain("水曜日");
    expect(text).toContain("すいようび");
    expect(text).toContain("Wednesday");
  });

  /* The word is not a link; most are not WaniKani vocabulary and have no page. */
  it("links the kanji inside the word and nothing else", () => {
    /* Subject links only; the credit at the foot leads to our sources page. */
    const hrefs = [...doc.querySelectorAll('a[href^="/"]:not([href^="/sources/"])')].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/kanji/%E6%9B%9C"]);
  });

  /* Borrowed content names where it came from, every time. */
  it("credits its source", () => {
    expect(doc.body.textContent).toContain(SOURCE_CREDITS.kanjiapi.source);
    expect(doc.body.textContent).toContain(SUBJECT_PAGE_COPY.usedInWords);
  });
});

describe("a group of related subjects", () => {
  const doc = render(
    <RelatedGroupBlock
      group={{
        id: RELATED_GROUPS.builtFrom,
        items: [
          { subjectId: 8769, subjectType: SUBJECT_TYPES.radical, label: "leaf", meaning: "Leaf", reading: null, level: 23, href: "/radicals/leaf" },
          { subjectId: 479, subjectType: SUBJECT_TYPES.kanji, label: "水", meaning: "Water", reading: "すい", level: 2, href: "/kanji/%E6%B0%B4" },
        ],
      }}
    />,
  );

  it("heads the group by what the relation is", () => {
    expect(doc.querySelector("h3")?.textContent).toBe(SUBJECT_PAGE_COPY.builtFrom);
  });

  it("links every chip to its own page", () => {
    const hrefs = [...doc.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/radicals/leaf", "/kanji/%E6%B0%B4"]);
  });

  /* A drawn radical has a name, not a character; it is not Japanese text. */
  it("does not mark a radical's English name as Japanese", () => {
    const [leaf, water] = [...doc.querySelectorAll("a span")].filter((el) => el.textContent === "leaf" || el.textContent === "水");
    expect(leaf?.getAttribute("lang")).toBeNull();
    expect(water?.getAttribute("lang")).toBe("ja");
  });
});

/*
 * The whole point of blocks is that the three pages share them. The word and
 * radical panel drew its own related chips and its own mnemonic section before
 * this; if it grows either back, the pages drift apart again.
 */
describe("the pages that share the blocks", () => {
  it("composes the kanji page from the blocks", () => {
    const page = read("src/app/kanji/[character]/page.tsx");
    for (const block of ["UsedInWordsBlock", "RelatedGroupBlock", "MnemonicsBlock", "loadKanjiPage"]) {
      expect(page).toContain(block);
    }
  });

  it("composes the word and radical panel from the same blocks", () => {
    const panel = read("src/app/shared/SubjectDetailPanel.tsx");
    expect(panel).toContain("RelatedGroupBlock");
    expect(panel).toContain("MnemonicsBlock");
    expect(panel).toContain("relatedGroupsForSubject");
    /* And never its own chips again. */
    expect(panel).not.toContain("function RelatedKanji");
  });

  /* A fact printed twice under two headings reads as two facts. */
  it("does not print the JLPT level twice on the dictionary block", () => {
    const detail = read("src/app/kanji/[character]/KanjiDictionaryDetail.tsx");
    expect(detail).toContain("!jlptLevel && entry.jlptOld");
  });
});
