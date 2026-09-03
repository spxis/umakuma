"use client";

import Link from "next/link";

import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import ListMetaLine from "@/app/shared/ListMetaLine";
import { LIST_VISIBILITY_DISPLAY } from "@/lib/domainConstants";

import ListShareControls from "./ListShareControls";
import ListViewerActions from "./ListViewerActions";
import type { ListPageViewProps } from "./ListPage.types";

/**
 * The card at the top of a list: what it is called, whose it is, and what a
 * reader may do with it.
 *
 * Split out of `ListPageView` when that file reached the five-hundred-line
 * gate. It is the natural seam - everything here is about the list itself,
 * and everything below is about what the list holds.
 */
export default function ListPageHeader({
  list,
  owner,
  viewer,
  shareHref,
  listKey,
  archived,
  itemCount,
}: Pick<ListPageViewProps, "list" | "owner" | "viewer" | "shareHref" | "listKey"> & {
  archived: boolean;
  /** What the list holds right now, which removals change without a reload. */
  itemCount: number;
}) {
  return (
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
              {itemCount} {itemCount === 1 ? STUDY_LIST_COPY.countSuffixOne : STUDY_LIST_COPY.countSuffix}
            </span>
            {list.tag ? (
              <span>{STUDY_LIST_COPY.builtIn}</span>
            ) : (
              <>
                <ListMetaLine
                  facts={{
                    createdAt: list.createdAt,
                    updatedAt: list.updatedAt,
                    subscriberCount: list.subscriberCount,
                    copyCount: list.copyCount,
                    shareCount: list.shareCount,
                  }}
                  className="text-xs"
                />
                <span className="subject-pill border-line bg-surface-muted text-foreground/70">
                  {LIST_VISIBILITY_DISPLAY[list.visibility].label}
                </span>
              </>
            )}
            {archived ? (
              <span className="subject-pill border-amber-300 bg-amber-50 text-amber-900">{STUDY_LIST_COPY.archivedPill}</span>
            ) : null}
          </p>
        </div>
        {archived || list.tag ? null : viewer.isOwner && viewer.accountId && shareHref ? (
          <ListShareControls
            listId={list.id}
            accountId={viewer.accountId}
            name={list.name}
            ownerKey={owner.key}
            visibility={list.visibility}
            contributions={list.contributions}
            shareHref={shareHref}
          />
        ) : !viewer.isOwner && viewer.accountId && viewer.key ? (
          <ListViewerActions
            listId={list.id}
            viewerAccountId={viewer.accountId}
            viewerKey={viewer.key}
            listKey={listKey}
            subscribed={viewer.subscribed}
          />
        ) : null}
      </div>
    </header>
  );
}
