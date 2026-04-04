"use client";

import { useMemo, useState } from "react";

type LevelItem = {
  subjectId: number;
  wkLevel?: number;
  characters: string;
  meanings: string[];
  readings?: string[];
  primaryReadings?: string[];
  radicals?: Array<{
    subjectId: number;
    label: string;
  }>;
  visuallySimilar?: Array<{
    subjectId: number;
    label: string;
  }>;
  usedInVocabulary?: Array<{
    subjectId: number;
    label: string;
  }>;
  meaningExplanation?: string;
  readingExplanation?: string;
  srsStage: number;
  status: "locked" | "apprentice" | "guru" | "master" | "enlightened" | "burned";
  startedAt?: string | null;
  passedAt?: string | null;
  availableAt: string | null;
};

type Snapshot = {
  level: number;
  kanjiTotal: number;
  kanjiLearned: number;
  kanjiGuruPlus: number;
  kanjiLocked: number;
  estimatedHoursRemaining: number | null;
  items: LevelItem[];
  syncedAt?: string;
};

type Props = {
  accountId: string;
  maxLevel: number;
  initialSnapshot: Snapshot;
};

function normalizeSnapshot(raw: Snapshot): Snapshot {
  return {
    ...raw,
    items: raw.items.map((item) => ({
      ...item,
      wkLevel: item.wkLevel ?? raw.level,
      characters: item.characters ?? "?",
      meanings: item.meanings ?? [],
      readings: item.readings ?? [],
      primaryReadings: item.primaryReadings ?? [],
      radicals: item.radicals ?? [],
      visuallySimilar: item.visuallySimilar ?? [],
      usedInVocabulary: item.usedInVocabulary ?? [],
      meaningExplanation: item.meaningExplanation ?? "",
      readingExplanation: item.readingExplanation ?? "",
      startedAt: item.startedAt ?? null,
      passedAt: item.passedAt ?? null,
      availableAt: item.availableAt ?? null,
    })),
  };
}

function statusClass(status: LevelItem["status"]): string {
  switch (status) {
    case "locked":
      return "bg-slate-100 text-slate-600";
    case "apprentice":
      return "bg-pink-100 text-pink-700";
    case "guru":
      return "bg-violet-100 text-violet-700";
    case "master":
      return "bg-sky-100 text-sky-700";
    case "enlightened":
      return "bg-amber-100 text-amber-700";
    case "burned":
      return "bg-emerald-100 text-emerald-700";
  }
}

function formatNumber(input: number): string {
  return new Intl.NumberFormat("en-US").format(input);
}

function formatDate(input: string | null | undefined): string {
  if (!input) {
    return "-";
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function stripHtml(input: string | undefined): string {
  if (!input) {
    return "";
  }

  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function LevelExplorer({ accountId, maxLevel, initialSnapshot }: Props) {
  const [selectedLevel, setSelectedLevel] = useState(initialSnapshot.level);
  const [snapshot, setSnapshot] = useState<Snapshot>(normalizeSnapshot(initialSnapshot));
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(
    initialSnapshot.items[0]?.subjectId ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const levelOptions = useMemo(() => {
    return Array.from({ length: maxLevel }, (_, index) => index + 1).reverse();
  }, [maxLevel]);

  async function onSelectLevel(level: number) {
    setSelectedLevel(level);
    setError("");

    if (level === snapshot.level) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/accounts/${accountId}/levels/${level}`, { cache: "no-store" });
      const data = (await response.json()) as { error?: string; snapshot?: Snapshot };

      if (!response.ok || !data.snapshot) {
        throw new Error(data.error ?? "Could not load level details.");
      }

      const normalized = normalizeSnapshot(data.snapshot);
      setSnapshot(normalized);
      setSelectedSubjectId(normalized.items[0]?.subjectId ?? null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Could not load level details.");
    } finally {
      setLoading(false);
    }
  }

  const selectedItem =
    snapshot.items.find((item) => item.subjectId === selectedSubjectId) ?? snapshot.items[0] ?? null;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-line bg-surface/90 shadow-[0_20px_55px_rgba(8,16,36,0.12)]">
      <header className="flex flex-col gap-3 border-b border-line bg-surface-muted px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground">Kanji by Level</h2>
          <p className="text-xs uppercase tracking-[0.08em] text-slate-600">
            Choose any level up to {maxLevel}
          </p>
        </div>
        <label className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Level</span>
          <select
            value={selectedLevel}
            onChange={(event) => onSelectLevel(Number(event.target.value))}
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            {levelOptions.map((level) => (
              <option key={level} value={level}>
                Level {level}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="grid gap-3 border-b border-line p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-line bg-surface-muted p-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Total Kanji</p>
          <p className="mt-1 text-2xl font-black text-foreground">{formatNumber(snapshot.kanjiTotal)}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface-muted p-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Learned</p>
          <p className="mt-1 text-2xl font-black text-foreground">{formatNumber(snapshot.kanjiLearned)}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface-muted p-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Guru+</p>
          <p className="mt-1 text-2xl font-black text-accent">{formatNumber(snapshot.kanjiGuruPlus)}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface-muted p-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Locked</p>
          <p className="mt-1 text-2xl font-black text-hot">{formatNumber(snapshot.kanjiLocked)}</p>
        </div>
      </div>

      {loading ? <p className="px-5 py-4 text-sm text-slate-600">Loading level data...</p> : null}
      {error ? <p className="px-5 py-4 text-sm text-red-700">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-line text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
            <tr>
              <th className="px-5 py-3">Kanji</th>
              <th className="px-5 py-3">Meanings</th>
              <th className="px-5 py-3">Readings</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">SRS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-sm">
            {snapshot.items.map((item) => (
              <tr
                key={item.subjectId}
                className={`cursor-pointer transition hover:bg-surface-muted ${
                  selectedItem?.subjectId === item.subjectId ? "bg-surface-muted" : ""
                }`}
                onClick={() => setSelectedSubjectId(item.subjectId)}
              >
                <td className="px-5 py-3 text-2xl font-black text-foreground">{item.characters}</td>
                <td className="px-5 py-3 text-slate-700">{item.meanings.join(", ")}</td>
                <td className="px-5 py-3 text-slate-700">{(item.readings ?? []).join(", ") || "-"}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusClass(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-5 py-3 font-semibold text-slate-700">{item.srsStage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedItem ? (
        <section className="border-t border-line bg-white/80 p-5">
          <h3 className="text-2xl font-black text-foreground">{selectedItem.characters}</h3>
          <p className="text-sm font-semibold text-slate-600">WaniKani Level {selectedItem.wkLevel}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
              <p className="text-xs font-bold uppercase text-slate-600">SRS state</p>
              <p className="mt-1 font-semibold text-slate-800">{selectedItem.status}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
              <p className="text-xs font-bold uppercase text-slate-600">Started</p>
              <p className="mt-1 font-semibold text-slate-800">{formatDate(selectedItem.startedAt)}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
              <p className="text-xs font-bold uppercase text-slate-600">Next review</p>
              <p className="mt-1 font-semibold text-slate-800">{formatDate(selectedItem.availableAt)}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
              <p className="text-xs font-bold uppercase text-slate-600">Passed</p>
              <p className="mt-1 font-semibold text-slate-800">{formatDate(selectedItem.passedAt)}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface-muted p-3 text-sm sm:col-span-2">
              <p className="text-xs font-bold uppercase text-slate-600">Primary reading</p>
              <p className="mt-1 font-semibold text-slate-800">
                {(selectedItem.primaryReadings ?? []).join(", ") || "-"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <article className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
              <p className="text-xs font-bold uppercase text-slate-600">Meaning explanation</p>
              <p className="mt-2 text-slate-800">{stripHtml(selectedItem.meaningExplanation) || "-"}</p>
            </article>
            <article className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
              <p className="text-xs font-bold uppercase text-slate-600">Reading explanation</p>
              <p className="mt-2 text-slate-800">{stripHtml(selectedItem.readingExplanation) || "-"}</p>
            </article>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <article className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
              <p className="text-xs font-bold uppercase text-slate-600">Radicals</p>
              <p className="mt-2 text-slate-800">
                {(selectedItem.radicals ?? []).map((item) => item.label).join(", ") || "-"}
              </p>
            </article>
            <article className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
              <p className="text-xs font-bold uppercase text-slate-600">Visually similar</p>
              <p className="mt-2 text-slate-800">
                {(selectedItem.visuallySimilar ?? []).map((item) => item.label).join(", ") || "-"}
              </p>
            </article>
            <article className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
              <p className="text-xs font-bold uppercase text-slate-600">Used in vocabulary</p>
              <p className="mt-2 text-slate-800">
                {(selectedItem.usedInVocabulary ?? []).map((item) => item.label).join(", ") || "-"}
              </p>
            </article>
          </div>
        </section>
      ) : null}
    </section>
  );
}
