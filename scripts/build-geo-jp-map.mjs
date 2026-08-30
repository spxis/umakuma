import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_SOURCE_URL =
  "https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson";
const OUTPUT_PATH = path.resolve("src/data/maps/jp-map.json");

const PREFECTURE_NAME_MAP = {
  1: { kanji: "北海道", reading: "ほっかいどう", romaji: "Hokkaido", region: "Hokkaido" },
  2: { kanji: "青森", reading: "あおもり", romaji: "Aomori", region: "Tohoku" },
  3: { kanji: "岩手", reading: "いわて", romaji: "Iwate", region: "Tohoku" },
  4: { kanji: "宮城", reading: "みやぎ", romaji: "Miyagi", region: "Tohoku" },
  5: { kanji: "秋田", reading: "あきた", romaji: "Akita", region: "Tohoku" },
  6: { kanji: "山形", reading: "やまがた", romaji: "Yamagata", region: "Tohoku" },
  7: { kanji: "福島", reading: "ふくしま", romaji: "Fukushima", region: "Tohoku" },
  8: { kanji: "茨城", reading: "いばらき", romaji: "Ibaraki", region: "Kanto" },
  9: { kanji: "栃木", reading: "とちぎ", romaji: "Tochigi", region: "Kanto" },
  10: { kanji: "群馬", reading: "ぐんま", romaji: "Gunma", region: "Kanto" },
  11: { kanji: "埼玉", reading: "さいたま", romaji: "Saitama", region: "Kanto" },
  12: { kanji: "千葉", reading: "ちば", romaji: "Chiba", region: "Kanto" },
  13: { kanji: "東京", reading: "とうきょう", romaji: "Tokyo", region: "Kanto" },
  14: { kanji: "神奈川", reading: "かながわ", romaji: "Kanagawa", region: "Kanto" },
  15: { kanji: "新潟", reading: "にいがた", romaji: "Niigata", region: "Chubu" },
  16: { kanji: "富山", reading: "とやま", romaji: "Toyama", region: "Chubu" },
  17: { kanji: "石川", reading: "いしかわ", romaji: "Ishikawa", region: "Chubu" },
  18: { kanji: "福井", reading: "ふくい", romaji: "Fukui", region: "Chubu" },
  19: { kanji: "山梨", reading: "やまなし", romaji: "Yamanashi", region: "Chubu" },
  20: { kanji: "長野", reading: "ながの", romaji: "Nagano", region: "Chubu" },
  21: { kanji: "岐阜", reading: "ぎふ", romaji: "Gifu", region: "Chubu" },
  22: { kanji: "静岡", reading: "しずおか", romaji: "Shizuoka", region: "Chubu" },
  23: { kanji: "愛知", reading: "あいち", romaji: "Aichi", region: "Chubu" },
  24: { kanji: "三重", reading: "みえ", romaji: "Mie", region: "Kansai" },
  25: { kanji: "滋賀", reading: "しが", romaji: "Shiga", region: "Kansai" },
  26: { kanji: "京都", reading: "きょうと", romaji: "Kyoto", region: "Kansai" },
  27: { kanji: "大阪", reading: "おおさか", romaji: "Osaka", region: "Kansai" },
  28: { kanji: "兵庫", reading: "ひょうご", romaji: "Hyogo", region: "Kansai" },
  29: { kanji: "奈良", reading: "なら", romaji: "Nara", region: "Kansai" },
  30: { kanji: "和歌山", reading: "わかやま", romaji: "Wakayama", region: "Kansai" },
  31: { kanji: "鳥取", reading: "とっとり", romaji: "Tottori", region: "Chugoku" },
  32: { kanji: "島根", reading: "しまね", romaji: "Shimane", region: "Chugoku" },
  33: { kanji: "岡山", reading: "おかやま", romaji: "Okayama", region: "Chugoku" },
  34: { kanji: "広島", reading: "ひろしま", romaji: "Hiroshima", region: "Chugoku" },
  35: { kanji: "山口", reading: "やまぐち", romaji: "Yamaguchi", region: "Chugoku" },
  36: { kanji: "徳島", reading: "とくしま", romaji: "Tokushima", region: "Shikoku" },
  37: { kanji: "香川", reading: "かがわ", romaji: "Kagawa", region: "Shikoku" },
  38: { kanji: "愛媛", reading: "えひめ", romaji: "Ehime", region: "Shikoku" },
  39: { kanji: "高知", reading: "こうち", romaji: "Kochi", region: "Shikoku" },
  40: { kanji: "福岡", reading: "ふくおか", romaji: "Fukuoka", region: "Kyushu" },
  41: { kanji: "佐賀", reading: "さが", romaji: "Saga", region: "Kyushu" },
  42: { kanji: "長崎", reading: "ながさき", romaji: "Nagasaki", region: "Kyushu" },
  43: { kanji: "熊本", reading: "くまもと", romaji: "Kumamoto", region: "Kyushu" },
  44: { kanji: "大分", reading: "おおいた", romaji: "Oita", region: "Kyushu" },
  45: { kanji: "宮崎", reading: "みやざき", romaji: "Miyazaki", region: "Kyushu" },
  46: { kanji: "鹿児島", reading: "かごしま", romaji: "Kagoshima", region: "Kyushu" },
  47: { kanji: "沖縄", reading: "おきなわ", romaji: "Okinawa", region: "Okinawa" },
};

function projectPoint(lon, lat) {
  const minLon = 122.5;
  const maxLon = 154.0;
  const minLat = 24.0;
  const maxLat = 46.0;
  const mapWidth = 1000;
  const mapHeight = 1107.9;

  const x = ((lon - minLon) / (maxLon - minLon)) * mapWidth;
  const y = (1 - (lat - minLat) / (maxLat - minLat)) * mapHeight;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

function simplifyRing(points, tolerance = 0.8) {
  if (points.length <= 4) return points;
  const result = [points[0]];
  let last = points[0];

  for (let i = 1; i < points.length - 1; i += 1) {
    const pt = points[i];
    const dx = pt[0] - last[0];
    const dy = pt[1] - last[1];
    if (Math.hypot(dx, dy) >= tolerance) {
      result.push(pt);
      last = pt;
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

function ringToPath(ring) {
  if (!ring.length) return "";
  const [first, ...rest] = ring;
  let d = `M${first[0]} ${first[1]}`;
  for (const pt of rest) {
    d += ` L${pt[0]} ${pt[1]}`;
  }
  d += " Z";
  return d;
}

async function fetchSourceGeoJson(customPath) {
  if (customPath) {
    const raw = await fs.readFile(path.resolve(customPath), "utf8");
    return JSON.parse(raw);
  }
  const res = await fetch(DEFAULT_SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch GeoJSON: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function main() {
  const customPath = process.argv[2];
  const geojson = await fetchSourceGeoJson(customPath);
  const prefectures = [];

  for (const feature of geojson.features) {
    const code = feature.id || feature.properties?.id || feature.properties?.code;
    const meta = PREFECTURE_NAME_MAP[code];
    if (!meta) continue;

    const coordsList = feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;

    const pathParts = [];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (const poly of coordsList) {
      for (const rawRing of poly) {
        if (rawRing.length < 3) continue;
        const projected = rawRing.map(([lon, lat]) => projectPoint(lon, lat));
        const simplified = simplifyRing(projected, 0.8);

        for (const [x, y] of simplified) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          sumX += x;
          sumY += y;
          count += 1;
        }

        pathParts.push(ringToPath(simplified));
      }
    }

    const centroid = count > 0
      ? [Math.round((sumX / count) * 10) / 10, Math.round((sumY / count) * 10) / 10]
      : [0, 0];

    prefectures.push({
      code,
      kanji: meta.kanji,
      reading: meta.reading,
      romaji: meta.romaji,
      region: meta.region,
      path: pathParts.join(" "),
      centroid,
      bbox: [minX, minY, maxX, maxY],
      neighbors: [],
    });
  }

  prefectures.sort((a, b) => a.code - b.code);

  const payload = {
    source: DEFAULT_SOURCE_URL,
    country: "JP",
    countryName: "Japan",
    divisionTypeName: "Prefecture",
    viewBox: "0 0 1000 1107.9",
    width: 1000,
    height: 1107.9,
    inset: { code: 47, x: 20, y: 700, width: 220, height: 180 },
    totalRegions: prefectures.length,
    regions: prefectures,
    totalPrefectures: prefectures.length,
    prefectures,
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");

  console.log(`Successfully compiled ${prefectures.length} prefectures map dataset.`);
  console.log(`Saved to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
