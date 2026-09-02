"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { JP_TEXT_CLASS } from "./japaneseText";
import { STUDY_LIST_COPY } from "./studyListCopy";
import { subjectGlyphTone } from "./subjectListView";
import { LIST_ITEM_KIND_DISPLAY } from "@/lib/domainConstants";
import type { ListSubjectRow } from "@/lib/studySubjectItems";

import { itemToneClass } from "@/app/users/[nickname]/lists/listItemDisplay";

/**
 * One item of a list as a page anybody can read draws it: a row for
 * scanning, a card for browsing, each a link to the subject's own page where
 * it has one. Anything the reader may do to the item - file it, propose
 * taking it out - is a sibling of the link, never inside it.
 */
export function ListRow({ row, after }: { row: ListSubjectRow; after?: ReactNode }) {
  const body = (
    <>
      <span
        lang="ja"
        translate="no"
        className={`w-20 shrink-0 truncate text-center text-2xl font-black leading-none ${subjectGlyphTone(row.subjectType)} ${JP_TEXT_CLASS}`}
      >
        {row.glyph}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-bold text-foreground">{row.meaning || "—"}</span>
        {row.reading ? (
          <span lang="ja" translate="no" className={`truncate text-xs font-semibold text-foreground/60 ${JP_TEXT_CLASS}`}>
            {row.reading}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <span className={`subject-pill border-line bg-surface ${itemToneClass(row.kind)}`}>
          {LIST_ITEM_KIND_DISPLAY[row.kind].singular}
        </span>
        {row.wkLevel !== null ? <span className="subject-pill border-line bg-surface text-foreground/70">L{row.wkLevel}</span> : null}
      </span>
    </>
  );
  const shell = "flex min-w-0 flex-1 items-center gap-3 px-2 py-2 transition hover:bg-surface-muted/50";
  return (
    <div className="flex flex-wrap items-center gap-1">
      {row.href ? (
        <Link href={row.href} className={shell}>
          {body}
        </Link>
      ) : (
        <div className={shell}>{body}</div>
      )}
      {after}
    </div>
  );
}

export function ListCard({ row, after }: { row: ListSubjectRow; after?: ReactNode }) {
  const body = (
    <>
      <span
        lang="ja"
        translate="no"
        className={`block truncate text-center text-3xl font-black leading-none ${subjectGlyphTone(row.subjectType)} ${JP_TEXT_CLASS}`}
      >
        {row.glyph}
      </span>
      <span className="mt-2 block truncate text-center text-xs font-bold text-foreground">{row.meaning || "—"}</span>
      {row.reading ? (
        <span lang="ja" translate="no" className={`block truncate text-center text-[11px] font-semibold text-foreground/60 ${JP_TEXT_CLASS}`}>
          {row.reading}
        </span>
      ) : null}
    </>
  );
  const shell = "block rounded-2xl border border-line bg-surface p-3 transition hover:border-accent/40 hover:bg-surface-muted/40";
  return (
    <div>
      {row.href ? (
        <Link href={row.href} className={shell}>
          {body}
        </Link>
      ) : (
        <div className={shell}>{body}</div>
      )}
      {after}
    </div>
  );
}

/** Ask the owner to take this item out. */
export function ProposeRemovalButton({ onPropose, pending }: { onPropose: () => void; pending: boolean }) {
  return (
    <button
      type="button"
      onClick={onPropose}
      disabled={pending}
      title={STUDY_LIST_COPY.proposeRemoval}
      aria-label={STUDY_LIST_COPY.proposeRemoval}
      className="inline-flex h-7 items-center rounded-full border border-line bg-surface px-2 text-[10px] font-bold uppercase tracking-[0.06em] text-foreground/60 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
    >
      {pending ? STUDY_LIST_COPY.proposed : STUDY_LIST_COPY.proposeRemovalShort}
    </button>
  );
}
