"use client";

import { useState } from "react";

import { STUDY_LIST_LIMITS } from "@/lib/studyListRules";

import { countNewCharacters, mergeListCharacters } from "./mergeListCharacters";
import { STUDY_LIST_COPY } from "./studyListCopy";
import { SUBJECT_SELECTION_COPY, encodeSelection } from "./subjectSelection";

/**
 * Keeping a chosen set: in a list that exists, or in one that does not yet.
 *
 * Saving only ever made a new list, so a member building "kanji I keep losing"
 * across three sittings ended up with three lists called almost the same
 * thing. Adding to one that exists is the commoner act of the two - a list is
 * built up over time, not chosen in one go - so the lists come first and
 * naming a new one sits under them.
 *
 * Adding is a union, computed in `mergeListCharacters`: sending only the newly
 * chosen characters would replace a list rather than extend it.
 *
 * Takes the chosen characters rather than a selection object, because there
 * are two ways to choose on this site - the shared `useSubjectSelection` and
 * the bulk mode the study and level explorers run - and saving is the same act
 * either way.
 */

const BUTTON =
  "inline-flex h-8 items-center rounded-full px-4 text-[11px] font-bold uppercase tracking-[0.08em] transition";

type StudyList = { id: string; name: string; characters: string };

export default function SaveSelectionToList({
  chosen,
  accountId,
  onSaved,
}: {
  /** The characters to save, in the order they were chosen. */
  chosen: Iterable<string>;
  accountId: string;
  onSaved?: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<StudyList[] | null>(null);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const characters = [...chosen];

  /* Fetched when the menu opens, so browsing never pays for a list of lists. */
  async function openMenu() {
    setOpen(true);
    setError(null);
    if (lists !== null) return;

    try {
      const response = await fetch(`/api/study/${accountId}/lists`);
      const body = (await response.json()) as { lists?: StudyList[]; error?: string };
      if (!response.ok) {
        setError(body.error ?? STUDY_LIST_COPY.saveFailed);
        return;
      }
      setLists(body.lists ?? []);
    } catch {
      setError(STUDY_LIST_COPY.saveFailed);
    }
  }

  async function addToExisting(list: StudyList) {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/study/${accountId}/lists`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: list.id, characters: mergeListCharacters(list.characters, characters) }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? STUDY_LIST_COPY.saveFailed);
        return;
      }

      setSaved(list.name);
      setOpen(false);
      onSaved?.(list.name);
    } catch {
      setError(STUDY_LIST_COPY.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  async function createNew() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/study/${accountId}/lists`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed, characters: encodeSelection(characters) }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? STUDY_LIST_COPY.saveFailed);
        return;
      }

      setSaved(trimmed);
      setNaming(false);
      setOpen(false);
      setName("");
      onSaved?.(trimmed);
    } catch {
      setError(STUDY_LIST_COPY.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  if (saved && !open) {
    return (
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700">
        {SUBJECT_SELECTION_COPY.addedTo} {saved}
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => void openMenu()}
        className={`${BUTTON} border border-line bg-surface text-foreground/70 hover:bg-surface-muted`}
      >
        {SUBJECT_SELECTION_COPY.saveTo}
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {lists === null ? (
        <span className="text-[11px] font-semibold text-foreground/60">{STUDY_LIST_COPY.saving}</span>
      ) : (
        lists.map((list) => {
          const adding = countNewCharacters(list.characters, characters);
          return (
            <button
              key={list.id}
              type="button"
              disabled={busy || adding === 0}
              onClick={() => void addToExisting(list)}
              /* Nothing to add is said rather than hidden: the list is there. */
              title={adding === 0 ? STUDY_LIST_COPY.alreadyThere : undefined}
              className={`${BUTTON} border border-line bg-surface text-foreground/75 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {list.name}
              <span className="ml-1 font-black text-accent">{adding > 0 ? `+${adding}` : "✓"}</span>
            </button>
          );
        })
      )}

      {naming ? (
        <>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void createNew();
              if (event.key === "Escape") setNaming(false);
            }}
            maxLength={STUDY_LIST_LIMITS.nameLength}
            placeholder={STUDY_LIST_COPY.namePlaceholder}
            aria-label={STUDY_LIST_COPY.nameLabel}
            className="h-8 w-44 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-foreground"
          />
          <button
            type="button"
            onClick={() => void createNew()}
            disabled={busy || name.trim().length === 0}
            className={`${BUTTON} bg-accent text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {busy ? STUDY_LIST_COPY.saving : STUDY_LIST_COPY.confirmSave}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setNaming(true)}
          className={`${BUTTON} bg-accent text-white hover:brightness-110`}
        >
          {SUBJECT_SELECTION_COPY.newList}
        </button>
      )}

      {error ? <span className="text-[11px] font-semibold text-rose-600">{error}</span> : null}
    </span>
  );
}
