export const SAMPLE_CUSTOM_LIBRARY_JSON = JSON.stringify(
  {
    schemaVersion: 1,
    library: { id: "jlpt-n5-core", name: "JLPT N5 core", description: "Starter set with contiguous levels" },
    items: [
      { id: "kanji-ichi", type: "kanji", level: 1, characters: "一", meanings: ["one"], readings: ["いち", "いつ"], primaryReading: "いち" },
      { id: "vocab-nihon", type: "vocabulary", level: 2, characters: "日本", meanings: ["Japan"], readings: ["にほん", "にっぽん"] },
    ],
  },
  null,
  2,
);

export const CUSTOM_LIBRARY_AI_PROMPT = "Generate valid UmaKuma custom study JSON. Use schemaVersion 1. Include library object with id and name. Include items array with unique id, type (kanji|vocabulary), level (1-60), characters, and meanings. Optional fields: readings, primaryReading, meaningMnemonic, readingMnemonic, synonyms, notes. Include explicit kanji entries when your source contains kanji, and include radicals too when you can map them confidently. UmaKuma also auto-extracts related WaniKani kanji and radicals from your entries, so keep the output practical and complete instead of skipping likely support items. Level design rules: levels must start at 1 and be contiguous with no gaps. Do not force 60 levels unless item count supports it. Recommended minimum density is 20 items per level. Plan total levels from item count and density: 600 items -> about levels 1-30 at 20 per level; 1200 items -> about levels 1-60 at 20 per level; 2400 items -> consider about 40 items per level instead of stretching levels unnecessarily. Keep level distribution balanced and practical for progression. Output strict JSON only, no markdown.";
