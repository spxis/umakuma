import { isSafeOutboundUrl, parseHttpUrl } from "@/lib/safeOutboundUrl";
import { readResponseBytesWithLimit } from "@/lib/httpBodyLimits";

const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_REDIRECT_HOPS = 5;

export type SafeImageFetchOptions = {
  maxBytes?: number;
  minBytes?: number;
  rejectPng?: boolean;
  timeoutMs?: number;
};

export type SafeImageFetchResult = {
  body: Uint8Array;
  contentType: string;
};

export async function fetchSafeImage(
  url: string,
  options: SafeImageFetchOptions = {},
): Promise<SafeImageFetchResult | null> {
  const {
    maxBytes = DEFAULT_MAX_BYTES,
    minBytes = 0,
    rejectPng = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let currentUrl = url;

    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
      const parsedUrl = parseHttpUrl(currentUrl);
      if (!parsedUrl || !(await isSafeOutboundUrl(parsedUrl))) {
        return null;
      }

      const response = await fetch(parsedUrl, {
        cache: "no-store",
        redirect: "manual",
        signal: controller.signal,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location || hop === MAX_REDIRECT_HOPS) {
          return null;
        }
        currentUrl = new URL(location, parsedUrl).toString();
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel();
        return null;
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/") || (rejectPng && /^image\/png/i.test(contentType))) {
        await response.body?.cancel();
        return null;
      }

      const body = await readResponseBytesWithLimit(response, maxBytes);
      if (!body || body.byteLength < minBytes) {
        return null;
      }

      return { body, contentType };
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
