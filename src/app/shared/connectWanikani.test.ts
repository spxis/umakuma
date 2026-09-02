import { describe, expect, it, vi } from "vitest";

import { connectWanikaniToken, wanikaniConnectEndpoint } from "./connectWanikani";

function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => body,
  } as Response;
}

describe("wanikaniConnectEndpoint", () => {
  it("encodes the account id into the route", () => {
    expect(wanikaniConnectEndpoint("abc 123")).toBe("/api/accounts/abc%20123/wanikani");
  });
});

describe("connectWanikaniToken", () => {
  it("posts the trimmed token as JSON", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ wkUsername: "kuma", wkLevel: 7 }));

    await connectWanikaniToken({
      accountId: "acc1",
      token: "  secret-token  ",
      fallbackError: "nope",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/accounts/acc1/wanikani");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ token: "secret-token" });
  });

  it("returns the resolved account on success", async () => {
    const outcome = await connectWanikaniToken({
      accountId: "acc1",
      token: "secret",
      fallbackError: "nope",
      fetchImpl: (async () => jsonResponse({ wkUsername: "kuma", wkLevel: 7 })) as unknown as typeof fetch,
    });

    expect(outcome).toEqual({ ok: true, wkUsername: "kuma", wkLevel: 7 });
  });

  it("passes the route's own message through when it refuses", async () => {
    const outcome = await connectWanikaniToken({
      accountId: "acc1",
      token: "secret",
      fallbackError: "nope",
      fetchImpl: (async () =>
        jsonResponse({ error: "WaniKani did not accept that token." }, { ok: false, status: 400 })) as unknown as typeof fetch,
    });

    expect(outcome).toEqual({ ok: false, error: "WaniKani did not accept that token." });
  });

  it("falls back to the caller's message when the response carries none", async () => {
    const outcome = await connectWanikaniToken({
      accountId: "acc1",
      token: "secret",
      fallbackError: "Could not reach WaniKani.",
      fetchImpl: (async () => jsonResponse(null, { ok: false, status: 500 })) as unknown as typeof fetch,
    });

    expect(outcome).toEqual({ ok: false, error: "Could not reach WaniKani." });
  });

  /*
   * A dead network and a refused token are the same thing to the member
   * typing: something to read and another go, not an unhandled rejection
   * inside a click handler.
   */
  it("reports a failed request rather than throwing", async () => {
    const outcome = await connectWanikaniToken({
      accountId: "acc1",
      token: "secret",
      fallbackError: "Could not reach WaniKani.",
      fetchImpl: (async () => {
        throw new Error("offline");
      }) as unknown as typeof fetch,
    });

    expect(outcome).toEqual({ ok: false, error: "Could not reach WaniKani." });
  });

  it("treats a missing level as no level rather than zero", async () => {
    const outcome = await connectWanikaniToken({
      accountId: "acc1",
      token: "secret",
      fallbackError: "nope",
      fetchImpl: (async () => jsonResponse({ wkUsername: "kuma" })) as unknown as typeof fetch,
    });

    expect(outcome).toEqual({ ok: true, wkUsername: "kuma", wkLevel: null });
  });
});
