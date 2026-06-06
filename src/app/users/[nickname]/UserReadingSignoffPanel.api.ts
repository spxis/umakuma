import type { ReadingSignoffResponse } from "./UserReadingSignoffPanel.types";

export async function fetchReadingSignoffs(url: string): Promise<ReadingSignoffResponse> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json()) as ReadingSignoffResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not load check-ins.");
  }

  return payload;
}
