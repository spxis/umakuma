"use client";

import { useState } from "react";

import { STUDY_LIST_LIMITS } from "@/lib/studyListRules";

import { STUDY_LIST_COPY } from "./studyListCopy";
import { encodeSelection } from "./subjectSelection";

/**
 * Keeping a chosen set, under a name.
 *
 * A destination for a selection like any other, which is the point of item 23:
 * the picking does not know that saving exists, and this does not know how
 * picking works. It takes a chosen set and a place to put it.
 *
 * Inline rather than a modal. Naming a list is one short field and the member
 * is looking straight at what they chose - a dialog would cover the very thing
 * they are naming.
 *
 * Takes the chosen characters rather than a selection object, because there are
 * two ways to choose on this site - the shared `useSubjectSelection`, and the
 * bulk mode the study and level explorers run - and saving a list is the same
 * act either way. Coupling this to one of them is what kept the destination off
 * the other.
 */

const BUTTON =
  "inline-flex h-8 items-center rounded-full px-4 text-[11px] font-bold uppercase tracking-[0.08em] transition";

export default function SaveSelectionAsList({
  chosen,
  accountId,
  onSaved,
}: {
  /** The characters to save, in the order they were chosen. */
  chosen: Iterable<string>;
  accountId: string;
  onSaved?: (name: string) => void;
}) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/study/${accountId}/lists`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed, characters: encodeSelection(chosen) }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? STUDY_LIST_COPY.saveFailed);
        return;
      }

      setNaming(false);
      setName("");
      onSaved?.(trimmed);
    } catch {
      setError(STUDY_LIST_COPY.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  if (!naming) {
    return (
      <button
        type="button"
        onClick={() => setNaming(true)}
        className={`${BUTTON} border border-line bg-surface text-foreground/70 hover:bg-surface-muted`}
      >
        {STUDY_LIST_COPY.save}
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") void save();
          if (event.key === "Escape") setNaming(false);
        }}
        maxLength={STUDY_LIST_LIMITS.nameLength}
        placeholder={STUDY_LIST_COPY.namePlaceholder}
        aria-label={STUDY_LIST_COPY.nameLabel}
        className="h-8 w-44 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-foreground"
      />
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || name.trim().length === 0}
        className={`${BUTTON} bg-accent text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {saving ? STUDY_LIST_COPY.saving : STUDY_LIST_COPY.confirmSave}
      </button>
      {error ? <span className="text-[11px] font-semibold text-rose-600">{error}</span> : null}
    </span>
  );
}
