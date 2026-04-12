export type JlptWordExample = {
  written: string;
  pronounced: string;
  gloss: string;
};

export function parseWordExamples(input: unknown): JlptWordExample[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const rows: JlptWordExample[] = [];
  for (const value of input) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const record = value as Record<string, unknown>;
    const written = typeof record.written === "string" ? record.written.trim() : "";
    const pronounced = typeof record.pronounced === "string" ? record.pronounced.trim() : "";
    const gloss = typeof record.gloss === "string" ? record.gloss.trim() : "";

    if (!written && !pronounced) {
      continue;
    }

    rows.push({ written, pronounced, gloss });
  }

  return rows;
}

export function jlptStatusClass(
  status: "locked" | "apprentice" | "guru" | "master" | "enlightened" | "burned" | undefined,
): string {
  if (status === "locked") return "bg-surface-muted text-foreground/70";
  if (status === "apprentice") return "bg-pink-100 text-pink-700";
  if (status === "guru") return "bg-violet-100 text-violet-700";
  if (status === "master") return "bg-sky-100 text-sky-700";
  if (status === "enlightened") return "bg-amber-100 text-amber-700";
  if (status === "burned") return "bg-surface-muted text-foreground/80";
  return "bg-surface-muted text-foreground/65";
}
