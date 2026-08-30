import { after, NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import {
  WANIKANI_REQUIRED_MESSAGE,
  WANIKANI_REQUIRED_STATUS,
  wanikaniConnection,
} from "@/lib/wanikaniConnection";
import { prisma } from "@/lib/prisma";
import { recordStudyReviewAttempt, recordSubmissionSnapshot } from "@/lib/studyHistory";
import { clearReviewPerformanceCache } from "@/lib/reviewSuccessRates";
import { clearStudyQueueCache } from "@/lib/studyQueueCache";
import { emitSumilabuTelemetry } from "@/lib/sumilabuTelemetry";
import { WK_STATUSES, type WkStatus, REVIEW_RESULTS } from "@/lib/domainConstants";
import { srsLabel } from "@/lib/wanikani/helpers";
import { postWaniKani } from "@/lib/wanikani/http";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

const reviewSchema = z.object({
  assignmentId: z.number().int(),
  practiceSubjectId: z.number().int().positive().optional(),
  practiceType: z.enum(["trouble"]).optional(),
  result: z.enum(["correct", "wrong"]),
  answerType: z.enum(["combined", "reading", "meaning"]).default("combined"),
});

type ReviewSubmissionResponse = {
  data?: {
    subject_id?: number;
    starting_srs_stage?: number;
    ending_srs_stage?: number;
  };
  resources_updated?: {
    assignment?: {
      data?: {
        subject_id?: number;
        subject_type?: string;
        srs_stage?: number;
      };
    };
    review_statistic?: {
      data?: {
        subject_id?: number;
        subject_type?: string;
        meaning_correct?: number;
        meaning_incorrect?: number;
        meaning_current_streak?: number;
        meaning_max_streak?: number;
        reading_correct?: number;
        reading_incorrect?: number;
        reading_current_streak?: number;
        reading_max_streak?: number;
        percentage_correct?: number;
      };
    };
  };
};

type ReviewSrsGrouping = WkStatus;

function toStageOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const stage = Math.trunc(value);
  return stage >= 0 ? stage : null;
}

function toGrouping(stage: number | null): ReviewSrsGrouping | null {
  if (stage === null) {
    return null;
  }

  return srsLabel(stage, stage <= 0);
}

function transitionDirection(params: {
  previousGrouping: ReviewSrsGrouping | null;
  newGrouping: ReviewSrsGrouping | null;
}): "promoted" | "demoted" | "unchanged" | "unknown" {
  const { previousGrouping, newGrouping } = params;
  if (!previousGrouping || !newGrouping) {
    return "unknown";
  }

  if (previousGrouping === newGrouping) {
    return "unchanged";
  }

  const groupingOrder: ReviewSrsGrouping[] = [
    WK_STATUSES.locked,
    WK_STATUSES.apprentice,
    WK_STATUSES.guru,
    WK_STATUSES.master,
    WK_STATUSES.enlightened,
    WK_STATUSES.burned,
  ];
  const previousIndex = groupingOrder.indexOf(previousGrouping);
  const nextIndex = groupingOrder.indexOf(newGrouping);

  if (previousIndex < 0 || nextIndex < 0) {
    return "unknown";
  }

  return nextIndex > previousIndex ? "promoted" : "demoted";
}

export async function POST(request: Request, context: RouteContext) {
  const performanceMetrics: Record<string, number> = {};

  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/review",
    method: "POST",
    request,
    getMetrics: () => performanceMetrics,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

    const json = await request.json();
    const parsed = reviewSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: {
        tokenEncrypted: true,
        tokenIv: true,
        tokenTag: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const connection = wanikaniConnection(account);
                if (!connection) {
                  return NextResponse.json(
                    { error: WANIKANI_REQUIRED_MESSAGE },
                    { status: WANIKANI_REQUIRED_STATUS },
                  );
                }
                const token = connection.token;

    const incorrect = parsed.data.result === REVIEW_RESULTS.wrong ? 1 : 0;
    const incorrectMeaningAnswers = parsed.data.answerType === "reading" ? 0 : incorrect;
    const incorrectReadingAnswers = parsed.data.answerType === "meaning" ? 0 : incorrect;

    if (parsed.data.practiceType === "trouble" && typeof parsed.data.practiceSubjectId === "number") {
      clearStudyQueueCache(accountId);
      return NextResponse.json({
        ok: true,
        practice: true,
        review: {
          assignmentId: parsed.data.assignmentId,
          subjectId: parsed.data.practiceSubjectId,
          subjectType: "kanji",
          previousSrsStage: null,
          newSrsStage: null,
          previousGrouping: null,
          newGrouping: null,
          transition: "unknown",
        },
      });
    }

    if (parsed.data.assignmentId <= 0) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    let submissionResponse: ReviewSubmissionResponse | null = null;

    const waniKaniStartedAtMs = Date.now();
    try {
      submissionResponse = await postWaniKani<ReviewSubmissionResponse>(
        "/reviews",
        token,
        {
          review: {
            assignment_id: parsed.data.assignmentId,
            incorrect_meaning_answers: incorrectMeaningAnswers,
            incorrect_reading_answers: incorrectReadingAnswers,
          },
        },
        (timing) => {
          performanceMetrics.wanikani_throttle_wait_ms = timing.throttleWaitMs;
          performanceMetrics.wanikani_network_ms = timing.networkMs;
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "WaniKani API error";

      // Treat stale/unavailable submissions as already handled so study flow can continue.
      if (message.includes("422") || message.includes("409") || message.includes("404")) {
        console.warn(`[review] Assignment ${parsed.data.assignmentId} skipped (${message.slice(0, 80)})`);
        clearStudyQueueCache(accountId);
        return NextResponse.json({ ok: true, skipped: true, reason: "already-reviewed-or-unavailable" });
      }

      if (message.includes("429")) {
        return NextResponse.json({ error: "Rate limited by WaniKani. Please retry in a moment." }, { status: 429 });
      }

      return NextResponse.json(
        { error: "Couldn't submit that review to WaniKani. Try again in a moment." },
        { status: 502 },
      );
    } finally {
      performanceMetrics.wanikani_submit_ms = Date.now() - waniKaniStartedAtMs;
    }

    const subjectId =
      submissionResponse?.resources_updated?.review_statistic?.data?.subject_id ??
      submissionResponse?.data?.subject_id;

    const subjectType =
      submissionResponse?.resources_updated?.review_statistic?.data?.subject_type ??
      submissionResponse?.resources_updated?.assignment?.data?.subject_type ??
      "unknown";

    performanceMetrics.history_deferred = 1;
    after(async () => {
      const historyStartedAtMs = Date.now();
      const historyResults = await Promise.allSettled([
        typeof subjectId === "number" && Number.isInteger(subjectId) && subjectId > 0
          ? recordStudyReviewAttempt({
              accountId,
              assignmentId: parsed.data.assignmentId,
              subjectId,
              subjectType,
              result: parsed.data.result,
            })
          : Promise.resolve(),
        recordSubmissionSnapshot({
          accountId,
          data: submissionResponse?.resources_updated?.review_statistic?.data,
        }),
      ]);
      clearReviewPerformanceCache(accountId);
      const failedWrites = historyResults.filter((result) => result.status === "rejected").length;
      if (failedWrites > 0) {
        console.error("Failed to persist local study history");
      }
      await emitSumilabuTelemetry({
        event: "study_review_history",
        status: failedWrites > 0 ? "error" : "ok",
        severity: failedWrites > 0 ? "error" : "info",
        durationMs: Date.now() - historyStartedAtMs,
        metrics: {
          attempted_writes: historyResults.length,
          failed_writes: failedWrites,
        },
      });
    });

    const previousSrsStage = toStageOrNull(submissionResponse?.data?.starting_srs_stage);
    const newSrsStage =
      toStageOrNull(submissionResponse?.data?.ending_srs_stage) ??
      toStageOrNull(submissionResponse?.resources_updated?.assignment?.data?.srs_stage);
    const previousGrouping = toGrouping(previousSrsStage);
    const newGrouping = toGrouping(newSrsStage);
    const transition = transitionDirection({ previousGrouping, newGrouping });

    clearStudyQueueCache(accountId);

    return NextResponse.json({
      ok: true,
      review: {
        assignmentId: parsed.data.assignmentId,
        subjectId:
          typeof subjectId === "number" && Number.isInteger(subjectId) && subjectId > 0
            ? subjectId
            : null,
        subjectType,
        previousSrsStage,
        newSrsStage,
        previousGrouping,
        newGrouping,
        transition,
      },
    });
  } catch (error) {
    console.error(error);
        return NextResponse.json({ error: "Could not submit review result." }, { status: 500 });
      }
    },
  });
}
