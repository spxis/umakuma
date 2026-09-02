"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { listHref } from "@/lib/studyListRules";

import type { ListViewerActionsProps } from "./ListPage.types";

/**
 * What a member may do with somebody else's list: keep it as a copy that
 * becomes theirs, or follow it and let the owner keep it current.
 *
 * Two buttons for two promises. Copy makes a list on your shelf and goes to
 * it; Follow toggles and stays here, since there is nothing new to look at.
 */
const PILL =
  "inline-flex h-8 items-center whitespace-nowrap rounded-full px-3 text-[11px] font-black uppercase tracking-[0.08em] transition";

export default function ListViewerActions({ listId, viewerAccountId, viewerKey, listKey, subscribed }: ListViewerActionsProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(subscribed);
  const [busy, setBusy] = useState<"copy" | "follow" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    if (busy) return;
    setBusy("copy");
    setError(null);
    try {
      const response = await fetch(`/api/study/${viewerAccountId}/lists/copy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listId, key: listKey }),
      });
      const body = (await response.json().catch(() => null)) as { list?: { name: string }; error?: string } | null;
      if (!response.ok || !body?.list) {
        setError(body?.error ?? STUDY_LIST_COPY.copyFailed);
        return;
      }
      router.push(listHref(viewerKey, body.list.name));
    } catch {
      setError(STUDY_LIST_COPY.copyFailed);
    } finally {
      setBusy(null);
    }
  }

  async function toggleFollow() {
    if (busy) return;
    setBusy("follow");
    setError(null);
    const next = !following;
    setFollowing(next);
    try {
      const response = await fetch(`/api/study/${viewerAccountId}/lists/subscriptions`, {
        method: next ? "POST" : "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listId, key: listKey }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setFollowing(!next);
        setError(body?.error ?? STUDY_LIST_COPY.followFailed);
      }
    } catch {
      setFollowing(!next);
      setError(STUDY_LIST_COPY.followFailed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => void toggleFollow()}
          disabled={busy !== null}
          aria-pressed={following}
          className={`${PILL} border ${
            following ? "border-accent bg-accent/10 text-accent" : "border-line bg-surface text-foreground/70 hover:bg-surface-muted"
          } disabled:opacity-50`}
        >
          {following ? STUDY_LIST_COPY.following : STUDY_LIST_COPY.follow}
        </button>
        <button
          type="button"
          onClick={() => void copy()}
          disabled={busy !== null}
          className={`${PILL} bg-accent text-white hover:brightness-110 disabled:opacity-50`}
        >
          {busy === "copy" ? STUDY_LIST_COPY.copying : STUDY_LIST_COPY.copyToMine}
        </button>
      </div>
      <span className="text-[11px] font-semibold text-foreground/60">{STUDY_LIST_COPY.copyHint}</span>
      {error ? <span className="text-[11px] font-semibold text-rose-600">{error}</span> : null}
    </div>
  );
}
