import { fetchAllCollectionPages } from "./http";
import { srsLabel } from "./helpers";
import type { UserKanjiIndexItem } from "./types";

export async function getUserKanjiIndex(token: string): Promise<UserKanjiIndexItem[]> {
  const assignmentsCollection = await fetchAllCollectionPages("/assignments?subject_types=kanji", token);

  const assignments = assignmentsCollection.data
    .map((row) =>
      row.data as {
        subject_id: number;
        subject_type: string;
        srs_stage: number;
        unlocked_at: string | null;
        started_at: string | null;
        passed_at: string | null;
        available_at: string | null;
      },
    )
    .filter((assignment) => assignment.subject_type === "kanji");

  const ids = Array.from(new Set(assignments.map((assignment) => assignment.subject_id)));
  const subjectById = new Map<
    number,
    {
      characters: string;
      meanings: string[];
      readings: string[];
      primaryReadings: string[];
      meaningExplanation: string;
      readingExplanation: string;
      wkLevel: number | null;
    }
  >();

  const chunkSize = 200;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize).join(",");
    if (!chunk) {
      continue;
    }

    const subjects = await fetchAllCollectionPages(`/subjects?ids=${chunk}`, token);
    for (const row of subjects.data) {
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
        .filter((reading): reading is string => typeof reading === "string" && reading.length > 0);

      const primaryReadings = (data.readings ?? [])
        .filter((reading) => reading.primary)
        .map((reading) => reading.reading)
        .filter((reading): reading is string => typeof reading === "string" && reading.length > 0);

      const meanings = (data.meanings ?? [])
        .map((entry) => entry.meaning)
        .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
        .slice(0, 3);

      subjectById.set(row.id, {
        characters,
        meanings,
        readings,
        primaryReadings,
        meaningExplanation: data.meaning_mnemonic ?? "",
        readingExplanation: data.reading_mnemonic ?? "",
        wkLevel: typeof data.level === "number" ? data.level : null,
      });
    }
  }

  const byChar = new Map<string, UserKanjiIndexItem>();
  for (const assignment of assignments) {
    const subject = subjectById.get(assignment.subject_id);
    if (!subject) {
      continue;
    }

    const locked = !assignment.unlocked_at || assignment.srs_stage <= 0;
    const item: UserKanjiIndexItem = {
      subjectId: assignment.subject_id,
      characters: subject.characters,
      meanings: subject.meanings,
      readings: subject.readings,
      primaryReadings: subject.primaryReadings,
      meaningExplanation: subject.meaningExplanation,
      readingExplanation: subject.readingExplanation,
      startedAt: assignment.started_at ?? null,
      passedAt: assignment.passed_at ?? null,
      availableAt: assignment.available_at ?? null,
      srsStage: assignment.srs_stage,
      status: srsLabel(assignment.srs_stage, locked),
      wkLevel: subject.wkLevel,
    };

    const existing = byChar.get(item.characters);
    if (!existing || item.srsStage >= existing.srsStage) {
      byChar.set(item.characters, item);
    }
  }

  return Array.from(byChar.values());
}
