import { emitSumilabuTelemetry } from "@/lib/sumilabuTelemetry";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";

type ExecuteRoute<T> = () => Promise<T>;

type Params<T> = {
  route: string;
  method: HttpMethod;
  request?: Request;
  execute: ExecuteRoute<T>;
};

async function readResponseMessage(response: Response): Promise<string | undefined> {
  const contentType = response.headers.get("content-type") ?? "";
  const clone = response.clone();

  if (contentType.includes("application/json")) {
    try {
      const payload = (await clone.json()) as { error?: unknown; message?: unknown };
      if (typeof payload.error === "string" && payload.error.trim().length > 0) {
        return payload.error;
      }
      if (typeof payload.message === "string" && payload.message.trim().length > 0) {
        return payload.message;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  try {
    const text = (await clone.text()).trim();
    return text.length > 0 ? text.slice(0, 240) : undefined;
  } catch {
    return undefined;
  }
}

export async function withApiRouteTelemetry<T>({
  route,
  method,
  request,
  execute,
}: Params<T>): Promise<T> {
  const startedAtMs = Date.now();
  let status = 200;
  let severity = "info";
  let outcome = "ok";
  let message: string | undefined;

  try {
    const response = await execute();

    if (response instanceof Response) {
      status = response.status;
      if (status >= 500) {
        severity = "error";
        outcome = "error";
        message = await readResponseMessage(response);
      } else if (status >= 400) {
        severity = "warning";
        outcome = "warn";
        message = await readResponseMessage(response);
      }
    }

    return response;
  } catch (error) {
    status = 500;
    severity = "error";
    outcome = "error";
    message = error instanceof Error ? error.message : "Unhandled route error";
    throw error;
  } finally {
    void emitSumilabuTelemetry({
      event: "api_route",
      status: outcome,
      severity,
      message,
      durationMs: Date.now() - startedAtMs,
      tags: {
        route,
        method,
        http_status: status,
      },
      telemetry: {
        url: request?.url,
      },
    });
  }
}
