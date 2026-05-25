"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";

import {
  READING_BOOK_OPTIONS,
  getTodayDateInputValue,
  toMonthKey,
  type ReadingSignoffRecord,
} from "@/lib/readingSignoff";

type Member = {
  id: string;
  nickname: string;
  wkUsername: string;
};

type ReadingSignoffResponse = {
  members: Member[];
  signoffs: ReadingSignoffRecord[];
};

type UserReadingSignoffPanelProps = {
  accountId: string;
};

type FormState = {
  signoffDatePst: string;
  bookTitle: (typeof READING_BOOK_OPTIONS)[number];
  pagesRead: number;
  minutesRead: number;
  didWanikaniReviews: boolean;
};

function formatMonthLabel(monthKey: string): string {
  const parsed = new Date(`${monthKey}-01T12:00:00.000Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function shiftMonth(monthKey: string, offset: number): string {
  const parsed = new Date(`${monthKey}-01T12:00:00.000Z`);
  parsed.setUTCMonth(parsed.getUTCMonth() + offset);
  return toMonthKey(parsed);
}

function buildCalendarCells(monthKey: string): Array<number | null> {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return [];
  }

  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const startWeekday = firstDay.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<number | null> = [];

  for (let index = 0; index < startWeekday; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function dayKey(monthKey: string, day: number): string {
  return `${monthKey}-${String(day).padStart(2, "0")}`;
}

function initials(label: string): string {
  return label
    .split(/\s+/)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("")
    .slice(0, 2);
}

export default function UserReadingSignoffPanel({ accountId }: UserReadingSignoffPanelProps) {
  const today = getTodayDateInputValue();
  const [monthKey, setMonthKey] = useState(() => toMonthKey(new Date()));
  const [selectedDatePst, setSelectedDatePst] = useState(today);
  const [form, setForm] = useState<FormState>({
    signoffDatePst: today,
    bookTitle: READING_BOOK_OPTIONS[0],
    pagesRead: 10,
    minutesRead: 20,
    didWanikaniReviews: true,
  });
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState<string>("");

  const swrKey = `/api/reading-signoffs?month=${encodeURIComponent(monthKey)}`;
  const { data, mutate, isLoading } = useSWR<ReadingSignoffResponse>(
    swrKey,
    async (url: string) => {
      const response = await fetch(url, { cache: "no-store" });
      const payload = (await response.json()) as ReadingSignoffResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load reading signoffs.");
      }
      return payload;
    },
    { revalidateOnFocus: true },
  );

  const members = useMemo(() => data?.members ?? [], [data?.members]);
  const signoffs = useMemo(() => data?.signoffs ?? [], [data?.signoffs]);

  const signoffsByDay = useMemo(() => {
    const byDay = new Map<string, ReadingSignoffRecord[]>();
    for (const signoff of signoffs) {
      const dayEntries = byDay.get(signoff.signoffDatePst) ?? [];
      dayEntries.push(signoff);
      byDay.set(signoff.signoffDatePst, dayEntries);
    }
    return byDay;
  }, [signoffs]);

  const signoffByDayAndMember = useMemo(() => {
    const byDayAndMember = new Map<string, Map<string, ReadingSignoffRecord>>();
    for (const signoff of signoffs) {
      const dayMap = byDayAndMember.get(signoff.signoffDatePst) ?? new Map<string, ReadingSignoffRecord>();
      dayMap.set(signoff.accountId, signoff);
      byDayAndMember.set(signoff.signoffDatePst, dayMap);
    }
    return byDayAndMember;
  }, [signoffs]);

  const selectedDayEntries = signoffsByDay.get(selectedDatePst) ?? [];
  const calendarCells = useMemo(() => buildCalendarCells(monthKey), [monthKey]);

  async function submitSignoff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("saving");
    setSubmitMessage("");

    try {
      const response = await fetch("/api/reading-signoffs", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          accountId,
          signoffDatePst: form.signoffDatePst,
          bookTitle: form.bookTitle,
          pagesRead: form.pagesRead,
          minutesRead: form.minutesRead,
          didWanikaniReviews: form.didWanikaniReviews,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save reading signoff.");
      }

      setSelectedDatePst(form.signoffDatePst);
      setMonthKey(form.signoffDatePst.slice(0, 7));
      setSubmitState("saved");
      setSubmitMessage("Saved for tonight.");
      await mutate();
    } catch (error) {
      setSubmitState("error");
      setSubmitMessage(error instanceof Error ? error.message : "Could not save reading signoff.");
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface-muted p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-foreground">Read check-ins</h2>
          <p className="mt-1 text-sm text-foreground/75">
            Mark each night with pages, book, reading time, and WaniKani completion.
          </p>
        </div>
      </header>

      <form className="grid gap-3 rounded-xl border border-line bg-surface p-3 sm:grid-cols-2 lg:grid-cols-6" onSubmit={submitSignoff}>
        <label className="flex flex-col gap-1 lg:col-span-1">
          <span className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/65">Date</span>
          <input
            type="date"
            className="h-10 rounded-lg border border-line bg-surface-muted px-3 text-sm"
            value={form.signoffDatePst}
            onChange={(event) => {
              const next = event.target.value;
              setForm((prev) => ({ ...prev, signoffDatePst: next }));
            }}
            required
          />
        </label>

        <label className="flex flex-col gap-1 lg:col-span-2">
          <span className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/65">Book</span>
          <select
            className="h-10 rounded-lg border border-line bg-surface-muted px-3 text-sm"
            value={form.bookTitle}
            onChange={(event) => {
              setForm((prev) => ({
                ...prev,
                bookTitle: event.target.value as (typeof READING_BOOK_OPTIONS)[number],
              }));
            }}
          >
            {READING_BOOK_OPTIONS.map((book) => (
              <option key={book} value={book}>
                {book}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 lg:col-span-1">
          <span className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/65">Pages</span>
          <input
            type="number"
            min={1}
            max={2000}
            className="h-10 rounded-lg border border-line bg-surface-muted px-3 text-sm"
            value={form.pagesRead}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, pagesRead: Number(event.target.value) }));
            }}
            required
          />
        </label>

        <label className="flex flex-col gap-1 lg:col-span-1">
          <span className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/65">Minutes</span>
          <input
            type="number"
            min={1}
            max={1440}
            className="h-10 rounded-lg border border-line bg-surface-muted px-3 text-sm"
            value={form.minutesRead}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, minutesRead: Number(event.target.value) }));
            }}
            required
          />
        </label>

        <label className="flex items-center gap-2 rounded-lg border border-line bg-surface-muted px-3 lg:col-span-1">
          <input
            type="checkbox"
            checked={form.didWanikaniReviews}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, didWanikaniReviews: event.target.checked }));
            }}
          />
          <span className="text-sm font-semibold text-foreground/80">WaniKani done</span>
        </label>

        <div className="sm:col-span-2 lg:col-span-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-full border border-line bg-surface px-5 text-sm font-bold uppercase tracking-[0.08em] text-foreground transition hover:bg-surface-muted"
            disabled={submitState === "saving"}
          >
            {submitState === "saving" ? "Saving" : "Save check-in"}
          </button>
          {submitMessage ? (
            <p className={`text-sm ${submitState === "error" ? "text-red-700" : "text-foreground/75"}`}>
              {submitMessage}
            </p>
          ) : null}
        </div>
      </form>

      <section className="space-y-3 rounded-xl border border-line bg-surface p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-black text-foreground">Group calendar</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-line px-3 py-1 text-xs font-bold uppercase tracking-[0.08em]"
              onClick={() => setMonthKey((prev) => shiftMonth(prev, -1))}
            >
              Prev
            </button>
            <p className="min-w-[9rem] text-center text-sm font-bold text-foreground/80">{formatMonthLabel(monthKey)}</p>
            <button
              type="button"
              className="rounded-full border border-line px-3 py-1 text-xs font-bold uppercase tracking-[0.08em]"
              onClick={() => setMonthKey((prev) => shiftMonth(prev, 1))}
            >
              Next
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/60">
          {[
            "Sun",
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat",
          ].map((weekday) => (
            <div key={weekday}>{weekday}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((day, index) => {
            if (!day) {
              return <div key={`blank-${index}`} className="min-h-[6rem] rounded-lg border border-dashed border-line/50 bg-surface-muted/60" />;
            }

            const key = dayKey(monthKey, day);
            const byMember = signoffByDayAndMember.get(key) ?? new Map<string, ReadingSignoffRecord>();
            const isSelected = key === selectedDatePst;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDatePst(key)}
                className={`min-h-[6rem] rounded-lg border p-1 text-left transition ${
                  isSelected
                    ? "border-accent bg-accent/10"
                    : "border-line bg-surface hover:bg-surface-muted"
                }`}
              >
                <p className="text-xs font-black text-foreground">{day}</p>
                <div className="mt-1 space-y-1">
                  {members.map((member) => {
                    const entry = byMember.get(member.id);
                    const statusClass = entry
                      ? entry.didWanikaniReviews
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : "bg-amber-100 text-amber-900 border-amber-300"
                      : "bg-surface-muted text-foreground/55 border-line";
                    return (
                      <div
                        key={`${key}-${member.id}`}
                        className={`flex items-center justify-between rounded border px-1 py-0.5 text-[10px] font-semibold ${statusClass}`}
                      >
                        <span>{initials(member.nickname)}</span>
                        <span>{entry ? `${entry.pagesRead}p` : "-"}</span>
                      </div>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>

        {isLoading ? <p className="text-sm text-foreground/70">Loading calendar...</p> : null}
      </section>

      <section className="rounded-xl border border-line bg-surface p-3">
        <h3 className="text-base font-black text-foreground">Daily summary for {selectedDatePst}</h3>
        {selectedDayEntries.length === 0 ? (
          <p className="mt-2 text-sm text-foreground/70">No check-ins submitted yet.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[42rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-[0.08em] text-foreground/65">
                  <th className="px-2 py-2">Kid</th>
                  <th className="px-2 py-2">Book</th>
                  <th className="px-2 py-2">Pages</th>
                  <th className="px-2 py-2">Minutes</th>
                  <th className="px-2 py-2">WaniKani</th>
                  <th className="px-2 py-2">Reviews left</th>
                  <th className="px-2 py-2">Apprentice</th>
                  <th className="px-2 py-2">Level</th>
                </tr>
              </thead>
              <tbody>
                {selectedDayEntries.map((entry) => {
                  const member = members.find((item) => item.id === entry.accountId);
                  return (
                    <tr key={entry.id} className="border-b border-line/60 text-foreground/85">
                      <td className="px-2 py-2 font-semibold">{member?.nickname ?? entry.accountId}</td>
                      <td className="px-2 py-2">{entry.bookTitle}</td>
                      <td className="px-2 py-2">{entry.pagesRead}</td>
                      <td className="px-2 py-2">{entry.minutesRead}</td>
                      <td className="px-2 py-2">{entry.didWanikaniReviews ? "Yes" : "No"}</td>
                      <td className="px-2 py-2">{entry.reviewsLeft}</td>
                      <td className="px-2 py-2">{entry.apprenticeCount}</td>
                      <td className="px-2 py-2">{entry.currentWkLevel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
