"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import SubjectViewModeToggle from "@/app/shared/SubjectViewModeToggle";
import {
  SUBJECT_VIEW_MODES,
  SUBJECT_VIEW_MODE_VALUES,
  subjectGlyphTone,
  type SubjectViewMode,
} from "@/app/shared/subjectListView";
import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";
import { LIST_ITEM_KIND_DISPLAY, LIST_VISIBILITIES, LIST_VISIBILITY_DISPLAY, type ListItemKind } from "@/lib/domainConstants";
import { formatRelativeFromNow } from "@/lib/timeFormat";

import { itemToneClass } from "../listItemDisplay";
import type { ListPageViewProps } from "./ListPage.types";
import ListShareControls from "./ListShareControls";

/**
 * A list, laid out to be read by whoever may open it.
 *
 * The facts a reader wants come first - who made it, when, how big, who can
 * see it - then the items in either density, filtered by kind and searched.
 * The owner gets the share controls in the same place a reader gets the
 * owner's name; somebody not signed in gets one card inviting them to keep
 * the list, and nothing else that would make the page heavy to pass around.
 */
const VIEW_MODE_KEY = "wr:list-page:view-mode";
const ALL = "all";

function timesText(count: number, noun: string): string {
  if (count === 0) return "";
  return `${noun} ${count === 1 ? STUDY_LIST_COPY.onceSuffix : `${count} ${STUDY_LIST_COPY.timesSuffix}`}`;
}

export default function ListPageView({ list, rows, owner, viewer, shareHref, currentHref }: ListPageViewProps) {
  const [kind, setKind] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<SubjectViewMode>(() =>
    getStoredEnum(VIEW_MODE_KEY, SUBJECT_VIEW_MODE_VALUES, SUBJECT_VIEW_MODES.grid),
  );

  const kinds = useMemo(() => {
    const counts = new Map<ListItemKind, number>();
    for (const row of rows) counts.set(row.kind, (counts.get(row.kind) ?? 0) + 1);
    return [...counts.entries()];
  }, [rows]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter((row) => kind === ALL || row.kind === kind)
      .filter(
        (row) =>
          term.length === 0 ||
          row.glyph.includes(term) ||
          row.meaning.toLowerCase().includes(term) ||
          (row.reading ?? "").includes(term),
      );
  }, [kind, rows, search]);

  const facts = [
    `${STUDY_LIST_COPY.created} ${formatRelativeFromNow(list.createdAt)}`,
    `${STUDY_LIST_COPY.changed} ${formatRelativeFromNow(list.updatedAt)}`,
    timesText(list.copyCount, STUDY_LIST_COPY.copied),
    timesText(list.shareCount, STUDY_LIST_COPY.shared),
  ].filter(Boolean);

  const CHIP =
    "inline-flex h-7 items-center rounded-full border px-2.5 text-[11px] font-black uppercase tracking-[0.08em] transition";
  const chipClass = (on: boolean) =>
    `${CHIP} ${on ? "border-accent bg-accent text-white" : "border-line bg-surface text-foreground/70 hover:bg-surface-muted"}`;

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-line bg-surface/90 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
              <Link href={`/users/${encodeURIComponent(owner.key)}/lists`} className="hover:text-accent">
                {STUDY_LIST_COPY.backToLists}
              </Link>
            </p>
            <h1 className="mt-1 text-2xl font-black text-foreground sm:text-3xl">{list.name}</h1>
            {list.description ? <p className="mt-1 text-sm font-semibold text-foreground/75">{list.description}</p> : null}
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-foreground/60">
              <span>
                {STUDY_LIST_COPY.by}{" "}
                <Link href={`/users/${encodeURIComponent(owner.key)}`} className="font-black text-foreground hover:text-accent">
                  {owner.name}
                </Link>
              </span>
              <span>
                {list.itemCount} {list.itemCount === 1 ? STUDY_LIST_COPY.countSuffixOne : STUDY_LIST_COPY.countSuffix}
              </span>
              {facts.map((fact) => (
                <span key={fact}>{fact}</span>
              ))}
              <span className="subject-pill border-line bg-surface-muted text-foreground/70">
                {LIST_VISIBILITY_DISPLAY[list.visibility].label}
              </span>
            </p>
          </div>
          {viewer.isOwner && viewer.accountId && shareHref ? (
            <ListShareControls
              listId={list.id}
              accountId={viewer.accountId}
              name={list.name}
              ownerKey={owner.key}
              visibility={list.visibility}
              shareHref={shareHref}
            />
          ) : null}
        </div>
      </header>

      {!viewer.signedIn ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <div>
            <p className="text-sm font-black text-foreground">{STUDY_LIST_COPY.keepHeading}</p>
            <p className="text-xs font-semibold text-foreground/70">{STUDY_LIST_COPY.keepBody}</p>
          </div>
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(currentHref)}`}
            className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-[11px] font-black uppercase tracking-[0.1em] text-white transition hover:brightness-110"
          >
            {STUDY_LIST_COPY.keepAction}
          </Link>
        </section>
      ) : null}

      <section className="rounded-2xl border border-line bg-surface p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          {kinds.length > 1 ? (
            <>
              <button type="button" aria-pressed={kind === ALL} onClick={() => setKind(ALL)} className={chipClass(kind === ALL)}>
                {STUDY_LIST_COPY.allKinds} · {rows.length}
              </button>
              {kinds.map(([value, count]) => (
                <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={chipClass(kind === value)}>
                  {LIST_ITEM_KIND_DISPLAY[value].plural} · {count}
                </button>
              ))}
            </>
          ) : null}
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={STUDY_LIST_COPY.searchItems}
            aria-label={STUDY_LIST_COPY.searchItems}
            className="h-8 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-foreground"
          />
          <SubjectViewModeToggle
            value={viewMode}
            onChange={(next) => {
              setViewMode(next);
              setStoredEnum(VIEW_MODE_KEY, next);
            }}
          />
        </div>

        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold text-foreground/60">{STUDY_LIST_COPY.emptyPublic}</p>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold text-foreground/60">{STUDY_LIST_COPY.noListsMatch}</p>
        ) : viewMode === SUBJECT_VIEW_MODES.list ? (
          <ul className="mt-3 divide-y divide-line/60">
            {visible.map((row) => (
              <li key={row.key}>
                <RowLink row={row} />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-3 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(9rem,1fr))]">
            {visible.map((row) => (
              <li key={row.key}>
                <CardLink row={row} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {viewer.isOwner && list.visibility === LIST_VISIBILITIES.private ? (
        <p className="text-center text-xs font-semibold text-foreground/60">{STUDY_LIST_COPY.privateNotice}</p>
      ) : null}
    </div>
  );
}

type Row = ListPageViewProps["rows"][number];

/** A row: glyph, meaning, reading, level - a link to the subject's page where it has one. */
function RowLink({ row }: { row: Row }) {
  const body = (
    <>
      <span lang="ja" translate="no" className={`w-20 shrink-0 truncate text-center text-2xl font-black leading-none ${subjectGlyphTone(row.subjectType)} ${JP_TEXT_CLASS}`}>
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
        <span className={`subject-pill border-line bg-surface ${itemToneClass(row.kind)}`}>{LIST_ITEM_KIND_DISPLAY[row.kind].singular}</span>
        {row.wkLevel !== null ? <span className="subject-pill border-line bg-surface text-foreground/70">L{row.wkLevel}</span> : null}
      </span>
    </>
  );
  const shell = "flex items-center gap-3 px-2 py-2 transition hover:bg-surface-muted/50";
  return row.href ? (
    <Link href={row.href} className={shell}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  );
}

function CardLink({ row }: { row: Row }) {
  const body = (
    <>
      <span lang="ja" translate="no" className={`block truncate text-center text-3xl font-black leading-none ${subjectGlyphTone(row.subjectType)} ${JP_TEXT_CLASS}`}>
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
  return row.href ? (
    <Link href={row.href} className={shell}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  );
}
