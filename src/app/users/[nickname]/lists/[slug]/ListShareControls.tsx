"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import SegmentedControl from "@/app/shared/SegmentedControl";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { LIST_VISIBILITIES, LIST_VISIBILITY_DISPLAY, LIST_VISIBILITY_VALUES, type ListVisibility } from "@/lib/domainConstants";
import { listShareHref } from "@/lib/studyListRules";

import type { ListShareControlsProps } from "./ListPage.types";

/**
 * Who may see the list, and the link to hand them.
 *
 * Three choices in one control, because they are one decision: private is
 * the default and the two ways of sharing sit beside it. Choosing Link only
 * makes the key on the spot, so the link can be copied in the same breath.
 * Copying is counted, so the list can say how often it has been passed on.
 */
export default function ListShareControls({ listId, accountId, name, ownerKey, visibility, shareHref }: ListShareControlsProps) {
  const router = useRouter();
  const [current, setCurrent] = useState<ListVisibility>(visibility);
  const [href, setHref] = useState(shareHref);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: ListVisibility) {
    if (busy || next === current) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/study/${accountId}/lists`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: listId, visibility: next }),
      });
      const body = (await response.json().catch(() => null)) as { list?: { shareToken?: string | null }; error?: string } | null;
      if (!response.ok) {
        setError(body?.error ?? STUDY_LIST_COPY.editFailed);
        return;
      }
      setCurrent(next);
      setHref(listShareHref(ownerKey, name, next, body?.list?.shareToken ?? null));
      router.refresh();
    } catch {
      setError(STUDY_LIST_COPY.editFailed);
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    const url = new URL(href, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      void fetch(`/api/study/${accountId}/lists`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: listId, shared: true }),
      });
    } catch {
      window.prompt(STUDY_LIST_COPY.copyLink, url);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <SegmentedControl
        ariaLabel={STUDY_LIST_COPY.visibilityLabel}
        size="sm"
        value={current}
        onChange={(next) => void change(next)}
        options={LIST_VISIBILITY_VALUES.map((value) => ({ value, label: LIST_VISIBILITY_DISPLAY[value].label }))}
      />
      {current !== LIST_VISIBILITIES.private ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-[11px] font-semibold text-foreground/60">{STUDY_LIST_COPY.shareHint}</span>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex h-8 items-center rounded-full bg-accent px-3 text-[11px] font-black uppercase tracking-[0.08em] text-white transition hover:brightness-110"
          >
            {copied ? STUDY_LIST_COPY.linkCopied : STUDY_LIST_COPY.copyLink}
          </button>
        </div>
      ) : null}
      {error ? <span className="text-[11px] font-semibold text-rose-600">{error}</span> : null}
    </div>
  );
}
