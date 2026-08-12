import { after } from "next/server";

import { emitSumilabuTelemetry } from "@/lib/sumilabuTelemetry";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";

type ExecuteRoute<T> = () => Promise<T>;

type Params<T> = {
  route: string;
  method: HttpMethod;
  request?: Request;
  execute: ExecuteRoute<T>;
  getMetrics?: () => Record<string, unknown>;
};

export async function withApiRouteTelemetry<T>({
  route,
  method,
  execute,
  getMetrics,
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
      } else if (status >= 400) {
        severity = "warning";
        outcome = "warn";
      }
    }

    return response;
  } catch (error) {
    status = 500;
    severity = "error";
    outcome = "error";
    message = "Unhandled route error";
    throw error;
  } finally {
    after(() => {
      return emitSumilabuTelemetry({
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
        metrics: getMetrics?.(),
      });
    });
  }
}
