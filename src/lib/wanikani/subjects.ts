import { fetchAllCollectionPages } from "./http";
import { normalizeAssignmentType } from "./helpers";

export async function loadSubjectTypes(
  token: string,
  subjectIds: number[],
): Promise<Map<number, "radical" | "kanji" | "vocabulary">> {
  const output = new Map<number, "radical" | "kanji" | "vocabulary">();
  const chunkSize = 200;

  for (let i = 0; i < subjectIds.length; i += chunkSize) {
    const chunk = subjectIds.slice(i, i + chunkSize).join(",");
    if (!chunk) {
      continue;
    }

    const subjectChunk = await fetchAllCollectionPages(`/subjects?ids=${chunk}`, token);
    for (const row of subjectChunk.data) {
      const normalized = normalizeAssignmentType(row.object ?? "");
      if (!normalized) {
        continue;
      }

      output.set(row.id, normalized);
    }
  }

  return output;
}

export async function loadSubjectSummaries(
  token: string,
  subjectIds: number[],
): Promise<Map<number, { label: string; reading: string | null }>> {
  const output = new Map<number, { label: string; reading: string | null }>();
  const chunkSize = 200;

  for (let i = 0; i < subjectIds.length; i += chunkSize) {
    const chunk = subjectIds.slice(i, i + chunkSize).join(",");
    if (!chunk) {
      continue;
    }

    const subjectChunk = await fetchAllCollectionPages(`/subjects?ids=${chunk}`, token);
    for (const row of subjectChunk.data) {
      const data = row.data as {
        characters?: string | null;
        slug?: string | null;
        meanings?: Array<{ meaning?: string; primary?: boolean }>;
        readings?: Array<{ reading?: string; primary?: boolean; accepted_answer?: boolean }>;
      };
      const normalizedType = normalizeAssignmentType(row.object ?? "");
      if (!normalizedType) {
        continue;
      }

      const label = data.characters ?? data.slug ?? `#${row.id}`;
      const primaryMeaning =
        (data.meanings ?? [])
          .filter((meaning) => meaning.primary ?? true)
          .map((meaning) => meaning.meaning)
          .find((meaning): meaning is string => typeof meaning === "string" && meaning.length > 0) ?? null;
      const primaryReading =
        (data.readings ?? [])
          .filter((reading) => reading.primary && (reading.accepted_answer ?? true))
          .map((reading) => reading.reading)
          .find((reading): reading is string => typeof reading === "string" && reading.length > 0) ?? null;

      output.set(row.id, {
        label,
        reading: normalizedType === "radical" ? primaryMeaning : primaryReading,
      });
    }
  }

  return output;
}
