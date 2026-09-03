/**
 * Whose token the catalogue tools read WaniKani with.
 *
 * Subjects are the same for every reader, so any working token will do - which
 * is the point: the backfill should not be stopped by which particular member
 * happens to be connected today.
 *
 * The rule lives here rather than in the script because it had a bug worth a
 * test. It took the first account whose name matched and then looked for a
 * token on it, so a member who has never connected WaniKani - or who connected
 * and later disconnected - answered for everyone behind them, and the run
 * stopped with "ensure a matching account exists" while several usable tokens
 * sat further down the same list.
 */

/** An account, as the catalogue tools select it. */
export type TokenAccount = {
  nickname: string | null;
  joinedByEmail: string | null;
  wkUsername: string | null;
  tokenEncrypted: string | null;
  tokenIv: string | null;
  tokenTag: string | null;
};

/** All three parts, or the token cannot be decrypted at all. */
export function holdsToken(account: TokenAccount): boolean {
  return Boolean(account.tokenEncrypted && account.tokenIv && account.tokenTag);
}

/** Whether any of the names this account is known by contains the fragment. */
function nameMatches(account: TokenAccount, matcher: string): boolean {
  return [account.nickname, account.joinedByEmail, account.wkUsername].some(
    (field) => typeof field === "string" && field.toLowerCase().includes(matcher),
  );
}

export type TokenChoice = {
  account: TokenAccount;
  /** Whether it was asked for by name, or taken because it was simply connected. */
  named: boolean;
};

/**
 * The account to read with: the one asked for by name if it is connected,
 * otherwise the first connected account in the order given.
 *
 * Callers pass accounts most-recently-updated first, so the fallback is the
 * token most likely to still be valid.
 */
export function pickTokenAccount(
  accounts: readonly TokenAccount[],
  accountLike: string,
): TokenChoice | null {
  const connected = accounts.filter(holdsToken);
  if (connected.length === 0) return null;

  const matcher = accountLike.trim().toLowerCase();
  const named = matcher ? connected.find((account) => nameMatches(account, matcher)) : undefined;

  return named ? { account: named, named: true } : { account: connected[0]!, named: false };
}
