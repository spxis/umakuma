import { WK_STATUSES, type WkStatus } from "@/lib/domainConstants";
import { parseJlptWordExamples } from "@/lib/jlptWordExamples";
import type { JlptWordExample } from "@/lib/jlptTypes";

export type { JlptWordExample } from "@/lib/jlptTypes";

export function parseWordExamples(input: unknown): JlptWordExample[] {
  return parseJlptWordExamples(input);
}

export function jlptStatusClass(
  status: WkStatus | undefined,
): string {
  if (status === WK_STATUSES.locked) return "bg-surface-muted text-foreground/70";
  if (status === WK_STATUSES.apprentice) return "bg-pink-100 text-pink-700";
  if (status === WK_STATUSES.guru) return "bg-violet-100 text-violet-700";
  if (status === WK_STATUSES.master) return "bg-sky-100 text-sky-700";
  if (status === WK_STATUSES.enlightened) return "bg-amber-100 text-amber-700";
  if (status === WK_STATUSES.burned) return "bg-surface-muted text-foreground/80";
  return "bg-surface-muted text-foreground/65";
}
