import { describe, expect, it } from "vitest";

import {
  normalizeShiritoriReading,
  shiritoriDistractorScore,
  shiritoriHeadKey,
  shiritoriReadingContinues,
  shiritoriReadingIsPlayable,
  shiritoriTailKey,
} from "@/lib/gameShiritori";

describe("Shiritori kana chain", () => {
  it("folds katakana onto hiragana and drops non-kana", () => {
    expect(normalizeShiritoriReading("コーヒー")).toBe("こーひー");
    expect(normalizeShiritoriReading("にほん ご")).toBe("にほんご");
    expect(normalizeShiritoriReading("ひらがな・カタカナ")).toBe("ひらがなかたかな");
  });

  it("chains from the last kana", () => {
    expect(shiritoriTailKey("くるま")).toBe("ま");
    expect(shiritoriTailKey("せんせい")).toBe("い");
    expect(shiritoriTailKey("がっこう")).toBe("う");
  });

  it("resolves a trailing long vowel to the vowel it lengthens", () => {
    expect(shiritoriTailKey("コーヒー")).toBe("い");
    expect(shiritoriTailKey("ラーメン")).toBeNull();
    expect(shiritoriTailKey("スーパー")).toBe("あ");
    // カード ends in ド, not the long vowel mark, so it chains from と.
    expect(shiritoriTailKey("カード")).toBe("と");
  });

  it("dead-ends on a reading that ends in ん", () => {
    expect(shiritoriTailKey("にほん")).toBeNull();
    expect(shiritoriTailKey("ん")).toBeNull();
    expect(shiritoriTailKey("")).toBeNull();
  });

  it("ignores dakuten and small kana when matching", () => {
    expect(shiritoriTailKey("きんようび")).toBe("ひ");
    expect(shiritoriTailKey("でんしゃ")).toBe("や");
    expect(shiritoriHeadKey("がっこう")).toBe("か");
    expect(shiritoriHeadKey("ばんごはん")).toBe("は");
  });

  it("links a word to the chain only when its head matches", () => {
    expect(shiritoriReadingContinues("まいにち", "ま")).toBe(true);
    expect(shiritoriReadingContinues("がくせい", "か")).toBe(true);
    expect(shiritoriReadingContinues("がくせい", "き")).toBe(false);
  });

  it("rejects a playable target that would dead-end the chain", () => {
    expect(shiritoriReadingIsPlayable("まいにち", "ま")).toBe(true);
    expect(shiritoriReadingIsPlayable("まん", "ま")).toBe(false);
    expect(shiritoriReadingIsPlayable("にほんご", "ま")).toBe(false);
  });

  it("prefers near-miss distractors over unrelated kana", () => {
    // Same vowel row as the required か, so it reads as a plausible choice.
    expect(shiritoriDistractorScore("さくら", "か")).toBeGreaterThan(shiritoriDistractorScore("ひこうき", "か"));
    // A word that actually continues the chain is never a distractor.
    expect(shiritoriDistractorScore("かいしゃ", "か")).toBe(0);
  });
});
