"use client";

import { useState } from "react";

import PillTextToggle from "@/app/shared/PillTextToggle";
import SubjectPill from "@/app/shared/SubjectPill";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { mergeListItems } from "@/app/shared/mergeListItems";
import { STUDY_LIST_LIMITS, itemsFromText, listItemId } from "@/lib/studyListRules";

import { itemToneClass } from "./listItemDisplay";
import type { StudyListItemEditorProps as Props } from "./StudyList.types";

/**
 * Changing what is in a saved list.
 *
 * A list was fixed the moment it was saved. Dropping one item meant going
 * back to an explorer, finding the other forty, choosing them again and saving
 * over the name - so in practice nobody edited a list, they made a new one.
 *
 * Removal is direct: the items are already the biggest thing on the card, so
 * they become the control rather than gaining one. Adding is a field, since
 * the alternative is a picker and a member who wants 水 can type 水 faster than
 * they can find it. Typed text goes through `itemsFromText`: a run of kanji is
 * read one by one, anything with kana in it is a word.
 *
 * The draft is held here and sent once. Removing four items one request at a
 * time would be four chances to half-apply an edit.
 */
export default function StudyListItemEditor({ items, saving, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState(items);
  const [addition, setAddition] = useState("");

  const full = draft.length >= STUDY_LIST_LIMITS.items;

  const add = () => {
    if (!addition.trim()) return;
    setDraft(mergeListItems(draft, itemsFromText(addition)));
    setAddition("");
  };

  return (
    <div className="mt-3 rounded-xl border border-line bg-surface-muted p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-foreground/60">{STUDY_LIST_COPY.editHint}</p>
        <PillTextToggle />
      </div>

      <ul className="mt-2 flex flex-wrap gap-1.5">
        {draft.map((item) => {
          const id = listItemId(item);
          return (
            <li key={id}>
              <SubjectPill
                glyph={item.key}
                subjectType={item.kind}
                reading={item.reading ?? null}
                meaning={item.meaning ?? null}
                tone={itemToneClass(item.kind)}
                label={`${STUDY_LIST_COPY.removeCharacterLabel} ${item.key}`}
                onClick={() => setDraft(draft.filter((held) => listItemId(held) !== id))}
              />
            </li>
          );
        })}
      </ul>

      {draft.length === 0 ? (
        /* Empty is allowed now, so this says what happens rather than refusing. */
        <p className="mt-2 text-[11px] font-semibold text-foreground/60">{STUDY_LIST_COPY.editEmpty}</p>
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
          disabled={saving}
          className="inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full bg-accent px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? STUDY_LIST_COPY.saving : STUDY_LIST_COPY.confirmSave}
        </button>
      </div>
    </div>
  );
}
