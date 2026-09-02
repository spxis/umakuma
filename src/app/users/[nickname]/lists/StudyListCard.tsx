"use client";

import Link from "next/link";
import { useState } from "react";

import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { STUDY_LIST_LIMITS } from "@/lib/studyListRules";
import { openStudyTagLists } from "@/lib/studyTagLists";
import { formatRelativeFromNow } from "@/lib/timeFormat";

import { LIST_VISIBILITIES, LIST_VISIBILITY_DISPLAY } from "@/lib/domainConstants";
import type { StudyListItemRef } from "@/lib/studyListRules";

import { kindChips, previewText } from "./listItemDisplay";
import StudyListItemEditor from "./StudyListItemEditor";
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
  "whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/60 transition";

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
  onItemsChanged,
}: StudyListCardProps) {
  /*
   * One mode rather than two booleans. The name editor replaces the heading
   * and the character editor opens a panel below it; both open at once would
   * put two Save buttons on one card, each meaning something different.
   */
  const [mode, setMode] = useState<"none" | "name" | "characters">("none");
  const [draft, setDraft] = useState(card.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = mode === "name";
  const editingCharacters = mode === "characters";

  function startEditing() {
    setDraft(card.name);
    setError(null);
    setMode("name");
  }

  /**
   * Not optimistic either, and for a stronger reason than the rename.
   *
   * A member has just taken characters out by hand. Showing the shortened list
   * and then restoring the removed ones on failure would read as the page
   * putting back something they deliberately removed, which is worse than
   * waiting.
   */
  async function saveItems(items: StudyListItemRef[]) {
    if (saving) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/study/${accountId}/lists`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: card.id, items }),
      });
      const body = (await response.json().catch(() => null)) as
        | { list?: { items?: StudyListItemRef[] }; error?: string }
        | null;

      if (!response.ok) {
        setError(body?.error ?? STUDY_LIST_COPY.editFailed);
        return;
      }

      // The server's set, not the draft: it dedupes, caps and names subjects.
      onItemsChanged(body?.list?.items ?? items);
      setMode("none");
    } catch {
      setError(STUDY_LIST_COPY.editFailed);
    } finally {
      setSaving(false);
    }
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
      setMode("none");
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
      setMode("none");
    } catch {
      setError(STUDY_LIST_COPY.renameFailed);
    } finally {
      setSaving(false);
    }
  }

  /*
   * The characters are the biggest thing on the card and the thing a member
   * points at when they want to see what is in the list, so they are the way
   * in as well as the preview. The Open action stays: a control that is only
   * discoverable by guessing that the text is clickable is not discoverable.
   */
  const openList = card.tag
    ? () => openStudyTagLists({ accountId, tag: card.tag ?? undefined })
    : () => openStudyTagLists({ accountId, list: { id: card.id, name: card.name } });

  const nameNode = editing ? (
    <input
      autoFocus
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") void save();
        if (event.key === "Escape") setMode("none");
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
      className={`flex min-w-0 items-center gap-1.5 truncate text-sm font-black text-foreground ${rows ? "w-40 shrink-0" : ""}`}
      title={card.name}
    >
      {card.href ? (
        /* The name is the way to the list's own page; a tagged list has none. */
        <Link href={card.href} className="truncate hover:text-accent hover:underline">
          {card.name}
        </Link>
      ) : (
        <span className="truncate">{card.name}</span>
      )}
      {card.visibility && card.visibility !== LIST_VISIBILITIES.private ? (
        <span className="subject-pill shrink-0 border-accent/30 bg-accent/10 text-accent">
          {LIST_VISIBILITY_DISPLAY[card.visibility].label}
        </span>
      ) : null}
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
        onClick={() => setMode("none")}
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
          onClick={openList}
          className={`${ACTION} hover:text-foreground`}
        >
          {STUDY_LIST_COPY.open}
        </button>
      ) : canEdit ? (
        <>
          {/*
            * First, and before the three that change the list.
            *
            * A saved list offered rename, edit, delete and practise, so the one
            * thing a member could not do with a list they had built was read
            * it - the card's wall of glyphs was the whole view, with no
            * meanings, no readings and no way into the glyph viewer. The built
            * in Trouble and Favourites lists had this from the start; a list
            * with a name instead of a flag now opens the same panel.
            */}
          <button
            type="button"
            onClick={openList}
            className={`${ACTION} hover:text-foreground`}
          >
            {STUDY_LIST_COPY.open}
          </button>
          <button type="button" onClick={startEditing} className={`${ACTION} hover:text-foreground`}>
            {STUDY_LIST_COPY.rename}
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode(editingCharacters ? "none" : "characters");
            }}
            aria-expanded={mode === "characters"}
            className={`${ACTION} hover:text-foreground ${mode === "characters" ? "text-foreground" : ""}`}
          >
            {STUDY_LIST_COPY.editCharacters}
          </button>
          <button type="button" onClick={onDelete} className={`${ACTION} hover:text-rose-600`}>
            {STUDY_LIST_COPY.remove}
          </button>
        </>
      ) : null}
      {practiceHref ? (
        <Link href={practiceHref} className={PILL}>
          {STUDY_LIST_COPY.practise}
        </Link>
      ) : null}
    </>
  );

  const errorNode = error ? (
    <p className="mt-1 text-[11px] font-semibold text-rose-600">{error}</p>
  ) : null;

  /*
   * Below the card's own content in both densities, and full width in each.
   * The characters need room to be tapped, and a row has none to spare - the
   * panel is the one place the two densities agree.
   *
   * Keyed on the characters so reopening the editor after a save starts from
   * what was saved rather than a stale draft.
   */
  const preview = previewText(card.items);
  /* What kinds the list holds, so a list of words reads as one before it is opened. */
  const chips = kindChips(card.items);
  const kindNode =
    chips.length > 1 ? (
      <span className="flex flex-wrap gap-1">
        {chips.map((chip) => (
          <span key={chip.kind} className="subject-pill border-line bg-surface-muted text-foreground/70">
            {chip.label} {chip.count}
          </span>
        ))}
      </span>
    ) : null;

  const characterEditor =
    mode === "characters" ? (
      <StudyListItemEditor
        key={preview}
        items={card.items}
        saving={saving}
        onSave={(next) => void saveItems(next)}
        onCancel={() => setMode("none")}
      />
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
            {/*
              * The preview and its count step aside while the editor is open.
              * The panel below shows every character, larger and tappable, and
              * carries a count of the draft - so leaving these would put two
              * different numbers on one card with nothing saying which is the
              * one being changed.
              */}
            {editingCharacters ? (
              <span className="min-w-0 flex-1" />
            ) : (
              <>
                <button
                  type="button"
                  onClick={openList}
                  title={STUDY_LIST_COPY.open}
                  lang="ja"
                  translate="no"
                  className={`min-w-0 flex-1 cursor-pointer truncate text-left text-base font-semibold leading-none text-foreground/75 hover:text-foreground ${JP_TEXT_CLASS}`}
                >
                  {preview}
                </button>
                {kindNode}
                <span className="shrink-0 text-[11px] font-semibold text-foreground/60">
                  {card.count}
                </span>
              </>
            )}
            <span className="ml-auto flex shrink-0 items-center gap-3">{actions}</span>
          </div>
          {errorNode}
          {characterEditor}
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            {nameNode}
            {/* Stands aside while the editor is open; see the row branch. */}
            {editingCharacters ? null : (
              <span className="shrink-0 text-[11px] font-semibold text-foreground/60">
                {card.count}{" "}
                {card.count === 1 ? STUDY_LIST_COPY.countSuffixOne : STUDY_LIST_COPY.countSuffix}
              </span>
            )}
          </div>

          {editingCharacters ? null : card.items.length === 0 ? (
            /* A list can be started before it holds anything, so say so. */
            <p className="mt-2 text-xs font-semibold text-foreground/60">
              {STUDY_LIST_COPY.noCharactersYet}
            </p>
          ) : (
            <button
              type="button"
              onClick={openList}
              title={STUDY_LIST_COPY.open}
              lang="ja"
              translate="no"
              className={`mt-2 line-clamp-3 w-full cursor-pointer break-all text-left text-lg font-semibold leading-snug text-foreground/75 hover:text-foreground ${JP_TEXT_CLASS}`}
            >
              {preview}
            </button>
          )}

          {editingCharacters || !kindNode ? null : <div className="mt-2">{kindNode}</div>}

          <p className="mt-3 text-[11px] text-foreground/60">
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
          {characterEditor}
        </>
      )}
    </li>
  );
}
