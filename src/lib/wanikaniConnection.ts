import { decryptToken } from "./crypto";

/**
 * The parts of an account that make up a WaniKani link.
 *
 * Every field moves together: an account either has a connection or it does
 * not, and a half-connected one is not a state worth modelling. Callers ask
 * once and get all of it, or nothing.
 */
export type WanikaniConnectionFields = {
  tokenEncrypted: string | null;
  tokenIv: string | null;
  tokenTag: string | null;
  wkUserId?: string | null;
  wkUsername?: string | null;
  wkLevel?: number | null;
};

export type WanikaniConnection = {
  token: string;
  wkUserId: string | null;
  wkUsername: string | null;
  wkLevel: number | null;
};

/**
 * The account's WaniKani connection, or null when it has none.
 *
 * An account can exist without WaniKani, so the token is a question rather
 * than a guarantee. Resolving it in one place means a caller writes one guard
 * instead of three null checks, and a surface that cannot work without a
 * token says so plainly rather than crashing three calls later.
 */
export function wanikaniConnection(account: WanikaniConnectionFields): WanikaniConnection | null {
  const { tokenEncrypted, tokenIv, tokenTag } = account;
  if (!tokenEncrypted || !tokenIv || !tokenTag) {
    return null;
  }

  return {
    token: decryptToken({ encrypted: tokenEncrypted, iv: tokenIv, tag: tokenTag }),
    wkUserId: account.wkUserId ?? null,
    wkUsername: account.wkUsername ?? null,
    wkLevel: account.wkLevel ?? null,
  };
}

/** Whether the account has a WaniKani link at all, without decrypting anything. */
export function hasWanikaniConnection(account: WanikaniConnectionFields): boolean {
  return Boolean(account.tokenEncrypted && account.tokenIv && account.tokenTag);
}

/** The status code for a surface that genuinely cannot work without a token. */
export const WANIKANI_REQUIRED_STATUS = 409;

/** The message such a surface returns, in one place so it reads the same everywhere. */
export const WANIKANI_REQUIRED_MESSAGE = "This account has no WaniKani connection.";

/**
 * Keeps only the accounts that have a WaniKani link, and narrows the type.
 *
 * Surfaces built out of WaniKani numbers — the leaderboard, the reading
 * sign-off stats — have nothing to say about an account with no connection.
 * Ranking one at level zero would read as a real standing rather than an
 * absence, so those accounts are left out and the fields stop being nullable
 * for everything downstream.
 */
export function onlyConnected<T extends { wkUsername: string | null; wkLevel: number | null }>(
  accounts: T[],
): Array<Omit<T, "wkUsername" | "wkLevel"> & { wkUsername: string; wkLevel: number }> {
  return accounts.flatMap((account) =>
    account.wkUsername !== null && account.wkLevel !== null
      ? [{ ...account, wkUsername: account.wkUsername, wkLevel: account.wkLevel }]
      : [],
  );
}
