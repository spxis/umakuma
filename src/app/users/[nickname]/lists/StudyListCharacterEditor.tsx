"use client";

import { useState } from "react";

import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { STUDY_LIST_LIMITS, normalizeListCharacters } from "@/lib/studyListRules";

import type { StudyListCharacterEditorProps as Props } from "./StudyList.types";

/**
 * Changing what is in a saved list.
 *
 * A list was fixed the moment it was saved. Dropping one character meant going
 * back to an explorer, finding the other forty, choosing them again and saving
 * over the name - so in practice nobody edited a list, they made a new one.
 *
 * Removal is direct: the characters are already the biggest thing on the card,
 * so they become the control rather than gaining one. Adding is a field, since
 * the alternative is a picker and a member who wants 水 can type 水 faster than
 * they can find it. Both go through `normalizeListCharacters`, which is what
 * the save path already used, so a pasted sentence and a chosen selection
 * reduce to the same set.
 *
 * The draft is held here and sent once. Removing four characters one request at
 * a time would be four chances to half-apply an edit.
 */
export default function StudyListCharacterEditor({ characters, saving, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<string[]>(characters);
  const [addition, setAddition] = useState("");

  const full = draft.length >= STUDY_LIST_LIMITS.characters;

  const add = () => {
    if (!addition.trim()) return;
    /* Merged through the same normalizer, so it dedupes against what is held. */
    setDraft(normalizeListCharacters([draft.join(""), addition]));
    setAddition("");
  };

  return (
    <div className="mt-3 rounded-xl border border-line bg-surface-muted p-3">
      <p className="text-[11px] font-semibold text-foreground/60">{STUDY_LIST_COPY.editHint}</p>

      <ul className="mt-2 flex flex-wrap gap-1.5">
        {draft.map((character) => (
          <li key={character}>
            <button
              type="button"
              onClick={() => setDraft(draft.filter((held) => held !== character))}
              aria-label={`${STUDY_LIST_COPY.removeCharacterLabel} ${character}`}
              title={`${STUDY_LIST_COPY.removeCharacterLabel} ${character}`}
              lang="ja"
              translate="no"
              className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-line bg-surface px-2 text-lg font-black leading-none text-kanji transition hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600 ${JP_TEXT_CLASS}`}
            >
              {character}
            </button>
          </li>
        ))}
      </ul>

      {draft.length === 0 ? (
        <p className="mt-2 text-[11px] font-semibold text-rose-600">{STUDY_LIST_COPY.editEmpty}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={addition}
          onChange={(event) => setAddition(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            /* Enter adds rather than saving: the field is inside a save flow. */
            event.preventDefault();
            add();
          }}
          disabled={full}
          placeholder={STUDY_LIST_COPY.addPlaceholder}
          aria-label={STUDY_LIST_COPY.addLabel}
          lang="ja"
          className="h-8 min-w-0 flex-1 rounded-full border border-line bg-surface px-3 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="button"
          onClick={add}
          disabled={full || !addition.trim()}
          className="inline-flex h-8 shrink-0 items-center rounded-full border border-line bg-surface px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/70 transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {STUDY_LIST_COPY.add}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
        <span className="mr-auto text-[11px] font-semibold text-foreground/60">
          {draft.length}{" "}
          {draft.length === 1 ? STUDY_LIST_COPY.countSuffixOne : STUDY_LIST_COPY.countSuffix}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/60 transition hover:text-foreground"
        >
          {STUDY_LIST_COPY.renameCancel}
        </button>
        <button
          type="button"
          onClick={() => onSave(draft)}
          disabled={saving || draft.length === 0}
          className="inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full bg-accent px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? STUDY_LIST_COPY.saving : STUDY_LIST_COPY.confirmSave}
        </button>
      </div>
    </div>
  );
}
