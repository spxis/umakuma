"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import ModalShell from "@/app/shared/ModalShell";
import { MODAL_LAYERS } from "@/app/shared/modalLayers";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { mergeSummary } from "@/lib/listMerge";
import { STUDY_LIST_LIMITS, type StudyListSummary } from "@/lib/studyListRules";

/**
 * Two or more of your lists made into one.
 *
 * Picked in order and numbered as they are picked, because the order is the
 * answer: merging Week 1 and Week 2 should read as Week 1 then Week 2. The
 * panel says how big the result will be and how much the lists shared before
 * anything is written, and clearing the sources away is a choice rather than
 * the default - a merge that quietly ate four lists would be a bad surprise.
 */
const PILL =
  "inline-flex h-8 items-center whitespace-nowrap rounded-full px-3 text-[11px] font-black uppercase tracking-[0.08em] transition";

export default function MergeListsButton({ accountId, lists }: { accountId: string; lists: StudyListSummary[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [removeSources, setRemoveSources] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(() => new Map(lists.map((list) => [list.id, list])), [lists]);
  const summary = useMemo(
    () => mergeSummary(picked.flatMap((id) => (byId.has(id) ? [byId.get(id)!.items] : []))),
    [byId, picked],
  );

  function toggle(id: string) {
    setPicked((current) => (current.includes(id) ? current.filter((held) => held !== id) : [...current, id]));
  }

  async function merge() {
    const trimmed = name.trim();
    if (busy || picked.length < 2 || !trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/study/${accountId}/lists/merge`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listIds: picked, name: trimmed, removeSources }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error ?? STUDY_LIST_COPY.mergeFailed);
        return;
      }
      setOpen(false);
      setPicked([]);
      setName("");
      setRemoveSources(false);
      router.refresh();
    } catch {
      setError(STUDY_LIST_COPY.mergeFailed);
    } finally {
      setBusy(false);
    }
  }

  if (lists.length < 2) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center rounded-full border border-line bg-surface px-4 text-xs font-black uppercase tracking-[0.1em] text-foreground/75 transition hover:bg-surface-muted"
      >
        {STUDY_LIST_COPY.merge}
      </button>
    );
  }

  return (
    <ModalShell
      onClose={() => setOpen(false)}
      layer={MODAL_LAYERS.lists}
      label={STUDY_LIST_COPY.merge}
      closeOnBackdrop
      height="list"
      panelClassName="flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_20px_65px_rgba(0,0,0,0.42)]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line bg-surface-muted px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground/80">{STUDY_LIST_COPY.merge}</h2>
          <p className="text-xs font-semibold text-foreground/60">{STUDY_LIST_COPY.mergeHint}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={STUDY_LIST_COPY.renameCancel}
          className="h-8 shrink-0 rounded-full border border-line bg-surface px-3 text-xs font-bold text-foreground hover:bg-surface-muted"
        >
          X
        </button>
      </header>

      <ul className="min-h-0 flex-1 divide-y divide-line/60 overflow-y-auto">
        {lists.map((list) => {
          const order = picked.indexOf(list.id);
          const on = order >= 0;
          return (
            <li key={list.id}>
              <button
                type="button"
                onClick={() => toggle(list.id)}
                aria-pressed={on}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${on ? "bg-accent/5" : "hover:bg-surface-muted/50"}`}
              >
                <span
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-black ${
                    on ? "border-accent bg-accent text-white" : "border-line text-foreground/60"
                  }`}
                >
                  {on ? order + 1 : ""}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{list.name}</span>
                <span className="shrink-0 text-[11px] font-semibold text-foreground/60">
                  {list.items.length} {list.items.length === 1 ? STUDY_LIST_COPY.countSuffixOne : STUDY_LIST_COPY.countSuffix}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <footer className="space-y-2 border-t border-line bg-surface-muted/60 px-4 py-3">
        <p className="text-[11px] font-semibold text-foreground/60">
          {picked.length < 2 ? STUDY_LIST_COPY.mergePickTwo : STUDY_LIST_COPY.mergeResult(summary.total, summary.shared)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={STUDY_LIST_LIMITS.nameLength}
            placeholder={STUDY_LIST_COPY.namePlaceholder}
            aria-label={STUDY_LIST_COPY.nameLabel}
            className="h-9 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-foreground"
          />
          <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/60">
            <input type="checkbox" checked={removeSources} onChange={(event) => setRemoveSources(event.target.checked)} />
            {STUDY_LIST_COPY.mergeRemoveSources}
          </label>
          <button
            type="button"
            onClick={() => void merge()}
            disabled={busy || picked.length < 2 || !name.trim()}
            className={`${PILL} bg-accent text-white hover:brightness-110 disabled:opacity-50`}
          >
            {busy ? STUDY_LIST_COPY.saving : STUDY_LIST_COPY.merge}
          </button>
        </div>
        {error ? <p className="text-[11px] font-semibold text-rose-600">{error}</p> : null}
      </footer>
    </ModalShell>
  );
}
