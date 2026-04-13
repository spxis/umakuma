import { formatDate } from "../lib/jlptDisplay";

type TrendRow = {
  capturedAt: string;
  percentageCorrect: number;
  totalAnswers: number;
  correctAnswers: number;
  wrongAnswers: number;
  source: string;
};

type KanjiStats = {
  latest?: {
    percentageCorrect?: number;
    meaningCorrect?: number;
    meaningIncorrect?: number;
    readingCorrect?: number;
    readingIncorrect?: number;
    capturedAt?: string;
    source?: string;
  };
  trend?: TrendRow[];
};

function Collapsible({
  open,
  onToggle,
  label,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onToggle}
        className="mb-2 rounded border border-line bg-surface-muted px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-foreground/80 hover:bg-surface"
        aria-expanded={open}
      >
        {open ? "Hide" : "Show"} {label}
      </button>
      {open ? <div className="rounded border border-line bg-surface-muted p-3">{children}</div> : null}
    </div>
  );
}

export default function JlptExplorerStatsPanel({
  open,
  onToggle,
  loading,
  error,
  kanjiStats,
}: {
  open: boolean;
  onToggle: () => void;
  loading: boolean;
  error: string | null;
  kanjiStats: KanjiStats | null;
}) {
  return (
    <Collapsible open={open} onToggle={onToggle} label="Review Stats">
      {loading ? (
        <div className="text-xs text-foreground/60">Loading stats...</div>
      ) : error ? (
        <div className="text-xs text-red-600">{error}</div>
      ) : kanjiStats ? (
        <div>
          {kanjiStats.latest ? (
            <div className="mb-2">
              <div className="mb-1 text-sm font-bold">Latest Snapshot</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Correct %:</div>
                <div>{kanjiStats.latest.percentageCorrect ?? "-"}</div>
                <div>Meaning Correct:</div>
                <div>{kanjiStats.latest.meaningCorrect ?? "-"}</div>
                <div>Meaning Incorrect:</div>
                <div>{kanjiStats.latest.meaningIncorrect ?? "-"}</div>
                <div>Reading Correct:</div>
                <div>{kanjiStats.latest.readingCorrect ?? "-"}</div>
                <div>Reading Incorrect:</div>
                <div>{kanjiStats.latest.readingIncorrect ?? "-"}</div>
                <div>Captured At:</div>
                <div>{kanjiStats.latest.capturedAt ? formatDate(kanjiStats.latest.capturedAt) : "-"}</div>
                <div>Source:</div>
                <div>{kanjiStats.latest.source ?? "-"}</div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-foreground/60">No stats yet.</div>
          )}
          {kanjiStats.trend && kanjiStats.trend.length > 1 ? (
            <div>
              <div className="mb-1 mt-2 text-sm font-bold">History Trend</div>
              <div className="overflow-x-auto">
                <table className="min-w-[320px] border border-line text-xs">
                  <thead>
                    <tr className="bg-surface-muted">
                      <th className="border-b border-line px-2 py-1">Date</th>
                      <th className="border-b border-line px-2 py-1">% Correct</th>
                      <th className="border-b border-line px-2 py-1">Total</th>
                      <th className="border-b border-line px-2 py-1">Correct</th>
                      <th className="border-b border-line px-2 py-1">Wrong</th>
                      <th className="border-b border-line px-2 py-1">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kanjiStats.trend.map((row, i) => (
                      <tr key={`${row.capturedAt}-${i}`}>
                        <td className="border-b border-line px-2 py-1">{formatDate(row.capturedAt)}</td>
                        <td className="border-b border-line px-2 py-1">{row.percentageCorrect}</td>
                        <td className="border-b border-line px-2 py-1">{row.totalAnswers}</td>
                        <td className="border-b border-line px-2 py-1">{row.correctAnswers}</td>
                        <td className="border-b border-line px-2 py-1">{row.wrongAnswers}</td>
                        <td className="border-b border-line px-2 py-1">{row.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Collapsible>
  );
}
