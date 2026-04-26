import { fetchAllCollectionPages } from "@/lib/wanikani/http";

export type LookupKanjiItem = {
  char: string;
  subjectId: number | null;
  meanings: string[];
  readings: string[];
  primaryReadings: string[];
  meaningExplanation: string;
  readingExplanation: string;
  wkLevel: number | null;
};

const CHUNK_SIZE = 60;

export async function lookupKanjiByChars(
  chars: string[],
  token: string,
): Promise<LookupKanjiItem[]> {
  const unique = Array.from(new Set(chars.filter((char) => char && char.length === 1)));
  if (unique.length === 0) {
    return [];
  }

  const subjects = new Map<string, LookupKanjiItem>();

  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    const chunk = unique.slice(i, i + CHUNK_SIZE);
    const slugs = chunk.map((char) => encodeURIComponent(char)).join(",");
    const collection = await fetchAllCollectionPages(
      `/subjects?types=kanji&slugs=${slugs}`,
      token,
    );

    for (const row of collection.data) {
      if ((row.object ?? "") !== "kanji") {
        continue;
      }

      const data = row.data as {
        characters?: string | null;
        level?: number | null;
        meanings?: Array<{ meaning?: string; primary?: boolean }>;
        readings?: Array<{ reading?: string; primary?: boolean; accepted_answer?: boolean }>;
        meaning_mnemonic?: string;
        reading_mnemonic?: string;
      };

      const characters = data.characters ?? "";
      if (!characters) {
        continue;
      }

      const readings = (data.readings ?? [])
        .filter((reading) => reading.accepted_answer ?? true)
        .map((reading) => reading.reading)
        .filter((value): value is string => typeof value === "string" && value.length > 0);

      const primaryReadings = (data.readings ?? [])
        .filter((reading) => reading.primary)
        .map((reading) => reading.reading)
        .filter((value): value is string => typeof value === "string" && value.length > 0);

      const meanings = (data.meanings ?? [])
        .map((entry) => entry.meaning)
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .slice(0, 3);

      subjects.set(characters, {
        char: characters,
        subjectId: row.id,
        meanings,
        readings,
        primaryReadings,
        meaningExplanation: data.meaning_mnemonic ?? "",
        readingExplanation: data.reading_mnemonic ?? "",
        wkLevel: typeof data.level === "number" ? data.level : null,
      });
    }
  }

  return unique.map(
    (char) =>
      subjects.get(char) ?? {
        char,
        subjectId: null,
        meanings: [],
        readings: [],
        primaryReadings: [],
        meaningExplanation: "",
        readingExplanation: "",
        wkLevel: null,
      },
  );
}
