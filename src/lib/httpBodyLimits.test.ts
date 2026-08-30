import { describe, expect, it } from "vitest";

import { readJsonRequestWithLimit, readResponseBytesWithLimit } from "@/lib/httpBodyLimits";

describe("HTTP body limits", () => {
  it("parses JSON within the request limit", async () => {
    const request = new Request("https://example.com", {
      method: "POST",
      body: JSON.stringify({ ok: true }),
    });

    await expect(readJsonRequestWithLimit(request, 1024)).resolves.toEqual({
      ok: true,
      value: { ok: true },
    });
  });

  it("rejects a request whose declared size exceeds the limit", async () => {
    const request = new Request("https://example.com", {
      method: "POST",
      headers: { "content-length": "2048" },
      body: "{}",
    });

    await expect(readJsonRequestWithLimit(request, 1024)).resolves.toEqual({
      ok: false,
      reason: "too_large",
    });
  });

  it("rejects a streamed response that exceeds the limit", async () => {
    const response = new Response("12345");

    await expect(readResponseBytesWithLimit(response, 4)).resolves.toBeNull();
  });

  it("returns response bytes within the limit", async () => {
    const response = new Response("12345");
    const body = await readResponseBytesWithLimit(response, 5);

    expect(body).not.toBeNull();
    expect(new TextDecoder().decode(body!)).toBe("12345");
  });
});
