"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import ModalShell from "@/app/shared/ModalShell";
import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import { MODAL_LAYERS } from "@/app/shared/modalLayers";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { LIST_ITEM_KIND_DISPLAY, LIST_ITEM_KIND_VALUES, type ListItemKind } from "@/lib/domainConstants";
import { STUDY_LIST_LIMITS, listItemId, type StudyListItemRef } from "@/lib/studyListRules";

import { itemToneClass } from "./listItemDisplay";

/**
 * A list out of pasted text, massaged before it is saved.
 *
 * Three steps in one panel, because they are one act: paste, look at what
 * came out, save what is left. The middle step is the point - a paste of a
 * chapter finds more than anybody wants, so every item is a button that
 * takes itself out, the kinds can be dropped wholesale, and nothing is
 * written until the name is given.
 *
 * The text goes to the server and comes back as items. It is never stored
 * and never rendered as anything but the words in the box.
 */
const PILL =
  "inline-flex h-8 items-center whitespace-nowrap rounded-full px-3 text-[11px] font-black uppercase tracking-[0.08em] transition";

export default function ImportFromTextButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [items, setItems] = useState<StudyListItemRef[] | null>(null);
  const [stats, setStats] = useState<{ truncated: boolean; kanji: number; words: number } | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setText("");
    setItems(null);
    setStats(null);
    setName("");
    setError(null);
  }

  async function read() {
    if (busy || text.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/study/${accountId}/lists/extract`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = (await response.json().catch(() => null)) as
        | { items?: StudyListItemRef[]; stats?: { truncated: boolean; kanji: number; words: number }; error?: string }
        | null;
      if (!response.ok) {
        setError(body?.error ?? STUDY_LIST_COPY.importFailed);
        return;
      }
      setItems(body?.items ?? []);
      setStats(body?.stats ?? null);
    } catch {
      setError(STUDY_LIST_COPY.importFailed);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const trimmed = name.trim();
    if (busy || !trimmed || !items || items.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/study/${accountId}/lists`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed, items: items.slice(0, STUDY_LIST_LIMITS.items) }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error ?? STUDY_LIST_COPY.saveFailed);
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
    } catch {
      setError(STUDY_LIST_COPY.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  const counts = (items ?? []).reduce<Partial<Record<ListItemKind, number>>>((totals, item) => {
    totals[item.kind] = (totals[item.kind] ?? 0) + 1;
    return totals;
  }, {});

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center rounded-full border border-line bg-surface px-4 text-xs font-black uppercase tracking-[0.1em] text-foreground/75 transition hover:bg-surface-muted"
      >
        {STUDY_LIST_COPY.importFromText}
      </button>
    );
  }

  return (
    <ModalShell
      onClose={() => setOpen(false)}
      layer={MODAL_LAYERS.lists}
      label={STUDY_LIST_COPY.importFromText}
      closeOnBackdrop
      height="list"
      panelClassName="flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_20px_65px_rgba(0,0,0,0.42)]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line bg-surface-muted px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground/80">{STUDY_LIST_COPY.importFromText}</h2>
          <p className="text-xs font-semibold text-foreground/60">{STUDY_LIST_COPY.importHint}</p>
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

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={items ? 3 : 8}
          placeholder={STUDY_LIST_COPY.importPlaceholder}
          aria-label={STUDY_LIST_COPY.importPlaceholder}
          lang="ja"
          className={`w-full rounded-2xl border border-line bg-surface p-3 text-sm font-semibold text-foreground ${JP_TEXT_CLASS}`}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void read()}
            disabled={busy || text.trim().length === 0}
            className={`${PILL} bg-accent text-white hover:brightness-110 disabled:opacity-50`}
          >
            {busy && !items ? STUDY_LIST_COPY.importReading : STUDY_LIST_COPY.importRead}
          </button>
          {items ? (
            <span className="text-[11px] font-semibold text-foreground/60">
              {STUDY_LIST_COPY.importFound(counts.kanji ?? 0, counts.vocabulary ?? 0)}
              {stats?.truncated ? ` ${STUDY_LIST_COPY.importTruncated}` : ""}
            </span>
          ) : null}
        </div>

        {items ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
                {STUDY_LIST_COPY.importKeepHint}
              </span>
              {LIST_ITEM_KIND_VALUES.filter((kind) => (counts[kind] ?? 0) > 0).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setItems((current) => (current ?? []).filter((item) => item.kind !== kind))}
                  className="inline-flex h-7 items-center rounded-full border border-line bg-surface px-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-foreground/60 transition hover:border-rose-300 hover:text-rose-600"
                >
                  {STUDY_LIST_COPY.importDropKind(LIST_ITEM_KIND_DISPLAY[kind].plural)}
                </button>
              ))}
            </div>

            <ul className="flex flex-wrap gap-1.5">
              {items.map((item) => {
                const id = listItemId(item);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setItems((current) => (current ?? []).filter((held) => listItemId(held) !== id))}
                      aria-label={`${STUDY_LIST_COPY.removeCharacterLabel} ${item.key}`}
                      title={`${STUDY_LIST_COPY.removeCharacterLabel} ${item.key}`}
                      lang="ja"
                      translate="no"
                      className={`inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-2 text-lg font-black leading-none transition hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600 ${itemToneClass(item.kind)} ${JP_TEXT_CLASS}`}
                    >
                      {item.key}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-muted/60 px-4 py-3">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={STUDY_LIST_LIMITS.nameLength}
          placeholder={STUDY_LIST_COPY.namePlaceholder}
          aria-label={STUDY_LIST_COPY.nameLabel}
          className="h-9 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-foreground"
        />
        <span className="text-[11px] font-semibold text-foreground/60">
          {(items ?? []).length} {(items ?? []).length === 1 ? STUDY_LIST_COPY.countSuffixOne : STUDY_LIST_COPY.countSuffix}
        </span>
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || !name.trim() || (items ?? []).length === 0}
          className={`${PILL} bg-accent text-white hover:brightness-110 disabled:opacity-50`}
        >
          {busy && items ? STUDY_LIST_COPY.saving : STUDY_LIST_COPY.importSave}
        </button>
        {error ? <span className="text-[11px] font-semibold text-rose-600">{error}</span> : null}
      </footer>
    </ModalShell>
  );
}
