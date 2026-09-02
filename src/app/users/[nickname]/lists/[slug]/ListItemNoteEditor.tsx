"use client";

import { useState } from "react";

import ModalShell from "@/app/shared/ModalShell";
import { MODAL_LAYERS } from "@/app/shared/modalLayers";
import { STUDY_TAG_LIST_COPY } from "@/app/shared/studyTagListsUi";
import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import { STUDY_LIST_LIMITS } from "@/lib/studyListRules";

/**
 * A note on one item, written where the item is read.
 *
 * One item at a time rather than a form over the whole list: a note is written
 * while looking at the thing it is about, and a list-wide save would race with
 * any other change the member has open. The glyph is in the panel because the
 * note is about that character and a modal with only a text box would leave
 * the member checking which one they had clicked.
 */
export default function ListItemNoteEditor({
  glyph,
  note,
  saving,
  error,
  onSave,
  onClose,
}: {
  glyph: string;
  note: string | null;
  saving: boolean;
  error: string | null;
  onSave: (note: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(note ?? "");

  return (
    <ModalShell
      onClose={onClose}
      layer={MODAL_LAYERS.lists}
      label={STUDY_TAG_LIST_COPY.noteTitle}
      panelClassName="w-full max-w-md rounded-3xl border border-line bg-surface p-4 shadow-[0_20px_65px_rgba(0,0,0,0.42)]"
    >
      <div className="flex items-start gap-3">
        <span className={`text-4xl font-black leading-none text-foreground ${JP_TEXT_CLASS}`} lang="ja">
          {glyph}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground/80">
            {STUDY_TAG_LIST_COPY.noteTitle}
          </h2>
          <p className="mt-0.5 text-xs font-semibold text-foreground/60">{STUDY_TAG_LIST_COPY.noteHint}</p>
        </div>
      </div>

      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={STUDY_LIST_LIMITS.noteLength}
        rows={3}
        autoFocus
        placeholder={STUDY_TAG_LIST_COPY.notePlaceholder}
        aria-label={STUDY_TAG_LIST_COPY.noteTitle}
        className="mt-3 w-full rounded-2xl border border-line bg-surface p-3 text-sm font-semibold text-foreground"
      />

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {error ? <span className="mr-auto text-[11px] font-semibold text-rose-600">{error}</span> : null}
        {/* Clearing is emptying the box and saving, so it is the same request. */}
        {note ? (
          <button
            type="button"
            onClick={() => onSave("")}
            disabled={saving}
            className="h-9 rounded-full border border-line bg-surface px-4 text-[11px] font-black uppercase tracking-[0.08em] text-foreground/70 transition hover:bg-surface-muted disabled:opacity-50"
          >
            {STUDY_TAG_LIST_COPY.noteClear}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onSave(draft)}
          disabled={saving}
          className="h-9 rounded-full bg-accent px-4 text-[11px] font-black uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {saving ? STUDY_TAG_LIST_COPY.noteSaving : STUDY_TAG_LIST_COPY.noteSave}
        </button>
      </div>
    </ModalShell>
  );
}
