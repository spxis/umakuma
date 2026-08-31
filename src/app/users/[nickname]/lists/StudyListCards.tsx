"use client";

import Link from "next/link";
import { useState } from "react";

import ConfirmDialog from "@/app/shared/ConfirmDialog";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import SubjectViewModeToggle from "@/app/shared/SubjectViewModeToggle";
import {
  SUBJECT_VIEW_MODES,
  SUBJECT_VIEW_MODE_VALUES,
  type SubjectViewMode,
} from "@/app/shared/subjectListView";
import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";
import type { StudyListSummary } from "@/lib/studyLists";
import { formatRelativeFromNow } from "@/lib/timeFormat";
import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";

/**
 * The saved lists, each showing what is in it.
 *
 * A preview of the characters rather than a count alone, because the question a
 * parent actually has is "what is in Week 3" and a number does not answer it.
 * The characters are the list, so they are what the card shows.
 */

const LIST_VIEW_MODE_STORAGE_KEY = "wr:lists:view-mode";

export default function StudyListCards({
  lists,
  accountId,
  practicePath,
  canEdit,
}: {
  lists: StudyListSummary[];
  accountId: string;
  practicePath: string;
  canEdit: boolean;
}) {
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
  /*
   * Cards to browse what a week holds, rows to scan many lists at once - the
   * same pair every subject surface offers, remembered for this one.
   */
  const [viewMode, setViewMode] = useState<SubjectViewMode>(() =>
    getStoredEnum(LIST_VIEW_MODE_STORAGE_KEY, SUBJECT_VIEW_MODE_VALUES, SUBJECT_VIEW_MODES.grid));

  const visible = lists.filter((list) => !removed.has(list.id));
  const rows = viewMode === SUBJECT_VIEW_MODES.list;

  const practiceHrefFor = (characters: string[]) =>
    `${practicePath}?source=picked&picked=${encodeURIComponent(characters.join(""))}`;

  async function remove(id: string) {
    setPendingRemoval(null);

    // Hidden first, restored if the server disagrees: deleting your own list
    // should feel immediate, and a failure is rare enough to explain after.
    setRemoved((prev) => new Set(prev).add(id));
    setError(null);
    try {
      const response = await fetch(`/api/study/${accountId}/lists`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("delete failed");
    } catch {
      setRemoved((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setError(STUDY_LIST_COPY.removeFailed);
    }
  }

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface-muted p-5">
        <p className="text-sm font-black text-foreground/80">{STUDY_LIST_COPY.empty}</p>
        <p className="mt-1 text-xs text-foreground/60">{STUDY_LIST_COPY.emptyHint}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-end">
        <SubjectViewModeToggle
          value={viewMode}
          onChange={(next) => {
            setViewMode(next);
            setStoredEnum(LIST_VIEW_MODE_STORAGE_KEY, next);
          }}
        />
      </div>

      {error ? <p className="mb-3 text-xs font-semibold text-rose-600">{error}</p> : null}

      <ul
        className={
          rows
            ? "space-y-1.5"
            : "grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]"
        }
      >
        {visible.map((list) => (
          <li
            key={list.id}
            className={`min-w-0 rounded-2xl border border-line bg-surface ${rows ? "px-4 py-2.5" : "p-4"}`}
          >
            {rows ? (
              /*
               * One line each, for scanning a shelf of weeks. The characters
               * still get the room, because they are what tells the lists
               * apart - a column of names does not.
               */
              <div className="flex min-w-0 items-center gap-3">
                <h2 className="w-32 shrink-0 truncate text-sm font-black text-foreground" title={list.name}>
                  {list.name}
                </h2>
                <p lang="ja" translate="no" className={`min-w-0 flex-1 truncate text-xl font-black leading-none text-kanji ${JP_TEXT_CLASS}`}>
                  {list.characters.join("")}
                </p>
                <span className="shrink-0 text-[11px] font-semibold text-foreground/50">
                  {list.characters.length}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => setPendingRemoval(list.id)}
                      className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/45 transition hover:text-rose-600"
                    >
                      {STUDY_LIST_COPY.remove}
                    </button>
                  ) : null}
                  <Link
                    href={practiceHrefFor(list.characters)}
                    className="inline-flex h-8 items-center rounded-full bg-accent px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
                  >
                    {STUDY_LIST_COPY.practise}
                  </Link>
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="min-w-0 truncate text-sm font-black text-foreground" title={list.name}>
                    {list.name}
                  </h2>
                  <span className="shrink-0 text-[11px] font-semibold text-foreground/50">
                    {list.characters.length}{" "}
                    {list.characters.length === 1
                      ? STUDY_LIST_COPY.countSuffixOne
                      : STUDY_LIST_COPY.countSuffix}
                  </span>
                </div>

                <p lang="ja" translate="no" className={`mt-2 line-clamp-3 break-all text-2xl font-black leading-snug text-kanji ${JP_TEXT_CLASS}`}>
                  {list.characters.join("")}
                </p>

                <p className="mt-3 text-[11px] text-foreground/45">
                  {STUDY_LIST_COPY.updatedPrefix} {formatRelativeFromNow(list.updatedAt)}
                </p>

                {/*
                  * Actions on their own line. Sharing one with the timestamp
                  * squeezed "Practise these" until it wrapped inside its pill.
                  */}
                <div className="mt-2 flex items-center justify-end gap-3">
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => setPendingRemoval(list.id)}
                      className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/45 transition hover:text-rose-600"
                    >
                      {STUDY_LIST_COPY.remove}
                    </button>
                  ) : null}
                  <Link
                    href={practiceHrefFor(list.characters)}
                    className="inline-flex h-8 items-center rounded-full bg-accent px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
                  >
                    {STUDY_LIST_COPY.practise}
                  </Link>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={pendingRemoval !== null}
        title={STUDY_LIST_COPY.removeConfirmTitle}
        description={STUDY_LIST_COPY.removeConfirmBody}
        confirmLabel={STUDY_LIST_COPY.remove}
        onConfirm={() => {
          if (pendingRemoval) void remove(pendingRemoval);
        }}
        onCancel={() => setPendingRemoval(null)}
      />
    </>
  );
}
