"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { PROPOSAL_ACTIONS } from "@/lib/listContributions";
import type { PendingProposal } from "@/lib/studyListContributions";
import { formatRelativeFromNow } from "@/lib/timeFormat";

import { itemToneClass } from "../listItemDisplay";

/**
 * What others would like changed, for the owner to decide on the list itself.
 *
 * Each proposal is one item and one verb, who asked and why, and two buttons.
 * Decided ones leave the panel at once; the page refreshes behind so the
 * list shows the change.
 */
export default function ListProposalsPanel({ proposals, ownerAccountId }: { proposals: PendingProposal[]; ownerAccountId: string }) {
  const router = useRouter();
  const [settled, setSettled] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function decide(proposalId: string, decision: "approved" | "declined") {
    setSettled((prev) => new Set(prev).add(proposalId));
    setError(null);
    try {
      const response = await fetch(`/api/study/${ownerAccountId}/lists/proposals`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ proposalId, decision }),
      });
      if (!response.ok) throw new Error("decide failed");
      router.refresh();
    } catch {
      setSettled((prev) => {
        const next = new Set(prev);
        next.delete(proposalId);
        return next;
      });
      setError(STUDY_LIST_COPY.decideFailed);
    }
  }

  const open = proposals.filter((proposal) => !settled.has(proposal.id));
  if (open.length === 0) return null;

  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-3 sm:p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-900">
        {STUDY_LIST_COPY.proposalsHeading} · {open.length}
      </p>
      <ul className="mt-2 space-y-2">
        {open.map((proposal) => (
          <li key={proposal.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-surface px-3 py-2">
            <span className="subject-pill border-line bg-surface-muted text-foreground/70">
              {proposal.action === PROPOSAL_ACTIONS.add ? STUDY_LIST_COPY.proposalAdd : STUDY_LIST_COPY.proposalRemove}
            </span>
            <span lang="ja" translate="no" className={`text-xl font-black leading-none ${itemToneClass(proposal.item.kind)} ${JP_TEXT_CLASS}`}>
              {proposal.item.key}
            </span>
            <span className="min-w-0 flex-1 text-xs font-semibold text-foreground/70">
              <Link href={`/users/${encodeURIComponent(proposal.proposer.key)}`} className="font-black text-foreground hover:text-accent">
                {proposal.proposer.name}
              </Link>
              {" · "}
              {formatRelativeFromNow(proposal.createdAt)}
              {proposal.note ? <span className="ml-2 italic">“{proposal.note}”</span> : null}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void decide(proposal.id, "approved")}
                className="inline-flex h-7 items-center rounded-full bg-accent px-3 text-[11px] font-black uppercase tracking-[0.08em] text-white transition hover:brightness-110"
              >
                {STUDY_LIST_COPY.approve}
              </button>
              <button
                type="button"
                onClick={() => void decide(proposal.id, "declined")}
                className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/60 transition hover:text-rose-600"
              >
                {STUDY_LIST_COPY.decline}
              </button>
            </span>
          </li>
        ))}
      </ul>
      {error ? <p className="mt-2 text-[11px] font-semibold text-rose-600">{error}</p> : null}
    </section>
  );
}
