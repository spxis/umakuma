type TrendPoint = {
  timeMs: number;
  label: string;
  correct: number;
  wrong: number;
};

type SuccessRatePoint = {
  timeMs: number;
  label: string;
  rate: number;
};

type ActivityPoint = {
  timeMs: number;
  label: string;
  reviews: number;
};

export function SuccessFailureSplitChart({ correct, wrong }: { correct: number; wrong: number }) {
  const total = Math.max(0, correct) + Math.max(0, wrong);
  const safeTotal = Math.max(1, total);
  const correctPct = Math.round((Math.max(0, correct) / safeTotal) * 100);
  const wrongPct = Math.round((Math.max(0, wrong) / safeTotal) * 100);
  const difficulty =
    total < 8 ? "Insufficient data" : correctPct >= 90 ? "Easy" : correctPct >= 75 ? "Medium" : "Hard";
  const difficultyClass =
    difficulty === "Easy"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : difficulty === "Medium"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : difficulty === "Hard"
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-line bg-surface text-foreground";

  return (
    <div>
      <p className="mb-1 text-sm font-bold">Success vs Failure</p>
      <div className="overflow-hidden rounded-lg border border-line bg-surface-muted">
        <div className="flex h-6 w-full">
          <div className="bg-emerald-500" style={{ width: `${correctPct}%` }} />
          <div className="bg-rose-500" style={{ width: `${wrongPct}%` }} />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1">
          <p className="font-bold uppercase text-emerald-700">Correct</p>
          <p className="mt-1 font-black text-emerald-800">{correct}</p>
        </div>
        <div className="rounded border border-rose-200 bg-rose-50 px-2 py-1">
          <p className="font-bold uppercase text-rose-700">Incorrect</p>
          <p className="mt-1 font-black text-rose-800">{wrong}</p>
        </div>
        <div className="rounded border border-line bg-surface px-2 py-1">
          <p className="font-bold uppercase text-foreground/70">Success Rate</p>
          <p className="mt-1 font-black text-foreground">{correctPct}%</p>
          <p className="text-[10px] text-foreground/60">{total} attempts</p>
        </div>
        <div className={`rounded border px-2 py-1 ${difficultyClass}`}>
          <p className="font-bold uppercase">Difficulty</p>
          <p className="mt-1 font-black">{difficulty}</p>
          <p className="text-[10px] opacity-80">For this item</p>
        </div>
      </div>
    </div>
  );
}

export function SrsProgressChart({ currentSrsStage }: { currentSrsStage: number }) {
  const burnedStage = 9;
  const clamped = Math.max(1, Math.min(burnedStage, currentSrsStage));
  const progressPct = Math.round((clamped / burnedStage) * 100);
  const remaining = Math.max(0, burnedStage - clamped);

  return (
    <div>
      <p className="mb-1 text-sm font-bold">SRS Progress To Burned</p>
      <div className="overflow-hidden rounded-lg border border-line bg-surface-muted">
        <div className="h-6 bg-indigo-500" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded border border-line bg-surface px-2 py-1">
          <p className="font-bold uppercase text-foreground/70">Current</p>
          <p className="mt-1 font-black text-foreground">{clamped}</p>
        </div>
        <div className="rounded border border-line bg-surface px-2 py-1">
          <p className="font-bold uppercase text-foreground/70">Target</p>
          <p className="mt-1 font-black text-foreground">{burnedStage}</p>
        </div>
        <div className="rounded border border-line bg-surface px-2 py-1">
          <p className="font-bold uppercase text-foreground/70">Remaining</p>
          <p className="mt-1 font-black text-foreground">{remaining}</p>
        </div>
      </div>
    </div>
  );
}

export function CorrectWrongTrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) {
    return (
      <div>
        <p className="mb-1 text-sm font-bold">Correct/Incorrect Snapshot Trend</p>
        <p className="text-xs text-foreground/60">Latest snapshot loaded. Need at least two snapshots over time to draw this trend.</p>
      </div>
    );
  }

  const width = 420;
  const height = 200;
  const padLeft = 34;
  const padRight = 12;
  const padTop = 12;
  const padBottom = 24;
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;

  const minTime = points[0]?.timeMs ?? 0;
  const maxTime = points[points.length - 1]?.timeMs ?? minTime + 1;
  const timeRange = Math.max(1, maxTime - minTime);
  const maxCount = Math.max(1, ...points.map((point) => Math.max(point.correct, point.wrong)));

  const toX = (timeMs: number) => padLeft + ((timeMs - minTime) / timeRange) * innerWidth;
  const toY = (count: number) => padTop + innerHeight - (count / maxCount) * innerHeight;

  const correctPolyline = points.map((point) => `${toX(point.timeMs)},${toY(point.correct)}`).join(" ");
  const wrongPolyline = points.map((point) => `${toX(point.timeMs)},${toY(point.wrong)}`).join(" ");

  return (
    <div>
      <p className="mb-1 text-sm font-bold">Correct/Incorrect Snapshot Trend</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[200px] w-full rounded border border-line bg-surface">
        {[0, Math.ceil(maxCount / 2), maxCount].map((tick) => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="currentColor" opacity="0.12" />
              <text x={padLeft - 6} y={y + 4} textAnchor="end" fontSize="10" className="fill-foreground/70">
                {tick}
              </text>
            </g>
          );
        })}
        <polyline fill="none" strokeWidth="2" className="text-emerald-600" stroke="currentColor" points={correctPolyline} />
        <polyline fill="none" strokeWidth="2" className="text-rose-600" stroke="currentColor" points={wrongPolyline} />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] font-semibold uppercase tracking-[0.05em] text-foreground/60">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function SuccessRateTrendChart({ points }: { points: SuccessRatePoint[] }) {
  if (points.length < 2) {
    return (
      <div>
        <p className="mb-1 text-sm font-bold">Success Rate Snapshot Trend</p>
        <p className="text-xs text-foreground/60">Latest snapshot loaded. Need at least two snapshots over time to draw this trend.</p>
      </div>
    );
  }

  const width = 420;
  const height = 150;
  const padLeft = 34;
  const padRight = 12;
  const padTop = 12;
  const padBottom = 24;
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;

  const minTime = points[0]?.timeMs ?? 0;
  const maxTime = points[points.length - 1]?.timeMs ?? minTime + 1;
  const timeRange = Math.max(1, maxTime - minTime);

  const toX = (timeMs: number) => padLeft + ((timeMs - minTime) / timeRange) * innerWidth;
  const toY = (rate: number) => padTop + innerHeight - (Math.max(0, Math.min(100, rate)) / 100) * innerHeight;
  const polyline = points.map((point) => `${toX(point.timeMs)},${toY(point.rate)}`).join(" ");

  return (
    <div>
      <p className="mb-1 text-sm font-bold">Success Rate Snapshot Trend</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[150px] w-full rounded border border-line bg-surface">
        {[0, 50, 100].map((tick) => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="currentColor" opacity="0.12" />
              <text x={padLeft - 6} y={y + 4} textAnchor="end" fontSize="10" className="fill-foreground/70">
                {tick}%
              </text>
            </g>
          );
        })}
        <polyline fill="none" strokeWidth="2" className="text-indigo-600" stroke="currentColor" points={polyline} />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] font-semibold uppercase tracking-[0.05em] text-foreground/60">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function ReviewActivityTrendChart({ points }: { points: ActivityPoint[] }) {
  if (points.length < 2) {
    return (
      <div>
        <p className="mb-1 text-sm font-bold">WaniKani Review Activity</p>
        <p className="text-xs text-foreground/60">Need at least two days of review history to draw activity trend.</p>
      </div>
    );
  }

  const width = 420;
  const height = 150;
  const padLeft = 34;
  const padRight = 12;
  const padTop = 12;
  const padBottom = 24;
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;

  const minTime = points[0]?.timeMs ?? 0;
  const maxTime = points[points.length - 1]?.timeMs ?? minTime + 1;
  const timeRange = Math.max(1, maxTime - minTime);
  const maxReviews = Math.max(1, ...points.map((point) => point.reviews));

  const toX = (timeMs: number) => padLeft + ((timeMs - minTime) / timeRange) * innerWidth;
  const toY = (count: number) => padTop + innerHeight - (count / maxReviews) * innerHeight;
  const polyline = points.map((point) => `${toX(point.timeMs)},${toY(point.reviews)}`).join(" ");

  return (
    <div>
      <p className="mb-1 text-sm font-bold">WaniKani Review Activity</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[150px] w-full rounded border border-line bg-surface">
        {[0, Math.ceil(maxReviews / 2), maxReviews].map((tick) => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="currentColor" opacity="0.12" />
              <text x={padLeft - 6} y={y + 4} textAnchor="end" fontSize="10" className="fill-foreground/70">
                {tick}
              </text>
            </g>
          );
        })}
        <polyline fill="none" strokeWidth="2" className="text-sky-600" stroke="currentColor" points={polyline} />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] font-semibold uppercase tracking-[0.05em] text-foreground/60">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export type { TrendPoint, SuccessRatePoint, ActivityPoint };
