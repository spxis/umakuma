import { describe, expect, it } from "vitest";

import { tokenizeJapanese } from "./newsTokenize";

describe("tokenizeJapanese", () => {
  it("keeps okurigana with kanji for inflectional forms", () => {
    const segments = tokenizeJapanese("高い山 食べたり飲んだり");
    const kanjiRuns = segments.filter((segment) => segment.kind === "kanji").map((segment) => segment.text);

    expect(kanjiRuns).toContain("高い");
    expect(kanjiRuns).toContain("食べたり");
    expect(kanjiRuns).toContain("飲んだり");
  });

  it("does not swallow particles after a kanji word", () => {
    const segments = tokenizeJapanese("物語を元にした");
    const kanjiRuns = segments.filter((segment) => segment.kind === "kanji").map((segment) => segment.text);

    expect(kanjiRuns).toContain("物語");
    expect(kanjiRuns).not.toContain("物語を");
    expect(kanjiRuns).toContain("元");
  });

  it("does not attach particle-led kana to the preceding kanji run", () => {
    const segments = tokenizeJapanese("基調にした");
    const kanjiRuns = segments.filter((segment) => segment.kind === "kanji").map((segment) => segment.text);

    expect(kanjiRuns).toEqual(["基調"]);
    expect(segments.some((segment) => segment.kind === "other" && segment.text.includes("にした"))).toBe(true);
  });

  it("keeps indefinite pronoun suffix before following particle", () => {
    const segments = tokenizeJapanese("誰かの声");
    const kanjiRuns = segments.filter((segment) => segment.kind === "kanji").map((segment) => segment.text);

    expect(kanjiRuns).toContain("誰か");
    expect(kanjiRuns).not.toContain("誰");
    expect(segments.some((segment) => segment.kind === "other" && segment.text.includes("の"))).toBe(true);
  });

  it("keeps 誰も and 何も as one lexical unit", () => {
    const segments = tokenizeJapanese("誰も知らない。何もない。");
    const kanjiRuns = segments.filter((segment) => segment.kind === "kanji").map((segment) => segment.text);

    expect(kanjiRuns).toContain("誰も");
    expect(kanjiRuns).toContain("何も");
    expect(kanjiRuns).not.toContain("何もない");
    expect(kanjiRuns).not.toContain("誰");
    expect(kanjiRuns).not.toContain("何");
  });

  it("does not merge generic particle か after normal nouns", () => {
    const segments = tokenizeJapanese("花か草か");
    const kanjiRuns = segments.filter((segment) => segment.kind === "kanji").map((segment) => segment.text);

    expect(kanjiRuns).toEqual(["花", "草"]);
  });

  it("keeps verb intent forms without swallowing following object marker", () => {
    const segments = tokenizeJapanese("花を贈りたい人");
    const kanjiRuns = segments.filter((segment) => segment.kind === "kanji").map((segment) => segment.text);

    expect(kanjiRuns).toEqual(["花", "贈りたい", "人"]);
    expect(kanjiRuns).not.toContain("花を");
  });

  it("keeps adjective and ichidan style okurigana runs", () => {
    const segments = tokenizeJapanese("高い音を届けたい");
    const kanjiRuns = segments.filter((segment) => segment.kind === "kanji").map((segment) => segment.text);

    expect(kanjiRuns).toContain("高い");
    expect(kanjiRuns).toContain("届けたい");
    expect(kanjiRuns).not.toContain("音を");
  });

  it("does not create giant merged clickable runs after numeric counters", () => {
    const segments = tokenizeJapanese("さん55歳地方公務員愛知県在住");
    const kanjiRuns = segments.filter((segment) => segment.kind === "kanji").map((segment) => segment.text);

    expect(kanjiRuns).not.toContain("歳地方公務員愛知県在住");
    expect(kanjiRuns).toContain("歳");
  });
});
