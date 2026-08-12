import { afterEach, describe, expect, it, vi } from "vitest";

import { EFFECTIVE_WANIKANI_REQUEST_GAP_MS } from "@/lib/refreshPolicy";

import { fetchWaniKani, postWaniKani } from "./http";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("WaniKani request scheduling", () => {
  it("runs a queued write before queued reads while preserving the request gap", async () => {
    vi.useFakeTimers();
    const calls: Array<{ method: string; startedAtMs: number }> = [];
    let finishActiveRead: ((response: Response) => void) | undefined;

    vi.stubGlobal("fetch", vi.fn((_: string | URL | Request, init?: RequestInit) => {
      calls.push({ method: init?.method ?? "GET", startedAtMs: Date.now() });
      if (calls.length === 1) {
        return new Promise<Response>((resolve) => {
          finishActiveRead = resolve;
        });
      }
      return Promise.resolve(Response.json({ data: [], pages: { next_url: null }, total_count: 0 }));
    }));

    const token = "scheduler-test-token";
    const activeRead = fetchWaniKani("/active", token);
    const queuedRead = fetchWaniKani("/queued", token);
    const queuedWrite = postWaniKani("/reviews", token, { review: {} });

    expect(calls.map((call) => call.method)).toEqual(["GET"]);
    finishActiveRead?.(Response.json({ data: [], pages: { next_url: null }, total_count: 0 }));
    await vi.advanceTimersByTimeAsync(EFFECTIVE_WANIKANI_REQUEST_GAP_MS);

    expect(calls.map((call) => call.method)).toEqual(["GET", "POST"]);
    expect(calls[1]!.startedAtMs - calls[0]!.startedAtMs).toBeGreaterThanOrEqual(
      EFFECTIVE_WANIKANI_REQUEST_GAP_MS,
    );

    await vi.advanceTimersByTimeAsync(EFFECTIVE_WANIKANI_REQUEST_GAP_MS);
    await Promise.all([activeRead, queuedWrite, queuedRead]);

    expect(calls.map((call) => call.method)).toEqual(["GET", "POST", "GET"]);
    expect(calls[2]!.startedAtMs - calls[1]!.startedAtMs).toBeGreaterThanOrEqual(
      EFFECTIVE_WANIKANI_REQUEST_GAP_MS,
    );
  });
});