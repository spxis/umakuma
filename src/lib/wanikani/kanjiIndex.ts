import { fetchAllCollectionPages } from "./http";
import { parseAssignmentCacheRows, srsLabel } from "./helpers";
import type { UserKanjiIndexItem } from "./types";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { getCatalogSubjectDetails } from "@/lib/subjectCatalogDetails";

/**
 * The member's kanji, from their assignments and the local catalogue.
 *
 * The split is the one the rest of the site already keeps: assignments are the
 * member's own SRS state and can only come from WaniKani, but the subjects
 * behind them are static content that is already synced into
 * `WkSubjectCatalog`. Asking the API for them meant up to two thousand ids
 * fetched in sequential 200-id pages on every render - the JLPT explorer's
 * server response measured 5.6 seconds against 0.1 for the grade explorer,
 * which is why clicking JLPT Explorer looked like nothing had happened.
 *
 * The API is still the fallback for ids the catalogue has not seen, so a
 * subject added to WaniKani since the last sync still resolves.
 */
type KanjiAssignment = {
  subject_id: number;
  subject_type: string;
  srs_stage: number;
  unlocked_at: string | null;
  started_at: string | null;
  passed_at: string | null;
  available_at: string | null;
};

function toKanjiAssignments(rows: Array<{ data: unknown }>): KanjiAssignment[] {
  return rows
    .map((row) => row.data as KanjiAssignment)
    .filter((assignment) => assignment?.subject_type === SUBJECT_TYPES.kanji);
}

/**
 * The member's kanji from their assignments, live from WaniKani.
 *
 * For a caller that needs this instant's SRS state - the study queue, which is
 * about to review these items. A browsing surface should take the synced cache
 * instead; see `getUserKanjiIndexFromCache`.
 */
export async function getUserKanjiIndex(token: string): Promise<UserKanjiIndexItem[]> {
  const assignmentsCollection = await fetchAllCollectionPages(
    `/assignments?subject_types=${SUBJECT_TYPES.kanji}`,
    token,
  );

  return buildKanjiIndex(toKanjiAssignments(assignmentsCollection.data), token);
}

/**
 * The same index, from the assignments the account already has on disk.
 *
 * `Account.assignmentCache` is written by the ordinary sync, which runs on a
 * five-minute staleness interval and is what the games, the study tags and the
 * reading sign-off already read. Asking WaniKani for the same rows cost the
 * JLPT explorer roughly 650ms of its server render, before a single kanji was
 * drawn, on a page that shows a status pill rather than conducts a review.
 *
 * `token` is only for subjects the catalogue has not seen; null skips that
 * fallback rather than failing, so a member without a live connection still
 * gets everything the catalogue knows.
 */
export async function getUserKanjiIndexFromCache(
  assignmentCache: unknown,
  token: string | null,
): Promise<UserKanjiIndexItem[]> {
  const assignments = toKanjiAssignments(parseAssignmentCacheRows(assignmentCache));
  return assignments.length === 0 ? [] : buildKanjiIndex(assignments, token);
}

async function buildKanjiIndex(
  assignments: KanjiAssignment[],
  token: string | null,
): Promise<UserKanjiIndexItem[]> {
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

  /* The catalogue answers for everything it holds, in one query. */
  const catalog = await getCatalogSubjectDetails(ids);
  for (const [subjectId, detail] of catalog) {
    if (detail.subjectType !== SUBJECT_TYPES.kanji || !detail.characters) continue;
    subjectById.set(subjectId, {
      characters: detail.characters,
      meanings: detail.meanings.slice(0, 3),
      readings: detail.readings,
      primaryReadings: detail.primaryReadings,
      meaningExplanation: detail.meaningExplanation,
      readingExplanation: detail.readingExplanation,
      wkLevel: detail.wkLevel,
    });
  }

  /* Only what the catalogue could not answer goes to the API, and only when
   * there is a token to ask with. */
  const missing = token ? ids.filter((id) => !subjectById.has(id)) : [];
  const chunkSize = 200;
  for (let i = 0; i < missing.length; i += chunkSize) {
    const chunk = missing.slice(i, i + chunkSize).join(",");
    if (!chunk) {
      continue;
    }

    const subjects = await fetchAllCollectionPages(`/subjects?ids=${chunk}`, token as string);
    for (const row of subjects.data) {
      if ((row.object ?? "") !== SUBJECT_TYPES.kanji) {
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
