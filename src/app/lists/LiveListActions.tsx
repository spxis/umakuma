"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { listHref } from "@/lib/studyListRules";

import type { LiveListActionsProps } from "./LiveList.types";

/**
 * Keeping a list nobody owns: follow it and it stays current, or copy it and
 * it becomes yours to cut down - half of Grade 1, or Grade 1 without what you
 * already know. The same two promises a member's list offers, over a list
 * that has no member behind it.
 */
const PILL =
  "inline-flex h-8 items-center whitespace-nowrap rounded-full px-3 text-[11px] font-black uppercase tracking-[0.08em] transition";

export default function LiveListActions({ liveKey, viewerAccountId, viewerKey, following }: LiveListActionsProps) {
  const router = useRouter();
  const [follows, setFollows] = useState(following);
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
        body: JSON.stringify({ liveKey }),
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
    const next = !follows;
    setFollows(next);
    try {
      const response = await fetch(`/api/study/${viewerAccountId}/lists/subscriptions`, {
        method: next ? "POST" : "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ liveKey }),
      });
      if (!response.ok) {
        setFollows(!next);
        setError(STUDY_LIST_COPY.followFailed);
      }
    } catch {
      setFollows(!next);
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
          aria-pressed={follows}
          className={`${PILL} border ${
            follows ? "border-accent bg-accent/10 text-accent" : "border-line bg-surface text-foreground/70 hover:bg-surface-muted"
          } disabled:opacity-50`}
        >
          {follows ? STUDY_LIST_COPY.following : STUDY_LIST_COPY.follow}
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
      <span className="text-[11px] font-semibold text-foreground/60">{STUDY_LIST_COPY.liveCopyHint}</span>
      {error ? <span className="text-[11px] font-semibold text-rose-600">{error}</span> : null}
    </div>
  );
}
