// Shared HTTP fetcher for the News reader. Goal: look like a normal Chrome
// reader, never hammer a host, and surface clear typed errors.

import { isSafeOutboundUrl, parseHttpUrl } from "@/lib/safeOutboundUrl";

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 15_000;
const FETCH_TIMEOUT_FALLBACK_MS = 30_000;
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_REDIRECT_HOPS = 5;

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

type HeaderProfile = "minimal" | "browser-like";

type FetchAttempt = {
  profile: HeaderProfile;
  timeoutMs: number;
  includeReferer: boolean;
};

export async function fetchNewsHtml(url: string): Promise<NewsHttpResult> {
  const attempts: FetchAttempt[] = [
    { profile: "minimal", timeoutMs: FETCH_TIMEOUT_MS, includeReferer: true },
    { profile: "browser-like", timeoutMs: FETCH_TIMEOUT_MS, includeReferer: true },
    { profile: "browser-like", timeoutMs: FETCH_TIMEOUT_FALLBACK_MS, includeReferer: false },
  ];

  let lastFailure: NewsHttpError = { kind: "fetch_failed" };

  for (const attemptConfig of attempts) {
    const headers = buildHeaders(url, attemptConfig.profile, attemptConfig.includeReferer);
    const attempt = await fetchNewsHtmlOnce(url, headers, attemptConfig.timeoutMs);
    if (attempt.ok) {
      return attempt;
    }
    // Keep the most informative failure instead of letting a later low-signal
    // transport error hide a prior concrete status like 403 or 429.
    if (shouldPreferFailure(attempt.error, lastFailure)) {
      lastFailure = attempt.error;
    }
    if (attempt.error.kind === "too_large") {
      return attempt;
    }
  }

  return { ok: false, error: lastFailure };
}

async function fetchNewsHtmlOnce(
  url: string,
  headers: HeadersInit,
  timeoutMs: number,
): Promise<NewsHttpResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchWithValidatedRedirects(url, headers, controller.signal);
    if (!response) {
      return { ok: false, error: { kind: "fetch_failed" } };
    }

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

async function fetchWithValidatedRedirects(url: string, headers: HeadersInit, signal: AbortSignal): Promise<Response | null> {
  let current = url;

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
    const parsed = parseHttpUrl(current);
    if (!parsed) {
      return null;
    }

    if (!(await isSafeOutboundUrl(parsed))) {
      return null;
    }

    const response = await fetch(parsed.toString(), {
      headers,
      redirect: "manual",
      signal,
    });

    if (response.status < 300 || response.status >= 400) {
      return response;
    }

    const location = response.headers.get("location");
    if (!location) {
      return response;
    }

    current = new URL(location, parsed).toString();
  }

  return null;
}

function buildHeaders(url: string, profile: HeaderProfile, includeReferer: boolean): HeadersInit {
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
    "Cache-Control": "max-age=0",
  };

  if (profile === "browser-like") {
    headers["Upgrade-Insecure-Requests"] = "1";
  }

  if (includeReferer && referer) {
    headers.Referer = referer;
  }

  return headers;
}

function shouldPreferFailure(next: NewsHttpError, current: NewsHttpError): boolean {
  const nextScore = failureScore(next);
  const currentScore = failureScore(current);
  return nextScore >= currentScore;
}

function failureScore(error: NewsHttpError): number {
  if (error.kind === "too_large") {
    return 100;
  }
  if (error.kind === "not_html") {
    return 90;
  }
  if (error.kind === "fetch_failed") {
    if (typeof error.status === "number") {
      // Preserve explicit status responses over opaque network exceptions.
      return 50;
    }
    return 10;
  }
  return 0;
}
