import { useEffect, useMemo, useState, type ReactNode } from "react";

import { usePersistedBoolean } from "@/lib/usePersistedBoolean";
import FieldLabel from "../../../../shared/FieldLabel";
import type { ReviewResult } from "@/lib/domainConstants";
import {
  buildReviewOutcomeSeries,
  summarizeReviewOutcomes,
} from "@/lib/reviewStatsOutcomes";

import {
  CorrectWrongTrendChart,
  ReviewActivityTrendChart,
  SrsProgressChart,
  SuccessFailureSplitChart,
  SuccessRateTrendChart,
} from "./LevelExplorerReviewStatsCharts";
import type {
  ActivityPoint,
  SuccessRatePoint,
  TrendPoint,
} from "./LevelExplorerReviewStatsCharts.types";

type ReviewAttempt = {
  result: ReviewResult;
  submittedAt: string;
};

type SubjectHistory = {
  attempts: {
    history: ReviewAttempt[];
  };
};

type CachedHistoryPayload = {
  fetchedAt: number;
  attempts: ReviewAttempt[];
};

const HISTORY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const reviewStatsHistoryCache = new Map<string, CachedHistoryPayload>();

async function fetchSubjectHistoryPayload(url: string): Promise<{ history?: SubjectHistory }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Could not load review stats");
  }

  return response.json() as Promise<{ history?: SubjectHistory }>;
}

function formatGraphDateLabel(input: string): string {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function Collapsible({
  open,
  onToggle,
  label,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-2 rounded-xl border border-line bg-surface px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel size="xs" tone="muted">{label}</FieldLabel>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-full border border-line bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-foreground hover:bg-surface-muted"
          aria-expanded={open}
        >
          {open ? "Collapse" : "Expand"}
        </button>
      </div>
      {open ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}

export default function LevelExplorerReviewStatsCard({
  accountId,
  subjectId,
  currentSrsStage,
}: {
  accountId: string;
  subjectId: number;
  currentSrsStage: number;
  startedAt?: string | null;
}) {
  const cacheKey = `${accountId}:${subjectId}`;
  const openStateStorageKey = `wr:review-stats-open:${accountId}`;
  const [open, setOpen] = usePersistedBoolean(openStateStorageKey, {
    defaultValue: false,
    mode: "one-is-true",
  });

  const [attempts, setAttempts] = useState<ReviewAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const cached = reviewStatsHistoryCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < HISTORY_CACHE_TTL_MS) {
      queueMicrotask(() => {
        if (cancelled) {
          return;
        }
        setAttempts(cached.attempts);
        setError(null);
        setLoading(false);
      });

      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }
      setAttempts([]);
      setError(null);
      setLoading(true);
    });

    fetchSubjectHistoryPayload(`/api/study/${accountId}/subjects/${subjectId}/history`)
      .then((data) => {
        if (cancelled) {
          return;
        }

        const nextAttempts = Array.isArray(data.history?.attempts.history)
          ? data.history.attempts.history
          : [];
        setAttempts(nextAttempts);
        setError(null);
        reviewStatsHistoryCache.set(cacheKey, {
          fetchedAt: Date.now(),
          attempts: nextAttempts,
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setError("Could not load review stats");
      })
      .finally(() => {
        if (cancelled) {
          return;
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountId, subjectId, cacheKey, refreshNonce]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onStudyReviewSubmitted = (event: Event) => {
      const custom = event as CustomEvent<{ accountId?: string; subjectId?: number }>;
      if (custom.detail?.accountId !== accountId) {
        return;
      }

      const targetSubjectId = custom.detail?.subjectId;
      if (typeof targetSubjectId === "number") {
        reviewStatsHistoryCache.delete(`${accountId}:${targetSubjectId}`);
      } else {
        for (const key of reviewStatsHistoryCache.keys()) {
          if (key.startsWith(`${accountId}:`)) {
            reviewStatsHistoryCache.delete(key);
          }
        }
      }

      if (targetSubjectId === subjectId || typeof targetSubjectId !== "number") {
        setRefreshNonce((prev) => prev + 1);
      }
    };

    window.addEventListener("wr:study-review-submitted", onStudyReviewSubmitted as EventListener);
    return () => {
      window.removeEventListener("wr:study-review-submitted", onStudyReviewSubmitted as EventListener);
    };
  }, [accountId, subjectId]);

  const totals = useMemo(() => {
    return summarizeReviewOutcomes(attempts);
  }, [attempts]);

  const outcomeSeries = useMemo(() => {
    return buildReviewOutcomeSeries([...attempts].reverse());
  }, [attempts]);

  const trendPoints = useMemo(() => {
    return outcomeSeries
      .map((row) => {
        const timeMs = new Date(row.submittedAt).getTime();
        if (!Number.isFinite(timeMs)) return null;

        return {
          timeMs,
          label: formatGraphDateLabel(row.submittedAt),
          success: row.success,
          failure: row.failure,
        };
      })
      .filter((row): row is TrendPoint => row !== null)
      .sort((a, b) => a.timeMs - b.timeMs)
      .slice(-60);
  }, [outcomeSeries]);

  const successRatePoints = useMemo(() => {
    return outcomeSeries
      .map((row) => {
        const timeMs = new Date(row.submittedAt).getTime();
        if (!Number.isFinite(timeMs)) return null;

        return {
          timeMs,
          label: formatGraphDateLabel(row.submittedAt),
          rate: Math.round((row.success / row.total) * 100),
        };
      })
      .filter((row): row is SuccessRatePoint => row !== null)
      .sort((a, b) => a.timeMs - b.timeMs)
      .slice(-60);
  }, [outcomeSeries]);

  const activityPoints = useMemo(() => {
    if (!attempts.length) {
      return [] as ActivityPoint[];
    }

    const byDay = new Map<string, number>();
    for (const row of attempts) {
      const parsed = new Date(row.submittedAt);
      if (Number.isNaN(parsed.getTime())) continue;

      const key = parsed.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }

    return Array.from(byDay.entries())
      .map(([day, reviews]) => {
        const timeMs = new Date(`${day}T00:00:00.000Z`).getTime();
        if (!Number.isFinite(timeMs)) return null;
        return {
          timeMs,
          label: formatGraphDateLabel(day),
          reviews,
        };
      })
      .filter((row): row is ActivityPoint => row !== null)
      .sort((a, b) => a.timeMs - b.timeMs)
      .slice(-90);
  }, [attempts]);

  return (
    <Collapsible open={open} onToggle={() => setOpen((prev) => !prev)} label="Review Stats">
      {loading ? <p className="text-xs text-foreground/60">Loading stats...</p> : null}
      {!loading && error ? <p className="text-xs text-red-600">{error}</p> : null}
      {!loading && !error && attempts.length === 0 ? <p className="text-xs text-foreground/60">No stats yet.</p> : null}

      {!loading && !error && attempts.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-1 text-sm font-bold">Review Outcomes</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Successful reviews:</div>
              <div>{totals.success}</div>
              <div>Failed reviews:</div>
              <div>{totals.failure}</div>
              <div>Total reviews:</div>
              <div>{totals.success + totals.failure}</div>
              <div>Current SRS:</div>
              <div>{currentSrsStage}</div>
            </div>
          </div>

          <div className="space-y-3">
            <SuccessFailureSplitChart success={totals.success} failure={totals.failure} />
            <SrsProgressChart currentSrsStage={currentSrsStage} />
            <CorrectWrongTrendChart points={trendPoints} />
            <SuccessRateTrendChart points={successRatePoints} />
            <ReviewActivityTrendChart points={activityPoints} />
          </div>
        </div>
      ) : null}
    </Collapsible>
  );
}
