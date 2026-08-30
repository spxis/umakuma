import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_PATH = path.resolve("src/data/maps/jp-map.json");

async function main() {
  let existingData;
  try {
    const raw = await fs.readFile(OUTPUT_PATH, "utf8");
    existingData = JSON.parse(raw);
  } catch (e) {
    console.error("Could not read jp-map.json:", e);
    process.exitCode = 1;
    return;
  }

  const prefectures = existingData.regions || existingData.prefectures || [];

  const payload = {
    source: existingData.source || "Curated Mercator-projected vector paths with simplified Douglas-Peucker topology",
    country: "JP",
    countryName: "Japan",
    divisionTypeName: "Prefecture",
    viewBox: existingData.viewBox || "0 0 1000 1107.9",
    width: existingData.width || 1000,
    height: existingData.height || 1107.9,
    inset: existingData.inset || { code: 47, x: 20, y: 700, width: 220, height: 180 },
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
