"use client";

import { useCallback, useEffect, useState } from "react";

import { japaneseTextProps } from "@/app/shared/japaneseText";
import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";

import { ADMIN_LADDER_OPS_COPY as copy } from "./AdminLadder.constants";

type Op = {
  id: string;
  op: string;
  key: string;
  fromLevel: number | null;
  toLevel: number | null;
  reason: string | null;
  by: string;
  createdAt: string;
};

const FIELD = "h-9 rounded-lg border border-line bg-surface px-3 text-sm";
const BUTTON = "inline-flex h-9 items-center rounded-full px-4 text-[12px] font-black transition disabled:opacity-40";

/**
 * Moving a kanji, and the queue of moves not yet in the committed ladder.
 *
 * The gap between those two things is the point of the panel. An edit reaches
 * members the moment it is made — the row's level changes in the same
 * transaction that logs the op — but the build reads a committed file, so
 * until somebody exports and commits, a rebuild would undo it. The count and
 * the command are on screen because that is the only thing standing between a
 * change being live and a change being permanent.
 */
export default function AdminLadderOps() {
  const [ops, setOps] = useState<Op[] | null>(null);
  const [key, setKey] = useState("");
  const [level, setLevel] = useState("");
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/ladder/ops");
    if (!response.ok) return;
    const payload = (await response.json()) as { ops: Op[] };
    setOps(payload.ops);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function move() {
    const character = key.trim();
    const target = Number(level);
    if (!character || !Number.isInteger(target)) return;
    setBusy(true);
    setProblem(null);
    try {
      const response = await fetch("/api/admin/ladder/ops", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "move",
          key: character.startsWith("kanji:") ? character : `kanji:${character}`,
          toLevel: target,
          reason: reason.trim() || null,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      /* The refusal is the reason, verbatim: "the level it is leaving would
         have no kanji left" is more use than "could not save". */
      if (!response.ok) throw new Error(payload.error ?? copy.failed);
      setKey("");
      setLevel("");
      setReason("");
      await load();
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : copy.failed);
    } finally {
      setBusy(false);
    }
  }

  async function withdraw(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/admin/ladder/ops/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h3 className="text-sm font-black text-foreground">{copy.heading}</h3>
      <p className="mt-0.5 max-w-3xl text-[12px] font-semibold leading-relaxed text-foreground/70">{copy.blurb}</p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">{copy.kanji}</span>
          <input
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder={copy.kanjiHint}
            {...japaneseTextProps(`${FIELD} w-24`)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">{copy.toLevel}</span>
          <input
            type="number"
            min={1}
            max={KANJI_LADDER_LEVELS}
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            className={`${FIELD} w-24 tabular-nums`}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">{copy.reason}</span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={copy.reasonHint}
            className={`${FIELD} w-full min-w-48`}
          />
        </label>
        <button
          type="button"
          disabled={busy || !key.trim() || !level}
          onClick={move}
          className={`${BUTTON} bg-accent text-white hover:brightness-110`}
        >
          {copy.moveIt}
        </button>
      </div>

      {problem ? <p className="mt-2 text-[12px] font-black text-rose-600">{copy.refused(problem)}</p> : null}

      {ops === null ? null : ops.length === 0 ? (
        <p className="mt-3 text-[12px] font-semibold text-foreground/60">{copy.none}</p>
      ) : (
        <div className="mt-3">
          <p className="text-[12px] font-black text-amber-700">{copy.pending(ops.length)}</p>
          <p className="mt-0.5 font-mono text-[11px] text-foreground/70">{copy.command}</p>
          <ol className="mt-2 space-y-1">
            {ops.map((entry) => (
              <li key={entry.id} className="flex items-center gap-2 rounded-lg bg-surface-muted px-2 py-1.5">
                <span {...japaneseTextProps("text-sm font-black text-foreground")}>{entry.key.replace("kanji:", "")}</span>
                <span className="text-[11px] font-bold tabular-nums text-foreground/70">
                  {copy.movedFromTo(entry.fromLevel, entry.toLevel)}
                </span>
                {entry.reason ? (
                  <span className="truncate text-[11px] font-semibold text-foreground/60">{entry.reason}</span>
                ) : null}
                <span className="ml-auto text-[10px] font-semibold text-foreground/60">{entry.by}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => withdraw(entry.id)}
                  className="text-[11px] font-black text-rose-600 hover:underline disabled:opacity-40"
                >
                  {copy.withdraw}
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
