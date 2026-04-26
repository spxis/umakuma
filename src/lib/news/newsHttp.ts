// Shared HTTP fetcher for the News reader. Goal: look like a normal Chrome
// reader, never hammer a host, and surface clear typed errors.

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = 4 * 1024 * 1024;

export type NewsHttpError =
  | { kind: "fetch_failed"; status?: number }
  | { kind: "too_large" }
  | { kind: "not_html" };

export type NewsHttpOk = {
  ok: true;
  html: string;
  finalUrl: string;
};

export type NewsHttpResult = NewsHttpOk | { ok: false; error: NewsHttpError };

export async function fetchNewsHtml(url: string): Promise<NewsHttpResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: buildHeaders(url),
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, error: { kind: "fetch_failed", status: response.status } };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(contentType)) {
      return { ok: false, error: { kind: "not_html" } };
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return { ok: false, error: { kind: "too_large" } };
    }

    const html = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    return { ok: true, html, finalUrl: response.url || url };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      error: { kind: "fetch_failed", status: isAbort ? 408 : undefined },
    };
  } finally {
    clearTimeout(timer);
  }
}

function buildHeaders(url: string): HeadersInit {
  let referer: string | null = null;
  try {
    referer = new URL(url).origin + "/";
  } catch {
    referer = null;
  }

  const headers: Record<string, string> = {
    "User-Agent": CHROME_UA,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "max-age=0",
    "Sec-Ch-Ua":
      '"Not A(Brand";v="99", "Google Chrome";v="132", "Chromium";v="132"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
  };

  if (referer) {
    headers.Referer = referer;
  }

  return headers;
}
