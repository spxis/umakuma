import { describe, expect, it } from "vitest";

import { GAME_DIRECTIONS } from "@/lib/gameMode";
import { buildMapQuestions, mapDistractorScore } from "@/lib/gameMapQuestions";
import { seededRandom } from "@/lib/gameRandom";
import {
  JAPAN_MAP,
  JAPAN_PREFECTURES,
  JAPAN_PREFECTURE_COUNT,
  isMapSubjectId,
  mapBoxIsWholeCountry,
  mapSubjectId,
  prefectureByCode,
  prefectureCodeFromSubjectId,
  prefectureFocusBox,
  prefectureOption,
} from "@/lib/japanPrefectures";

const KYOTO = 26;
const NAGANO = 20;
const OKINAWA = 47;
const HOKKAIDO = 1;

describe("Japan prefecture map data", () => {
  it("carries all 47 prefectures exactly once", () => {
    expect(JAPAN_PREFECTURE_COUNT).toBe(47);
    const codes = JAPAN_PREFECTURES.map((entry) => entry.code).sort((left, right) => left - right);
    expect(codes).toEqual(Array.from({ length: 47 }, (_, index) => index + 1));
  });

  it("gives every prefecture a drawable path and distinct names", () => {
    for (const prefecture of JAPAN_PREFECTURES) {
      expect(prefecture.path.startsWith("M")).toBe(true);
      expect(prefecture.path.endsWith("Z")).toBe(true);
    }
    for (const key of ["kanji", "romaji", "reading"] as const) {
      const values = JAPAN_PREFECTURES.map((entry) => entry[key]);
      expect(new Set(values).size).toBe(JAPAN_PREFECTURE_COUNT);
    }
  });

  it("keeps every shape inside the viewBox", () => {
    for (const prefecture of JAPAN_PREFECTURES) {
      const [minX, minY, maxX, maxY] = prefecture.bbox;
      expect(minX).toBeGreaterThanOrEqual(0);
      expect(minY).toBeGreaterThanOrEqual(0);
      expect(maxX).toBeLessThanOrEqual(JAPAN_MAP.width);
      expect(maxY).toBeLessThanOrEqual(JAPAN_MAP.height);
    }
  });

  it("records adjacency symmetrically, and leaves the islands unattached", () => {
    for (const prefecture of JAPAN_PREFECTURES) {
      for (const neighbor of prefecture.neighbors) {
        expect(prefectureByCode(neighbor)?.neighbors).toContain(prefecture.code);
      }
    }
    // Nagano borders more prefectures than any other; Hokkaido and Okinawa
    // border none. Getting these wrong would mean the geometry was mis-joined.
    expect(prefectureByCode(NAGANO)?.neighbors).toHaveLength(8);
    expect(prefectureByCode(HOKKAIDO)?.neighbors).toEqual([]);
    expect(prefectureByCode(OKINAWA)?.neighbors).toEqual([]);
    expect(prefectureByCode(KYOTO)?.neighbors).toHaveLength(6);
  });
});

describe("Map mode subject ids", () => {
  it("round-trips a prefecture code", () => {
    for (const prefecture of JAPAN_PREFECTURES) {
      expect(prefectureCodeFromSubjectId(mapSubjectId(prefecture.code))).toBe(prefecture.code);
    }
  });

  it("never claims a WaniKani subject id", () => {
    for (const subjectId of [1, 440, 8_769, 99_999]) {
      expect(isMapSubjectId(subjectId)).toBe(false);
      expect(prefectureCodeFromSubjectId(subjectId)).toBeNull();
    }
  });

  it("shapes a prefecture into a playable option", () => {
    const option = prefectureOption(prefectureByCode(KYOTO)!);
    expect(option.characters).toBe("京都");
    expect(option.primaryMeaning).toBe("Kyoto");
    expect(option.primaryReading).toBe("きょうと");
  });
});

describe("Map mode questions", () => {
  const build = (batchSize: number, choiceCount: 2 | 3 | 4 = 2, seed = "map") =>
    buildMapQuestions(batchSize, choiceCount, seededRandom(seed), GAME_DIRECTIONS.read, "auto");

  it("builds one question per target, with the target among the choices", () => {
    const questions = build(20, 3);
    expect(questions).toHaveLength(20);
    for (const question of questions) {
      expect(question.optionSubjectIds).toHaveLength(3);
      expect(question.optionSubjectIds).toContain(question.targetSubjectId);
      expect(new Set(question.optionSubjectIds).size).toBe(3);
      for (const id of question.optionSubjectIds) expect(isMapSubjectId(id)).toBe(true);
    }
  });

  it("never asks the same prefecture twice in one round", () => {
    const targets = build(JAPAN_PREFECTURE_COUNT).map((question) => question.targetSubjectId);
    expect(new Set(targets).size).toBe(JAPAN_PREFECTURE_COUNT);
  });

  it("caps a round at the 47 prefectures available", () => {
    expect(build(50)).toHaveLength(JAPAN_PREFECTURE_COUNT);
  });

  it("spreads the correct answer across the tiles", () => {
    const slots = build(JAPAN_PREFECTURE_COUNT, 4).map((question) =>
      question.optionSubjectIds.indexOf(question.targetSubjectId),
    );
    // Every tile position must be used, or the answer would be guessable.
    expect(new Set(slots)).toEqual(new Set([0, 1, 2, 3]));
  });

  it("keeps left/middle/right in step with the option list", () => {
    for (const question of build(15, 3)) {
      expect(question.leftSubjectId).toBe(question.optionSubjectIds[0]);
      expect(question.middleSubjectId).toBe(question.optionSubjectIds[1]);
      expect(question.rightSubjectId).toBe(question.optionSubjectIds[2]);
    }
  });

  it("honours a locked answer mode", () => {
    const questions = buildMapQuestions(10, 2, seededRandom("reading"), GAME_DIRECTIONS.read, "reading");
    for (const question of questions) expect(question.answerType).toBe("reading");
  });

  it("draws choices from near the target rather than across the country", () => {
    const kyoto = prefectureByCode(KYOTO)!;
    const neighbor = prefectureByCode(kyoto.neighbors[0]!)!;
    const faraway = prefectureByCode(HOKKAIDO)!;
    expect(mapDistractorScore(kyoto, neighbor)).toBeGreaterThan(mapDistractorScore(kyoto, faraway));
  });
});

describe("Map focus framing", () => {
  it("shows the whole country when nothing is focused", () => {
    expect(mapBoxIsWholeCountry(prefectureFocusBox([]))).toBe(true);
  });

  it("zooms in on a small prefecture without leaving the map", () => {
    const box = prefectureFocusBox([37]);
    expect(mapBoxIsWholeCountry(box)).toBe(false);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(JAPAN_MAP.width + 0.001);
    expect(box.y + box.height).toBeLessThanOrEqual(JAPAN_MAP.height + 0.001);
  });

  it("frames every focused prefecture", () => {
    const codes = [KYOTO, 27, 28];
    const box = prefectureFocusBox(codes);
    for (const code of codes) {
      const [minX, minY, maxX, maxY] = prefectureByCode(code)!.bbox;
      expect(minX).toBeGreaterThanOrEqual(box.x);
      expect(minY).toBeGreaterThanOrEqual(box.y);
      expect(maxX).toBeLessThanOrEqual(box.x + box.width);
      expect(maxY).toBeLessThanOrEqual(box.y + box.height);
    }
  });
});
