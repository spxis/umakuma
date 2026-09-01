import "server-only";

import { SUBJECT_TYPES, type SubjectType } from "@/lib/domainConstants";
import { prisma } from "@/lib/prisma";
import { getCatalogSubjectDetails, type CatalogSubjectDetail } from "@/lib/subjectCatalogDetails";

/**
 * One subject, found by the name in its address.
 *
 * Words and radicals have public pages of their own because a search result
 * has to lead to the thing it found. The explorers cannot do that job: they
 * are built from the member's own levels and stop at theirs, so a level 46
 * word shown to a level 17 member had nowhere to open. These pages carry no
 * member data at all, which is what lets them answer for every subject
 * WaniKani teaches regardless of who is asking.
 *
 * The catalogue is the source, not the API: subjects are static and already
 * synced locally, and a page that fetched WaniKani per request would be slow
 * for a signed-out reader who has no token to fetch with.
 */

export type PublicSubject = CatalogSubjectDetail & { slug: string | null };

/**
 * The row behind an address, or null.
 *
 * Vocabulary is looked up by slug first and then by its characters, because
 * both are in circulation: WaniKani's slug is usually the word itself, but
 * where two entries share characters one of them carries a distinguishing
 * suffix, and a reader who typed or pasted the word means the word.
 */
async function findSubjectId(subjectType: SubjectType, name: string): Promise<number | null> {
  const wanted = name.trim();
  if (!wanted) return null;

  const row = await prisma.wkSubjectCatalog.findFirst({
    where: { subjectType, hiddenAt: null, slug: wanted },
    select: { wkSubjectId: true },
    orderBy: { level: "asc" },
  });
  if (row) return row.wkSubjectId;

  if (subjectType === SUBJECT_TYPES.radical) return null;

  const byCharacters = await prisma.wkSubjectCatalog.findFirst({
    where: { subjectType, hiddenAt: null, characters: wanted },
    select: { wkSubjectId: true },
    orderBy: { level: "asc" },
  });
  return byCharacters?.wkSubjectId ?? null;
}

export async function getPublicSubject(
  subjectType: SubjectType,
  name: string,
): Promise<PublicSubject | null> {
  const subjectId = await findSubjectId(subjectType, name);
  if (subjectId === null) return null;

  const details = await getCatalogSubjectDetails([subjectId]);
  const detail = details.get(subjectId);
  if (!detail) return null;

  const row = await prisma.wkSubjectCatalog.findUnique({
    where: { wkSubjectId: subjectId },
    select: { slug: true },
  });

  return { ...detail, slug: row?.slug ?? null };
}

/**
 * What the page calls the subject.
 *
 * A radical drawn rather than written has no characters at all, so the name
 * stands in - which is why the address uses the name too. Falling through to
 * the slug rather than rendering an empty heading is the difference between a
 * page about "leaf" and a page that looks broken.
 */
export function publicSubjectLabel(subject: PublicSubject): string {
  const characters = subject.characters?.trim();
  if (characters) return characters;
  return subject.meanings[0]?.trim() || subject.slug || "";
}
