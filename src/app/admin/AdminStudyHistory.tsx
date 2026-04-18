"use client";

import { useCallback, useState } from "react";

type Attempt = {
  id: string;
  accountId: string;
  nickname: string;
  assignmentId: number;
  subjectId: number;
  subjectType: string;
  result: string;
  submittedAt: string;
};

type HistoryData = {
  attempts: Attempt[];
  totals: Record<string, number>;
  accountCount: number;
};

export default function AdminStudyHistory({ sessionAuthorized }: { sessionAuthorized: boolean }) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setExpanded(true);
    if (data) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/study-history?limit=100", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load study history.");
      setData((await res.json()) as HistoryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }, [data]);

  if (!sessionAuthorized) return null;

  const resultColor: Record<string, string> = {
    correct: "text-emerald-600",
    wrong: "text-red-500",
    skipped: "text-amber-500",
  };

  const typeColor: Record<string, string> = {
    radical: "bg-sky-100 text-sky-700",
    kanji: "bg-pink-100 text-pink-700",
    vocabulary: "bg-violet-100 text-violet-700",
  };

  return (
    <section className="rounded-2xl border border-line bg-surface/90 p-5 shadow-sm">
      <button
        type="button"
        onClick={() => (expanded ? setExpanded(false) : void load())}
        className="text-sm font-bold uppercase tracking-[0.1em] text-foreground"
      >
        Study Submission History {expanded ? "▲" : "▼"}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {loading && <p className="text-sm text-muted">Loading...</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {data && (
            <>
              <div className="flex flex-wrap gap-4 text-sm">
                <span>
                  Total:{" "}
                  <strong>
                    {Object.values(data.totals).reduce((a, b) => a + b, 0)}
                  </strong>
                </span>
                <span>
                  Correct:{" "}
                  <strong className="text-emerald-600">{data.totals.correct ?? 0}</strong>
                </span>
                <span>
                  Wrong: <strong className="text-red-500">{data.totals.wrong ?? 0}</strong>
                </span>
                {(data.totals.skipped ?? 0) > 0 && (
                  <span>
                    Skipped:{" "}
                    <strong className="text-amber-500">{data.totals.skipped}</strong>
                  </span>
                )}
                <span>
                  Accounts: <strong>{data.accountCount}</strong>
                </span>
              </div>

              <div className="max-h-[32rem] overflow-auto rounded-lg border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-surface-muted text-[0.65rem] uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-2 py-1.5">Time</th>
                      <th className="px-2 py-1.5">User</th>
                      <th className="px-2 py-1.5">Result</th>
                      <th className="px-2 py-1.5">Type</th>
                      <th className="px-2 py-1.5">Subject</th>
                      <th className="px-2 py-1.5">Assignment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/50">
                    {data.attempts.map((a) => (
                      <tr key={a.id} className="hover:bg-surface-muted/40">
                        <td className="whitespace-nowrap px-2 py-1 font-mono text-muted">
                          {formatTime(a.submittedAt)}
                        </td>
                        <td className="px-2 py-1">{a.nickname}</td>
                        <td className={`px-2 py-1 font-bold ${resultColor[a.result] ?? ""}`}>
                          {a.result}
                        </td>
                        <td className="px-2 py-1">
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[0.6rem] font-bold uppercase ${typeColor[a.subjectType] ?? "bg-gray-100 text-gray-600"}`}
                          >
                            {a.subjectType}
                          </span>
                        </td>
                        <td className="px-2 py-1 font-mono">{a.subjectId}</td>
                        <td className="px-2 py-1 font-mono text-muted">{a.assignmentId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}:${seconds}`;
}
