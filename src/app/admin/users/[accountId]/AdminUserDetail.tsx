"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { AdminAccountDetailPayload } from "@/lib/adminAccountDetail.types";

import AdminFeedbackProvider from "@/app/admin/AdminFeedbackProvider";

import { ADMIN_USER_DETAIL_COPY as COPY, ADMIN_USER_DETAIL_STYLES as S } from "./AdminUserDetail.constants";
import AdminUserActions from "./AdminUserActions";
import AdminUserActivity from "./AdminUserActivity";
import AdminUserEditForm from "./AdminUserEditForm";
import AdminUserFacts from "./AdminUserFacts";
import AdminUserLadder from "./AdminUserLadder";
import AdminUserStanding from "./AdminUserStanding";
import AdminUserTimeOff from "./AdminUserTimeOff";
import AdminUserXpAward from "./AdminUserXpAward";

/**
 * One member, and everything an admin may do to them.
 *
 * Every mutating route on this screen answers with the whole detail, and the
 * sections hand that answer straight back here rather than re-fetching, so
 * what is drawn is always what the database holds. `revision` climbs with each
 * one and keys the forms, which is how a draft gets back in step with the
 * server without an effect writing state during a render.
 *
 * One `busy` for the screen rather than one per section: these all write to
 * the same row, and two of them in flight at once is a race nobody needs to
 * win.
 */
export default function AdminUserDetail({ accountId }: { accountId: string }) {
  const [payload, setPayload] = useState<AdminAccountDetailPayload | null>(null);
  const [revision, setRevision] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const accept = useCallback((next: AdminAccountDetailPayload) => {
    setPayload(next);
    setRevision((previous) => previous + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/admin/accounts/${accountId}`, { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as AdminAccountDetailPayload & { error?: string };
        if (cancelled) return;
        if (response.status === 404) {
          setProblem(COPY.page.notFound);
          return;
        }
        if (!response.ok) {
          setProblem(body.error ?? COPY.page.loadFailed);
          return;
        }
        setPayload(body);
      })
      .catch(() => {
        if (!cancelled) setProblem(COPY.page.loadFailed);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  if (problem) {
    return <p className={`${S.card} text-[13px] font-black text-rose-600`}>{problem}</p>;
  }

  /* Loading and empty are different things, and this screen has no empty: an
     account either exists or the read came back 404 above. */
  if (!payload) {
    return <p className={`${S.card} text-[13px] font-semibold text-foreground/60`}>{COPY.page.loading}</p>;
  }

  const section = { account: payload.account, busy, setBusy, onChanged: accept };

  return (
    <AdminFeedbackProvider>
      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="text-lg font-black text-foreground">{payload.account.nickname}</h1>
          <Link href="/admin/users" className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60 hover:text-foreground">
            {COPY.page.back}
          </Link>
        </div>

        <AdminUserFacts account={payload.account} />
        <AdminUserActivity account={payload.account} activity={payload.activity} rest={payload.rest} />
        <AdminUserEditForm key={`edit-${revision}`} {...section} />
        <AdminUserXpAward
          key={`xp-${revision}`}
          {...section}
          xpTypes={payload.xpTypes}
          recentXpEvents={payload.recentXpEvents}
        />
        <AdminUserTimeOff
          key={`timeoff-${revision}`}
          {...section}
          rest={payload.rest}
          grants={payload.restGrants}
        />
        <AdminUserStanding key={`standing-${revision}`} {...section} />
        <AdminUserLadder key={`ladder-${revision}`} {...section} />
        <AdminUserActions {...section} />
      </div>
    </AdminFeedbackProvider>
  );
}
