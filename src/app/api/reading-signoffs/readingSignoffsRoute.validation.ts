import { z } from "zod";
import { isMonthKey, isPstDateKey } from "@/lib/readingSignoff";

export const getQuerySchema = z.object({
  month: z.string().refine((value) => isMonthKey(value), {
    message: "Invalid month key.",
  }),
  challengeId: z.string().min(1).max(120).optional(),
  accountId: z.string().cuid().optional(),
});

export const postBodySchema = z.object({
  accountId: z.string().cuid(),
  challengeId: z.string().min(1).max(120).optional(),
  signoffDatePst: z.string().refine((value) => isPstDateKey(value), {
    message: "Invalid signoff date.",
  }),
  submittedAt: z.string().datetime({ offset: true }).optional(),
  bookTitle: z.string().trim().min(1).max(180),
  pagesRead: z.number().int().min(0).max(2000),
  minutesRead: z.number().int().min(0).max(1440),
  didWanikaniReviews: z.boolean(),
});

export const patchBodySchema = z.object({
  accountId: z.string().cuid(),
  tracked: z.boolean(),
});

export function prismaErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const candidate = error as { code?: unknown };
  return typeof candidate.code === "string" ? candidate.code : null;
}
