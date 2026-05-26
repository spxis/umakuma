type BrowserTelemetryInput = {
  event: string;
  status?: string;
  severity?: string;
  message?: string;
  tags?: Record<string, unknown>;
  telemetry?: Record<string, unknown>;
};

const DEFAULT_URL = "https://api.sumilabu.com/api/v1/telemetry/events";
const REQUEST_TIMEOUT_MS = 700;

function readPublicEnv(name: string): string | null {
  const value = process.env[name];
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getBrowserTelemetryConfig() {
  const token = readPublicEnv("NEXT_PUBLIC_SUMILABU_BROWSER_INGEST_TOKEN");
  if (!token) {
    return null;
  }

  return {
    token,
    url: readPublicEnv("NEXT_PUBLIC_SUMILABU_TELEMETRY_URL") ?? DEFAULT_URL,
    projectKey: readPublicEnv("NEXT_PUBLIC_SUMILABU_PROJECT_KEY") ?? "umakuma",
    sourceId: readPublicEnv("NEXT_PUBLIC_SUMILABU_BROWSER_SOURCE_ID") ?? "umakuma-browser",
    displayName: readPublicEnv("NEXT_PUBLIC_SUMILABU_DISPLAY_NAME") ?? "UmaKuma",
  };
}

export async function emitBrowserTelemetry(input: BrowserTelemetryInput): Promise<void> {
  const config = getBrowserTelemetryConfig();
  if (!config) {
    return;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  const payload = {
    api_version: "v1",
    project_key: config.projectKey,
    source_type: "app",
    source_id: config.sourceId,
    display_name: config.displayName,
    environment: process.env.NODE_ENV ?? "production",
    host: window.location.host,
    service: "next-client",
    event: input.event,
    status: input.status,
    severity: input.severity,
    message: input.message,
    tags: input.tags,
    telemetry: input.telemetry,
    occurred_at: new Date().toISOString(),
  };

  try {
    await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      keepalive: true,
      cache: "no-store",
    });
  } catch {
    // Browser telemetry is best effort only.
  } finally {
    window.clearTimeout(timeout);
  }
}
