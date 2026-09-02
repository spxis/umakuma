"use client";

import Link from "next/link";
import { useState } from "react";

import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { listShareHref } from "@/lib/studyListRules";
import type { FollowedList } from "@/lib/studyListShares";
import { LIST_VISIBILITIES } from "@/lib/domainConstants";
import { formatRelativeFromNow } from "@/lib/timeFormat";

/**
 * The lists this member follows: somebody else's, read-only, kept current.
 *
 * Its own section under the saved lists, because these are not the member's
 * to rename or edit, and a card offering that would be a card that lies. Each
 * says whose it is and leads to the list's page; a list made private since
 * says so, and can still be dropped.
 */
export default function FollowedLists({ lists, accountId }: { lists: FollowedList[]; accountId: string }) {
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
    <section className="mt-6">
      <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">{STUDY_LIST_COPY.followedHeading}</h2>
      <p className="mb-2 text-xs text-foreground/60">{STUDY_LIST_COPY.followedBlurb}</p>
      <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
        {shown.map((list) => {
          const href = list.reachable
            ? listShareHref(list.ownerKey, list.name, list.shareToken ? LIST_VISIBILITIES.unlisted : LIST_VISIBILITIES.public, list.shareToken)
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
              <p className="mt-3 flex items-center justify-between text-[11px] text-foreground/60">
                <span>
                  {STUDY_LIST_COPY.updatedPrefix} {formatRelativeFromNow(list.updatedAt)}
                </span>
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
