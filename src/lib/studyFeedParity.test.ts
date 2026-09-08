import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { mapCustomQueueItem } from "@/lib/customStudy/customStudyQueue";
import { LADDER_STREAMS } from "@/lib/ladder/ladderStreams";
import { mapUkQueueItem } from "@/lib/uk/ukExplorerFeed";

/**
 * Three feeds, one review experience.
 *
 * John: "since we were already doing WK reviews daily, we shouldn't lose
 * that experience when we move over to the UK experience." The review modal,
 * the cards, the rows and the glyph chips are one set of components over
 * three feeds - WaniKani, our ladder, a member's library - and each feed was
 * tested alone. So the UmaKuma modal opened with no availability, no
 * look-alike warning and no meaning explanation, and no test could see it:
 * every field the UI read was simply undefined on that feed.
 *
 * The reference is what the WaniKani feed delivers, read straight from the
 * route's item literal, intersected with what the review surfaces actually
 * read. Every other feed must deliver that set, or name the field below with
 * the reason it does not. A gap that closes must be struck from the list, so
 * the list is always the true remaining distance - not a place to park.
 */
const WANIKANI_ROUTE = "src/app/api/study/[accountId]/queue/route.ts";
const UMAKUMA_ROUTE = "src/app/api/uk-study/[accountId]/queue/route.ts";
const REVIEW_SURFACES = [
  "src/app/users/[nickname]/study-explorer/components/StudyReviewModal.tsx",
  "src/app/users/[nickname]/study-explorer/components/StudyReviewModalSection.tsx",
  "src/app/users/[nickname]/study-explorer/components/StudyReviewModalMetaPanels.tsx",
  "src/app/users/[nickname]/study-explorer/components/StudyReviewModalHelpers.tsx",
  "src/app/users/[nickname]/study-explorer/components/StudyReviewGlyphContent.tsx",
  "src/app/users/[nickname]/study-explorer/components/StudyExplorerPanel.tsx",
  "src/app/users/[nickname]/study-explorer/components/StudyExplorerRows.tsx",
  "src/app/users/[nickname]/shared/GlyphStatusChipRow.tsx",
  "src/app/users/[nickname]/shared/GlyphMetadataBadges.tsx",
];

/** The keys of the item the WaniKani route returns, shorthand included. */
function wanikaniFields(): Set<string> {
  const source = readFileSync(WANIKANI_ROUTE, "utf8");
  const start = source.indexOf("return {", source.indexOf("const tags = tagBySubjectId"));
  const end = source.indexOf("\n      };", start);
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  const keys = source
    .slice(start, end)
    .split("\n")
    .flatMap((line) => line.match(/^\s+([A-Za-z]+)\s*[:,]/)?.[1] ?? []);
  return new Set(keys);
}

/** Every `item.x` / `selectedItem.x` the review surfaces read. */
function readFields(): Set<string> {
  const found = new Set<string>();
  for (const file of REVIEW_SURFACES) {
    for (const match of readFileSync(file, "utf8").matchAll(/\b(?:selectedItem|item)\.([A-Za-z]+)\b/g)) {
      found.add(match[1]!);
    }
  }
  return found;
}

function umakumaFields(): Set<string> {
  const item = mapUkQueueItem({
    subjectId: 8252, key: "kanji:身", kind: "kanji", characters: "身", level: 17, stream: LADDER_STREAMS.un,
    meanings: ["Body"], readings: ["しん"], wkSubjectId: 689, srsStage: 6, passed: true,
    wkLevel: 8, radicals: [], componentKanji: [], usedInVocabulary: [], jlptLevel: 3, jlptMeta: null, confusables: [], startedAt: null, availableAt: null,
  });
  const keys = new Set(Object.keys(item));
  /* The route dresses the page after mapping; those keys count as delivered. */
  const route = readFileSync(UMAKUMA_ROUTE, "utf8");
  if (route.includes("withWanikaniRadicalNames(")) keys.add("wanikaniName");
  if (route.includes("withStudyTags(")) keys.add("studyTags");
  if (route.includes("asInjectedTrouble(")) keys.add("isInjectedTrouble");
  return keys;
}

function customFields(): Set<string> {
  const item = mapCustomQueueItem(
    {
      id: 1, srsStage: 3, availableAt: new Date(), startedAt: new Date(), passedAt: null,
      item: { id: 7, wkLevel: 3, itemType: "kanji", characters: "身", meanings: ["Body"], readings: ["しん"], primaryReading: "しん", meaningMnemonic: null, readingMnemonic: null },
    } as Parameters<typeof mapCustomQueueItem>[0],
    new Date(),
  );
  return new Set(Object.keys(item));
}

/**
 * What each feed still does not deliver, and why. OPEN means the parity
 * ticket owes it; anything else is a reason a reader can check.
 */
const KNOWN_GAPS: Record<"umakuma" | "custom", Record<string, string>> = {
  umakuma: {},
  custom: {
    confusables: "OPEN cmtryknak - a library kanji has look-alikes too",
    jlptLevel: "OPEN cmtryknak - the N band, by character",
    jlptMeta: "OPEN cmtryknak - the dictionary panel, by character",
    studyTags: "OPEN cmtryknak - trouble and favourite marks on the card",
    isInjectedTrouble: "OPEN cmtryknak - trouble injection into a sitting",
  },
};

function parityGaps(reference: Set<string>, feed: Set<string>): string[] {
  return [...reference].filter((field) => !feed.has(field)).sort();
}

describe("the review experience is the same over every feed", () => {
  const reads = readFields();
  const wanikani = wanikaniFields();
  const expected = new Set([...reads].filter((field) => wanikani.has(field)));

  it("reads a reference the WaniKani route actually delivers", () => {
    expect(wanikani.size).toBeGreaterThan(15);
    expect(expected.size).toBeGreaterThan(10);
  });

  it.each([
    ["umakuma", umakumaFields()],
    ["custom", customFields()],
  ] as const)("%s delivers every field the UI reads from WaniKani, or names the gap", (feed, fields) => {
    const gaps = parityGaps(expected, fields);
    const known = KNOWN_GAPS[feed];
    const unexplained = gaps.filter((field) => !(field in known));
    const stale = Object.keys(known).filter((field) => !gaps.includes(field));
    expect(unexplained, `${feed} feed is missing fields the review UI reads`).toEqual([]);
    expect(stale, `${feed} gaps that have closed - strike them from KNOWN_GAPS`).toEqual([]);
  });
});
