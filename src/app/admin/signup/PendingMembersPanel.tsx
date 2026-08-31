"use client";

import { useCallback, useEffect, useState } from "react";

import { ACCOUNT_APPROVAL } from "@/lib/accountApproval";
import { ACCOUNT_VISIBILITY_DISPLAY, resolveVisibility } from "@/lib/accountVisibility";
import { formatRelativeFromNow } from "@/lib/timeFormat";

import { SIGNUP_ADMIN_COPY } from "./Signup.constants";

export type PendingMember = {
  id: string;
  slug: string | null;
  displayName: string | null;
  joinedByEmail: string | null;
  visibility: string | null;
  createdAt: string;
};

type Props = { initial: PendingMember[] };

/**
 * Who is waiting, and the two buttons that decide.
 *
 * Rows leave the list as soon as they are decided, because the list is defined
 * as "waiting for you" - a decided row lingering there reads as a decision
 * that did not take.
 */
export default function PendingMembersPanel({ initial }: Props) {
  const [members, setMembers] = useState<PendingMember[]>(initial);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMembers(initial), [initial]);

  const decide = useCallback(async (id: string, approvalStatus: string) => {
    setSavingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/accounts/${id}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setMembers((rows) => rows.filter((row) => row.id !== id));
    } catch {
      setError(SIGNUP_ADMIN_COPY.saveError);
    } finally {
      setSavingId(null);
    }
  }, []);

  if (members.length === 0) {
    return <p className="text-sm font-semibold text-foreground/60">{SIGNUP_ADMIN_COPY.pendingEmpty}</p>;
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}

      {members.map((member) => (
        <div
          key={member.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">
              {member.displayName ?? member.slug ?? "Member"}
            </p>
            <p className="truncate text-xs text-foreground/60">
              {member.joinedByEmail} · /{member.slug} · {formatRelativeFromNow(member.createdAt)}
            </p>
            <p className="text-xs text-foreground/50">
              Chose: {ACCOUNT_VISIBILITY_DISPLAY[resolveVisibility(member.visibility)].label}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={savingId === member.id}
              onClick={() => void decide(member.id, ACCOUNT_APPROVAL.approved)}
              className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-accent-2 disabled:opacity-60"
            >
              {savingId === member.id ? SIGNUP_ADMIN_COPY.approving : SIGNUP_ADMIN_COPY.approve}
            </button>
            <button
              type="button"
              disabled={savingId === member.id}
              onClick={() => void decide(member.id, ACCOUNT_APPROVAL.rejected)}
              className="inline-flex h-9 items-center rounded-full border border-line bg-surface px-4 text-xs font-black uppercase tracking-[0.1em] text-foreground/70 transition hover:bg-surface-muted disabled:opacity-60"
            >
              {SIGNUP_ADMIN_COPY.reject}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
