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
