import type { PrismaClient } from "@prisma/client";

import { SUBJECT_TYPES } from "@/lib/domainConstants";
import type { JlptWordExample } from "@/lib/jlptTypes";
import {
  enrichWordExamplesWithKanji,
  kanjiCharacters,
  type KanjiCatalogRow,
} from "@/lib/jlptWordExamples";

type CatalogClient = Pick<PrismaClient, "wkSubjectCatalog">;

export async function loadWaniKaniKanjiCatalog(
  client: CatalogClient,
  characters?: string[],
): Promise<KanjiCatalogRow[]> {
  return client.wkSubjectCatalog.findMany({
    where: {
      subjectType: SUBJECT_TYPES.kanji,
      hiddenAt: null,
      ...(characters ? { characters: { in: characters } } : {}),
    },
    select: {
      wkSubjectId: true,
      level: true,
      characters: true,
      meanings: true,
      readings: true,
    },
  });
}

export async function addWaniKaniKanjiToWordExamples(
  client: CatalogClient,
  examples: JlptWordExample[],
): Promise<JlptWordExample[]> {
  const characters = [...new Set(examples.flatMap((example) => kanjiCharacters(example.written)))];
  if (characters.length === 0) return examples;

  const catalogRows = await loadWaniKaniKanjiCatalog(client, characters);
  return enrichWordExamplesWithKanji(examples, catalogRows);
}