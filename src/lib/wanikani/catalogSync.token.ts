import { decryptToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

import { DEFAULT_ACCOUNT_MATCH } from "./catalogSync.constants";
import type { ResolvedToken } from "./catalogSync.types";

export async function resolveCatalogSyncToken(input: {
  token?: string | null;
  accountLike?: string;
}): Promise<ResolvedToken | null> {
  if (input.token) {
    return { token: input.token, source: "direct" };
  }

  const envToken = process.env.WK_CATALOG_API_TOKEN ?? process.env.WANIKANI_API_TOKEN ?? null;
  if (envToken) {
    return { token: envToken, source: "env" };
  }

  const accountLike = (input.accountLike ?? DEFAULT_ACCOUNT_MATCH).toLowerCase();
  const accounts = await prisma.account.findMany({
    orderBy: [{ updatedAt: "desc" }],
    select: {
      nickname: true,
      joinedByEmail: true,
      wkUsername: true,
      tokenEncrypted: true,
      tokenIv: true,
      tokenTag: true,
    },
  });

  const matched = accounts.find((account) => {
    const fields = [account.nickname, account.joinedByEmail, account.wkUsername];
    return fields.some((field) => typeof field === "string" && field.toLowerCase().includes(accountLike));
  });

  if (!matched) {
    return null;
  }

  return {
    token: decryptToken({
      encrypted: matched.tokenEncrypted,
      iv: matched.tokenIv,
      tag: matched.tokenTag,
    }),
    source: `account-like:${accountLike}`,
  };
}
