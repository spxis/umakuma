/**
 * Handing a WaniKani token to an account, from wherever it was typed.
 *
 * Two surfaces ask for the same token: the welcome wizard's optional step and
 * the connection page a member comes back to later. They differ in what they
 * do afterwards - the wizard moves to the next step, the page reloads itself -
 * and in nothing else, so the request, its error handling and the promise
 * never to echo the token live here rather than twice.
 */

/** Where a token is posted. One place, so a renamed route breaks in one file. */
export function wanikaniConnectEndpoint(accountId: string): string {
  return `/api/accounts/${encodeURIComponent(accountId)}/wanikani`;
}

export type ConnectWanikaniOutcome =
  | { ok: true; wkUsername: string | null; wkLevel: number | null }
  | { ok: false; error: string };

/**
 * Posts the token and reports what WaniKani made of it.
 *
 * Never throws: a dead network and a refused token are the same thing to the
 * member typing, so both come back as `ok: false` with something to read. The
 * token itself is not returned, logged or put in the message - the route does
 * not echo it either, and the two halves of that promise have to agree.
 */
export async function connectWanikaniToken(input: {
  accountId: string;
  token: string;
  /** What to say when the response carries no message of its own. */
  fallbackError: string;
  fetchImpl?: typeof fetch;
}): Promise<ConnectWanikaniOutcome> {
  const { accountId, token, fallbackError } = input;
  const doFetch = input.fetchImpl ?? fetch;

  const response = await doFetch(wanikaniConnectEndpoint(accountId), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: token.trim() }),
  }).catch(() => null);

  const payload = (await response?.json().catch(() => null)) as
    | { wkUsername?: string | null; wkLevel?: number | null; error?: string }
    | null;

  if (!response?.ok) {
    return { ok: false, error: payload?.error ?? fallbackError };
  }

  return {
    ok: true,
    wkUsername: payload?.wkUsername ?? null,
    wkLevel: typeof payload?.wkLevel === "number" ? payload.wkLevel : null,
  };
}
