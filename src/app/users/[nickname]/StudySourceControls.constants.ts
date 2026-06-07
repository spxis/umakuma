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

export const CUSTOM_LIBRARY_AI_PROMPT = "Generate valid UmaKuma custom study JSON. Use schemaVersion 1. Include library object with id and name. Include items array with unique id, type (kanji|vocabulary), level (1-60), characters, and meanings. Optional fields: readings, primaryReading, meaningMnemonic, readingMnemonic, synonyms, notes. Ensure levels are contiguous from 1 to highest level with no gaps. Output strict JSON only, no markdown.";
