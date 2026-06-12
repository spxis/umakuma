type ApiActivityListener = (activeCount: number) => void;

let installed = false;
let activeCount = 0;
const listeners = new Set<ApiActivityListener>();

function notifyListeners() {
  for (const listener of listeners) {
    listener(activeCount);
  }
}

function normalizeInputUrl(input: RequestInfo | URL): string | null {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.url;
  }

  return null;
}

function isTrackedApiRequest(input: RequestInfo | URL): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const rawUrl = normalizeInputUrl(input);
  if (!rawUrl) {
    return false;
  }

  try {
    const url = new URL(rawUrl, window.location.origin);
    if (url.origin !== window.location.origin) {
      return false;
    }

    return url.pathname === "/api" || url.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

export function installClientApiActivityTracker() {
  if (installed || typeof window === "undefined") {
    return;
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const shouldTrack = isTrackedApiRequest(input);

    if (shouldTrack) {
      activeCount += 1;
      notifyListeners();
    }

    try {
      return await originalFetch(input, init);
    } finally {
      if (shouldTrack) {
        activeCount = Math.max(0, activeCount - 1);
        notifyListeners();
      }
    }
  };

  installed = true;
}

export function subscribeToClientApiActivity(listener: ApiActivityListener): () => void {
  listeners.add(listener);
  listener(activeCount);

  return () => {
    listeners.delete(listener);
  };
}

export function getClientApiActiveCount(): number {
  return activeCount;
}
