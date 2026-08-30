import "server-only";

import type { Prisma } from "@prisma/client";

/**
 * Finds an account from whatever is in the URL.
 *
 * Links in the wild carry the WaniKani username, in its original casing —
 * `/users/KanjiMasterHana123`. Slugs are lowercase, so matching on the slug
 * alone would break every link anyone has already shared. Both are accepted,
 * and the slug is matched case-insensitively so a typed-in address works
 * whatever case it arrives in.
 *
 * An account with no WaniKani connection has only a slug, which is the whole
 * point: it is reachable without ever having had a username.
 */
export function accountUrlKeyWhere(urlKey: string): Prisma.AccountWhereInput {
  const key = urlKey.trim();
  return {
    OR: [
      { slug: { equals: key, mode: "insensitive" } },
      { wkUsername: key },
    ],
  };
}
