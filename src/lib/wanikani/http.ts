import { LEADERBOARD_REQUEST_GAP_MS } from "@/lib/refreshPolicy";

import type {
  WaniKaniCollectionResponse,
  WaniKaniResponseHeaders,
} from "./types";

const BASE_URL = "https://api.wanikani.com/v2";
let requestChain: Promise<void> = Promise.resolve();
let lastRequestStartedAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runThrottledRequest<T>(work: () => Promise<T>): Promise<T> {
  const run = requestChain.then(async () => {
    const now = Date.now();
    const waitMs = Math.max(0, lastRequestStartedAt + LEADERBOARD_REQUEST_GAP_MS - now);
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    lastRequestStartedAt = Date.now();
    return work();
  });

  requestChain = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
}

export async function fetchWaniKani<T>(
  path: string,
  token: string,
  conditionalHeaders?: { ifNoneMatch?: string | null; ifModifiedSince?: string | null },
): Promise<{ status: number; data: T | null; headers: WaniKaniResponseHeaders }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Wanikani-Revision": "20170710",
  };

  if (conditionalHeaders?.ifNoneMatch) {
    headers["If-None-Match"] = conditionalHeaders.ifNoneMatch;
  }

  if (conditionalHeaders?.ifModifiedSince) {
    headers["If-Modified-Since"] = conditionalHeaders.ifModifiedSince;
  }

  const response = await runThrottledRequest(() =>
    fetch(`${BASE_URL}${path}`, {
      headers,
      cache: "no-store",
    }),
  );

  const responseHeaders: WaniKaniResponseHeaders = {
    etag: response.headers.get("etag"),
    lastModified: response.headers.get("last-modified"),
  };

  if (response.status === 304) {
    return { status: 304, data: null, headers: responseHeaders };
  }

  if (!response.ok) {
    throw new Error(`WaniKani API error: ${response.status}`);
  }

  return {
    status: response.status,
    data: (await response.json()) as T,
    headers: responseHeaders,
  };
}

export async function fetchAllCollectionPages(
  path: string,
  token: string,
): Promise<WaniKaniCollectionResponse> {
  let nextPath = path;
  let totalCount = 0;
  const allData: WaniKaniCollectionResponse["data"] = [];
  let latestDataUpdatedAt: string | null = null;

  while (nextPath) {
    const pageResponse = await fetchWaniKani<WaniKaniCollectionResponse>(nextPath, token);
    const page = pageResponse.data;
    if (!page) {
      break;
    }

    totalCount = page.total_count;
    allData.push(...page.data);
    latestDataUpdatedAt = page.data_updated_at ?? latestDataUpdatedAt;

    if (!page.pages.next_url) {
      break;
    }

    const url = new URL(page.pages.next_url);
    nextPath = `${url.pathname}${url.search}`.replace("/v2", "");
  }

  return {
    object: "collection",
    data_updated_at: latestDataUpdatedAt,
    total_count: totalCount,
    pages: { next_url: null },
    data: allData,
  };
}
