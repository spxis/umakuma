"use client";

import Link from "next/link";
import { useState } from "react";

import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { STUDY_LIST_LIMITS } from "@/lib/studyListRules";
import { openStudyTagLists } from "@/lib/studyTagLists";
import { formatRelativeFromNow } from "@/lib/timeFormat";

import type { StudyListCardProps } from "./StudyList.types";

/**
 * One list, in either density, with its own actions.
 *
 * Split out of the page when renaming arrived: a card grew an editor, a draft,
 * a request in flight and an error of its own, and holding all of that per card
 * in the list container would have meant maps keyed by id for each. A card owns
 * its own editing and tells the page only the one thing the page needs back.
 */

/*
 * `whitespace-nowrap` on every action, and a wrapping row to put them in.
 *
 * A saved list now offers three - rename, delete, practise - and at the 260px
 * the browsing grid gives a card they do not fit on one line. Left to itself
 * the flex row breaks the widest label inside its own pill, so "Practise
 * these" became two lines of text in a button built for one. Better that the
 * row wraps than that a control does.
 */
const ACTION =
  "whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/45 transition";

const PILL =
  "inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full bg-accent px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110";

export default function StudyListCard({
  card,
  rows,
  accountId,
  practiceHref,
  canEdit,
  onDelete,
  onRenamed,
}: StudyListCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setDraft(card.name);
    setError(null);
    setEditing(true);
  }

  /*
   * Not optimistic, unlike deleting. A name that is already taken is a real
   * and ordinary outcome - "Week 1" exists - so the editor stays open holding
   * what was typed, and says why, rather than flashing the new name onto the
   * card and taking it back.
   */
  async function save() {
    const next = draft.trim();
    if (!next || saving) return;
    if (next === card.name) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/study/${accountId}/lists`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: card.id, name: next }),
      });
      const body = (await response.json().catch(() => null)) as
        | { list?: { name: string }; error?: string }
        | null;

      if (!response.ok) {
        setError(body?.error ?? STUDY_LIST_COPY.renameFailed);
        return;
      }

      // The server's name, not the draft: it collapses whitespace and caps length.
      onRenamed(body?.list?.name ?? next);
      setEditing(false);
    } catch {
      setError(STUDY_LIST_COPY.renameFailed);
    } finally {
      setSaving(false);
    }
  }

  const nameNode = editing ? (
    <input
      autoFocus
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") void save();
        if (event.key === "Escape") setEditing(false);
      }}
      maxLength={STUDY_LIST_LIMITS.nameLength}
      aria-label={STUDY_LIST_COPY.nameLabel}
      /*
       * Wider than the name it replaces, and the same width the save-a-list
       * field uses. A rename is typing, not reading: 128px showed the end of a
       * name and nothing else. The row wraps if that no longer fits.
       */
      className={`h-7 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-foreground ${
        rows ? "w-44 shrink-0" : "min-w-0 flex-1"
      }`}
    />
  ) : (
    <h2
      className={`truncate text-sm font-black text-foreground ${rows ? "w-32 shrink-0" : "min-w-0"}`}
      title={card.name}
    >
      {card.name}
    </h2>
  );

  const actions = editing ? (
    <>
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || draft.trim().length === 0}
        className={`${PILL} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {saving ? STUDY_LIST_COPY.saving : STUDY_LIST_COPY.confirmSave}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className={`${ACTION} hover:text-foreground`}
      >
        {STUDY_LIST_COPY.renameCancel}
      </button>
    </>
  ) : (
    <>
      {card.tag ? (
        <button
          type="button"
          onClick={() => openStudyTagLists({ accountId, tag: card.tag ?? undefined })}
          className={`${ACTION} hover:text-foreground`}
        >
          {STUDY_LIST_COPY.open}
        </button>
      ) : canEdit ? (
        <>
          <button type="button" onClick={startEditing} className={`${ACTION} hover:text-foreground`}>
            {STUDY_LIST_COPY.rename}
          </button>
          <button type="button" onClick={onDelete} className={`${ACTION} hover:text-rose-600`}>
            {STUDY_LIST_COPY.remove}
          </button>
        </>
      ) : null}
      <Link href={practiceHref} className={PILL}>
        {STUDY_LIST_COPY.practise}
      </Link>
    </>
  );

  const errorNode = error ? (
    <p className="mt-1 text-[11px] font-semibold text-rose-600">{error}</p>
  ) : null;

  return (
    <li
      className={`min-w-0 rounded-2xl border border-line bg-surface ${rows ? "px-4 py-2.5" : "p-4"}`}
    >
      {rows ? (
        /*
         * One line each, for scanning a shelf of weeks. The characters still
         * get the room, because they are what tells the lists apart - a column
         * of names does not.
         */
        <>
          {/*
            * Wrapping, because a phone cannot hold all of it on one line. A
            * saved row is a name, its characters, a count and three controls;
            * at 393px that ran the practise pill off the right edge with the
            * characters squeezed to nothing. The controls drop to a second
            * line instead, and `ml-auto` keeps them right-aligned there.
            */}
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            {nameNode}
            <p
              lang="ja"
              translate="no"
              className={`min-w-0 flex-1 truncate text-xl font-black leading-none text-kanji ${JP_TEXT_CLASS}`}
            >
              {card.characters.join("")}
            </p>
            <span className="shrink-0 text-[11px] font-semibold text-foreground/50">
              {card.count}
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-3">{actions}</span>
          </div>
          {errorNode}
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            {nameNode}
            <span className="shrink-0 text-[11px] font-semibold text-foreground/50">
              {card.count}{" "}
              {card.count === 1 ? STUDY_LIST_COPY.countSuffixOne : STUDY_LIST_COPY.countSuffix}
            </span>
          </div>

          <p
            lang="ja"
            translate="no"
            className={`mt-2 line-clamp-3 break-all text-2xl font-black leading-snug text-kanji ${JP_TEXT_CLASS}`}
          >
            {card.characters.join("")}
          </p>

          <p className="mt-3 text-[11px] text-foreground/45">
            {card.updatedAt
              ? `${STUDY_LIST_COPY.updatedPrefix} ${formatRelativeFromNow(card.updatedAt)}`
              : STUDY_LIST_COPY.builtIn}
          </p>

          {/*
            * Actions on their own line. Sharing one with the timestamp
            * squeezed "Practise these" until it wrapped inside its pill.
            */}
          <div className="mt-2 flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
            {actions}
          </div>
          {errorNode}
        </>
      )}
    </li>
  );
}
