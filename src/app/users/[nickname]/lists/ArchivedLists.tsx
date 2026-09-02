"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import ConfirmDialog from "@/app/shared/ConfirmDialog";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { listHref, type StudyListSummary } from "@/lib/studyListRules";
import { formatRelativeFromNow } from "@/lib/timeFormat";

/**
 * The lists an owner has finished with but others still hold.
 *
 * Archived rather than gone: still readable by everyone who had them, closed
 * to change, and one click from coming back. Deleting for good is offered
 * here too, behind a confirmation that says who loses the link.
 */
export default function ArchivedLists({ lists, accountId, owner }: { lists: StudyListSummary[]; accountId: string; owner: string }) {
  const router = useRouter();
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function restore(id: string) {
    setError(null);
    const response = await fetch(`/api/study/${accountId}/lists`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, archived: false }),
    }).catch(() => null);
    if (!response?.ok) {
      setError(STUDY_LIST_COPY.editFailed);
      return;
    }
    router.refresh();
  }

  async function deleteForGood(id: string) {
    setPendingDelete(null);
    setGone((prev) => new Set(prev).add(id));
    const response = await fetch(`/api/study/${accountId}/lists`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, forGood: true }),
    }).catch(() => null);
    if (!response?.ok) {
      setGone((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setError(STUDY_LIST_COPY.removeFailed);
    }
  }

  const shown = lists.filter((list) => !gone.has(list.id));
  if (shown.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">{STUDY_LIST_COPY.archivedHeading}</h2>
      <p className="mb-2 text-xs text-foreground/60">{STUDY_LIST_COPY.archivedBlurb}</p>
      {error ? <p className="mb-2 text-xs font-semibold text-rose-600">{error}</p> : null}
      <ul className="space-y-1.5">
        {shown.map((list) => (
          <li key={list.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-line bg-surface-muted px-4 py-2.5">
            <Link href={listHref(owner, list.name)} className="min-w-0 truncate text-sm font-black text-foreground hover:text-accent">
              {list.name}
            </Link>
            <span className="text-[11px] font-semibold text-foreground/60">
              {list.items.length} {list.items.length === 1 ? STUDY_LIST_COPY.countSuffixOne : STUDY_LIST_COPY.countSuffix}
              {" · "}
              {STUDY_LIST_COPY.archivedPrefix} {formatRelativeFromNow(list.updatedAt)}
            </span>
            <span className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={() => void restore(list.id)}
                className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent transition hover:underline"
              >
                {STUDY_LIST_COPY.restore}
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(list.id)}
                className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/60 transition hover:text-rose-600"
              >
                {STUDY_LIST_COPY.deleteForGood}
              </button>
            </span>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={pendingDelete !== null}
        title={STUDY_LIST_COPY.deleteForGoodTitle}
        description={STUDY_LIST_COPY.deleteForGoodBody}
        confirmLabel={STUDY_LIST_COPY.deleteForGood}
        onConfirm={() => {
          if (pendingDelete) void deleteForGood(pendingDelete);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
