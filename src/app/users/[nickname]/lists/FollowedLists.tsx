"use client";

import Link from "next/link";
import { useState } from "react";

import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { listShareHref } from "@/lib/studyListRules";

import { listWorksheetHref } from "../practice/practiceAddress";
import ListMetaLine from "@/app/shared/ListMetaLine";
import type { FollowedList } from "@/lib/studyListShares";
import { LIST_VISIBILITIES } from "@/lib/domainConstants";

/**
 * The lists this member follows: somebody else's, read-only, kept current.
 *
 * Its own section under the saved lists, because these are not the member's
 * to rename or edit, and a card offering that would be a card that lies. Each
 * says whose it is and leads to the list's page; a list made private since
 * says so, and can still be dropped.
 */
export default function FollowedLists({
  lists,
  accountId,
  practicePath,
}: {
  lists: FollowedList[];
  accountId: string;
  /** Where this member's sheets are built, so a followed list can offer one. */
  practicePath: string;
}) {
  const [dropped, setDropped] = useState<Set<string>>(new Set());

  async function unfollow(listId: string) {
    setDropped((prev) => new Set(prev).add(listId));
    try {
      const response = await fetch(`/api/study/${accountId}/lists/subscriptions`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listId }),
      });
      if (!response.ok) throw new Error("unfollow failed");
    } catch {
      setDropped((prev) => {
        const next = new Set(prev);
        next.delete(listId);
        return next;
      });
    }
  }

  const shown = lists.filter((list) => !dropped.has(list.id));
  if (shown.length === 0) return null;

  return (
    <section>
      <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
        {shown.map((list) => {
          const href = list.reachable
            ? listShareHref(list.ownerKey, list.name, list.shareToken ? LIST_VISIBILITIES.unlisted : LIST_VISIBILITIES.public, list.shareToken)
            : null;
          /*
           * A followed list is somebody else's, so the sheet names whose it is
           * and carries the key an unlisted one needs. A list of vocabulary
           * has no squares to trace and is offered nothing.
           */
          const worksheet =
            list.reachable && list.kanjiCount > 0
              ? listWorksheetHref(
                  practicePath,
                  { tag: null, name: list.name },
                  { owner: list.ownerKey, key: list.shareToken },
                )
              : null;
          return (
            <li key={list.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 truncate text-sm font-black text-foreground" title={list.name}>
                  {href ? (
                    <Link href={href} className="hover:text-accent hover:underline">
                      {list.name}
                    </Link>
                  ) : (
                    list.name
                  )}
                </h3>
                <span className="shrink-0 text-[11px] font-semibold text-foreground/60">
                  {list.itemCount} {list.itemCount === 1 ? STUDY_LIST_COPY.countSuffixOne : STUDY_LIST_COPY.countSuffix}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-foreground/70">
                {STUDY_LIST_COPY.by}{" "}
                <Link href={`/users/${encodeURIComponent(list.ownerKey)}`} className="font-black text-foreground hover:text-accent">
                  {list.ownerName}
                </Link>
                {!list.reachable ? (
                  <span className="ml-2 subject-pill border-line bg-surface-muted text-foreground/60">{STUDY_LIST_COPY.followedGone}</span>
                ) : null}
              </p>
              {/*
                * Stacked rather than sharing a line with the date. A card is
                * 260px at its narrowest and a second action does not fit
                * beside "Changed 3 minutes ago"; squeezed onto one row the
                * date either breaks across three lines or truncates to
                * "Changed 3…", which says less than nothing.
                */}
              <p className="mt-3 text-[11px] text-foreground/60">
                <ListMetaLine facts={{ updatedAt: list.updatedAt }} />
              </p>
              <p className="mt-2 flex items-center gap-3 text-[11px] text-foreground/60">
                {worksheet ? (
                  <Link
                    href={worksheet}
                    className="font-bold uppercase tracking-[0.08em] text-foreground/60 transition hover:text-accent"
                    title={STUDY_LIST_COPY.worksheetHint}
                  >
                    {STUDY_LIST_COPY.worksheet}
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => void unfollow(list.id)}
                  className="font-bold uppercase tracking-[0.08em] text-foreground/60 transition hover:text-rose-600"
                >
                  {STUDY_LIST_COPY.unfollow}
                </button>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
