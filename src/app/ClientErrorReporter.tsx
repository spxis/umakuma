"use client";

import { useEffect } from "react";
import { emitBrowserTelemetry } from "@/lib/browserTelemetry";

function normalizeMessage(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message;
  }

  if (typeof reason === "string") {
    return reason;
  }

  return "Unhandled client error";
}

export default function ClientErrorReporter() {
  useEffect(() => {
    function handleWindowError(event: ErrorEvent) {
      void emitBrowserTelemetry({
        event: "client_error",
        status: "error",
        severity: "error",
        message: event.message || "Unhandled window error",
        tags: {
          source: "window.error",
          path: window.location.pathname,
        },
        telemetry: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      void emitBrowserTelemetry({
        event: "client_error",
        status: "error",
        severity: "error",
        message: normalizeMessage(event.reason),
        tags: {
          source: "window.unhandledrejection",
          path: window.location.pathname,
        },
      });
    }

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
