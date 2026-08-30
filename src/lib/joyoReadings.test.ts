import { describe, expect, it } from "vitest";

import { withOfficialReadings } from "./gradeReadings";
import { getJoyoReadings, joyoAttribution, joyoReadingCount } from "./joyoReadings";
import type { SchoolGradeKanjiEntry } from "./schoolGrades.types";

function entry(kanji: string, kun: string[], on: string[] = []): SchoolGradeKanjiEntry {
  const readings = { on, kun };
  return { kanji, grade: 1, readings, gradeApprovedReadings: readings } as SchoolGradeKanjiEntry;
}

describe("the joyo reading table", () => {
  it("covers the whole joyo list", () => {
    expect(joyoReadingCount()).toBe(2136);
  });

  it("credits the authority and the transcription it came through", () => {
    const attribution = joyoAttribution();
    expect(attribution?.authority).toContain("文化庁");
    expect(attribution?.licence).toBe("CC0 1.0");
    expect(attribution?.commit).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe("readings the old data got wrong", () => {
  /*
   * These are the cases John reported. KANJIDIC listed のう for 王, which only
   * exists inside a compound like 親王, so the card claimed a kun reading for a
   * character that has none.
   */
  it("gives 王 no kun reading, because it has none", () => {
    const king = getJoyoReadings("王");
    expect(king?.on).toEqual(["オウ"]);
    expect(king?.kun).toEqual([]);
  });

  /*
   * The table writes on-yomi in katakana and kun-yomi in hiragana, which is
   * what settles イン: it was filed as a kun reading of 音 before.
   */
  it("files 音's イン as an on reading", () => {
    const sound = getJoyoReadings("音");
    expect(sound?.on).toEqual(["オン", "イン"]);
    expect(sound?.kun).toEqual(["おと", "ね"]);
  });

  it("cuts 生 from twenty-one readings to the ten that are taught", () => {
    expect(getJoyoReadings("生")?.kun).toHaveLength(10);
  });

  it("keeps the official example words for a reading", () => {
    expect(getJoyoReadings("下")?.examples["した"]).toEqual(["下", "下見"]);
  });

  it("has nothing for a character outside the table", () => {
    // 逢 is jinmeiyo, used in names, and is not a joyo character.
    expect(getJoyoReadings("逢")).toBeNull();
  });
});

describe("withOfficialReadings", () => {
  it("replaces a grade entry's readings with the official ones", () => {
    const [king] = withOfficialReadings([entry("王", ["-のう"], ["おう"])]);
    expect(king.readings.kun).toEqual([]);
    expect(king.readings.on).toEqual(["オウ"]);
  });

  /*
   * Name kanji are outside the joyo table by definition, so a null lookup means
   * "not joyo", not "no readings" - dropping theirs would leave a blank card.
   */
  it("leaves a name kanji's own readings alone", () => {
    const original = entry("逢", ["あう"]);
    expect(withOfficialReadings([original])[0]).toBe(original);
  });

  it("keeps the approved list in step with the readings it shows", () => {
    const [sound] = withOfficialReadings([entry("音", ["おと", "ね", "-のん", "いん"], ["おん"])]);
    expect(sound.gradeApprovedReadings).toEqual(sound.readings);
  });

  it("handles an empty page without complaint", () => {
    expect(withOfficialReadings([])).toEqual([]);
  });
});
