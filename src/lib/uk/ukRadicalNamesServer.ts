import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { prisma } from "@/lib/prisma";
import { hasWanikaniConnection } from "@/lib/wanikaniConnection";

/**
 * WaniKani's name for a radical, for the members entitled to read it.
 *
 * The gate is the whole point of the module. Their radical names are their own
 * invented content - *Toe*, *Fins*, *Slide*, *Wolverine* - the same as their
 * mnemonics, so they are held in `UkRadicalLink` rather than in `UkSubject`
 * and they are read only for an account with a WaniKani connection. A member
 * who has never had one is served our names and never sees a word of theirs.
 *
 * One query for a whole queue, and none at all for a member with no token: the
 * connection is checked before the link table is touched, so the common case
 * on this site costs a single account read.
 */
export async function loadWanikaniRadicalNames(
  accountId: string,
  ukSubjectIds: readonly number[],
): Promise<Map<number, string>> {
  if (ukSubjectIds.length === 0) return new Map();

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { tokenEncrypted: true, tokenIv: true, tokenTag: true },
  });
  if (!account || !hasWanikaniConnection(account)) return new Map();

  const links = await prisma.ukRadicalLink.findMany({
    where: { ukSubjectId: { in: [...new Set(ukSubjectIds)] } },
    select: { ukSubjectId: true, theirName: true },
  });
  return new Map(links.map((link) => [link.ukSubjectId, link.theirName]));
}

/**
 * Puts our name for a radical onto WaniKani's own items.
 *
 * The mirror of the function above and deliberately ungated: our names are
 * ours to show, so a member reading their WaniKani queue sees what UmaKuma
 * calls the same shape whether or not they have ever opened our ladder.
 *
 * Loads and merges in one call rather than handing a map back, because the
 * caller is a route that has no other reason to know the pairing exists - and
 * generic over the row, since each feed carries its own shape and all this
 * needs is a subject id.
 */
export async function withUmakumaRadicalNames<T extends { subjectId: number; subjectType?: string }>(
  items: readonly T[],
): Promise<(T & { umakumaName?: string | null })[]> {
  const ids = items
    .filter((item) => item.subjectType === SUBJECT_TYPES.radical)
    .map((item) => item.subjectId);
  if (ids.length === 0) return [...items];

  const links = await prisma.ukRadicalLink
    .findMany({
      where: { wkSubjectId: { in: [...new Set(ids)] } },
      select: { wkSubjectId: true, ourName: true },
    })
    .catch(() => []);

  const names = new Map<number, string>();
  for (const link of links) {
    if (link.ourName) names.set(link.wkSubjectId, link.ourName);
  }
  if (names.size === 0) return [...items];

  return items.map((item) => {
    const ours = names.get(item.subjectId);
    return ours ? { ...item, umakumaName: ours } : item;
  });
}
