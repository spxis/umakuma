import { describe, expect, it } from "vitest";

import {
  JAPAN_PREFECTURE_METADATA_DATASET,
  JAPAN_PREFECTURE_METADATA_LIST,
  getPrefectureMetadataByCode,
} from "../japanPrefectures";

describe("Japan Prefecture Metadata Dataset", () => {
  it("contains all 47 prefectures with complete metadata", () => {
    expect(JAPAN_PREFECTURE_METADATA_DATASET.totalPrefectures).toBe(47);
    expect(JAPAN_PREFECTURE_METADATA_LIST).toHaveLength(47);

    for (let code = 1; code <= 47; code += 1) {
      const meta = getPrefectureMetadataByCode(code);
      expect(meta).toBeDefined();
      if (!meta) continue;

      expect(meta.code).toBe(code);
      expect(meta.kanji).toBeTypeOf("string");
      expect(meta.romaji).toBeTypeOf("string");
      expect(meta.reading).toBeTypeOf("string");
      expect(meta.capital.kanji).toBeTypeOf("string");
      expect(meta.capital.romaji).toBeTypeOf("string");
      expect(meta.largestCity.kanji).toBeTypeOf("string");
      expect(meta.largestCity.romaji).toBeTypeOf("string");
      expect(meta.largestCity.reading).toBeTypeOf("string");
      expect(meta.population).toBeGreaterThan(100_000);
      expect(meta.areaKm2).toBeGreaterThan(1_000);
      expect(meta.famousFor.foods.length).toBeGreaterThan(0);
      expect(meta.famousFor.landmarks.length).toBeGreaterThan(0);
      expect(meta.famousFor.specialties.length).toBeGreaterThan(0);
    }
  });

  it("accurately provides Tokyo, Osaka, and Kyoto capitals, largest cities, and famous items", () => {
    const tokyo = getPrefectureMetadataByCode(13);
    expect(tokyo?.capital.kanji).toBe("新宿区");
    expect(tokyo?.capital.romaji).toBe("Shinjuku");
    expect(tokyo?.famousFor.foods).toContain("Edomae Sushi");

    const osaka = getPrefectureMetadataByCode(27);
    expect(osaka?.capital.kanji).toBe("大阪市");
    expect(osaka?.largestCity.kanji).toBe("大阪市");
    expect(osaka?.famousFor.foods).toContain("Takoyaki (Octopus Balls)");

    const kyoto = getPrefectureMetadataByCode(26);
    expect(kyoto?.capital.kanji).toBe("京都市");
    expect(kyoto?.largestCity.kanji).toBe("京都市");
    expect(kyoto?.famousFor.landmarks).toContain("Fushimi Inari Shrine (Torii Gates)");

    // Test prefectures where largestCity differs from capital
    const gunma = getPrefectureMetadataByCode(10);
    expect(gunma?.capital.romaji).toBe("Maebashi");
    expect(gunma?.largestCity.romaji).toBe("Takasaki");

    const shizuoka = getPrefectureMetadataByCode(22);
    expect(shizuoka?.capital.romaji).toBe("Shizuoka");
    expect(shizuoka?.largestCity.romaji).toBe("Hamamatsu");

    const yamaguchi = getPrefectureMetadataByCode(35);
    expect(yamaguchi?.capital.romaji).toBe("Yamaguchi");
    expect(yamaguchi?.largestCity.romaji).toBe("Shimonoseki");

    const fukushima = getPrefectureMetadataByCode(7);
    expect(fukushima?.capital.romaji).toBe("Fukushima");
    expect(fukushima?.largestCity.romaji).toBe("Iwaki");
  });
});
