"use client";

import { useMemo, useState } from "react";

import { formatDateShort, formatDateTimeShort } from "@/lib/timeFormat";

import AdminAccountCards from "./AdminAccountCards";
import AdminAccountRowActions from "./AdminAccountRowActions";
import AdminInviteCodeChip from "./AdminInviteCodeChip";
import AdminPanelHeader from "./AdminPanelHeader";
import AdminPaginationControls from "./AdminPaginationControls";
import { ADMIN_USERS_COPY } from "./AdminUsers.constants";
import { buildAccountRowActions, initialSortDirFor, lockLabel, sortAccounts } from "./AdminAccountsSection.helpers";
import {
  ACCOUNT_ROW_ACTION_IDS,
  type AccountRowActionId,
  type AdminAccountsSectionProps,
  type SortBy,
  type SortDir,
} from "./AdminAccountsSection.types";

function sortIndicator(activeSortBy: SortBy, sortBy: SortBy, sortDir: SortDir): string {
  if (activeSortBy !== sortBy) {
    return "<>";
  }

  return sortDir === "asc" ? "^" : "v";
}

export default function AdminAccountsSection({
  sessionAuthorized,
  accounts,
  loading,
  viewerEmail = null,
  generatedInviteCodesByAccountId = {},
  onRefreshOne,
  onAssignInviteCode,
  onResetInviteCode,
  onSetInternal,
}: AdminAccountsSectionProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<SortBy>("nickname");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const copy = ADMIN_USERS_COPY;

  function toggleSort(nextSortBy: SortBy) {
    if (sortBy !== nextSortBy) {
      setSortBy(nextSortBy);
      setSortDir(initialSortDirFor(nextSortBy));
      return;
    }

    setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
  }

  const sortedAccounts = useMemo(() => sortAccounts(accounts, sortBy, sortDir), [accounts, sortBy, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sortedAccounts.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pagedAccounts = useMemo(() => {
    const offset = (safePage - 1) * pageSize;
    return sortedAccounts.slice(offset, offset + pageSize);
  }, [pageSize, safePage, sortedAccounts]);

  function selectRowAction(accountId: string, actionId: AccountRowActionId) {
    if (actionId === ACCOUNT_ROW_ACTION_IDS.refresh) {
      onRefreshOne(accountId);
      return;
    }

    if (actionId === ACCOUNT_ROW_ACTION_IDS.setInvite) {
      void (async () => {
        const code = await onAssignInviteCode(accountId);
        if (code && typeof window !== "undefined") {
          await navigator.clipboard.writeText(code).catch(() => {
            // Ignore clipboard failures.
          });
        }
      })();
      return;
    }

    if (actionId === ACCOUNT_ROW_ACTION_IDS.resetInvite) {
      void onResetInviteCode(accountId);
      return;
    }

    if (actionId === ACCOUNT_ROW_ACTION_IDS.toggleInternal) {
      const account = accounts.find((row) => row.id === accountId);
      void onSetInternal(accountId, !account?.internal);
    }
  }

  if (!sessionAuthorized) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-line bg-surface/90 p-5 shadow-sm">
      <AdminPanelHeader label={copy.panel.label} title={copy.panel.title} description={copy.panel.description} />
      {accounts.length === 0 ? (
        <p className="mt-4 rounded-xl border border-line p-4 text-sm text-foreground/70">{copy.panel.empty}</p>
      ) : (
        <>
          {/*
            * One list, two shapes. Below md the seven columns become labelled
            * fields in a card, because a 980px table on a 393px screen hides
            * five of them behind a sideways scroll nobody finds.
            */}
          <div className="mt-4 rounded-xl border border-line md:hidden">
            <AdminAccountCards
              accounts={pagedAccounts}
              loading={loading}
              viewerEmail={viewerEmail}
              generatedInviteCodesByAccountId={generatedInviteCodesByAccountId}
              onSelectAction={selectRowAction}
            />
          </div>

          <div className="mt-4 hidden overflow-x-auto rounded-xl border border-line md:block">
          <table className="min-w-245 w-full border-collapse text-sm">
            <thead className="bg-surface-muted text-[11px] uppercase tracking-[0.08em] text-foreground/70">
              <tr className="border-b border-line">
                <th className="px-3 py-2"><button type="button" onClick={() => toggleSort("nickname")} className="font-bold">{copy.table.user} {sortIndicator(sortBy, "nickname", sortDir)}</button></th>
                <th className="px-3 py-2"><button type="button" onClick={() => toggleSort("wkLevel")} className="font-bold">{copy.table.level} {sortIndicator(sortBy, "wkLevel", sortDir)}</button></th>
                <th className="px-3 py-2"><button type="button" onClick={() => toggleSort("pendingReviews")} className="font-bold">{copy.table.due} {sortIndicator(sortBy, "pendingReviews", sortDir)}</button></th>
                <th className="px-3 py-2"><button type="button" onClick={() => toggleSort("createdAt")} className="font-bold">{copy.table.joined} {sortIndicator(sortBy, "createdAt", sortDir)}</button></th>
                <th className="px-3 py-2"><button type="button" onClick={() => toggleSort("lastSyncedAt")} className="font-bold">{copy.table.sync} {sortIndicator(sortBy, "lastSyncedAt", sortDir)}</button></th>
                <th className="px-3 py-2">{copy.table.inviteCode}</th>
                <th className="px-3 py-2">{copy.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {pagedAccounts.map((account) => {
                const syncLockLabel = lockLabel(account);
                const linkedEmail = account.joinedByEmail?.trim().toLowerCase() ?? null;
                const isMe = Boolean(viewerEmail && linkedEmail && linkedEmail === viewerEmail.trim().toLowerCase());
                const generatedInviteCode = generatedInviteCodesByAccountId[account.id] ?? null;

                return (
                  <tr key={account.id} className="border-b border-line/70 align-top hover:bg-surface-muted/40 last:border-b-0">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{account.nickname}</p>
                        {isMe ? (
                          <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent">
                            {copy.table.meBadge}
                          </span>
                        ) : null}
                        {account.internal ? (
                          <span className="rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-foreground/70">
                            {copy.table.internalBadge}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-foreground/65">
                        @{account.wkUsername}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold text-foreground/80">{copy.table.levelPrefix} {account.wkLevel}</td>
                    <td className="px-3 py-3 text-xs font-semibold text-foreground/80">{account.pendingReviews}</td>
                    <td className="px-3 py-3 text-xs text-foreground/65">
                      <p>{formatDateShort(account.createdAt)}</p>
                      <p>{account.joinedByName ? `${copy.table.joinedByPrefix} ${account.joinedByName}` : ""}</p>
                      <p>{account.joinedByEmail ?? ""}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-foreground/65">
                      <p>{formatDateTimeShort(account.lastSyncedAt)}</p>
                      <p className="uppercase tracking-[0.08em]">{account.lastSyncStatus}</p>
                      {syncLockLabel ? <p>{syncLockLabel}</p> : null}
                    </td>
                    <td className="px-3 py-3 text-xs text-foreground/75">
                      <p>
                        {account.inviteCodeUpdatedAt
                          ? `${copy.table.inviteSetPrefix} ${formatDateTimeShort(account.inviteCodeUpdatedAt)}`
                          : copy.table.inviteNotSet}
                      </p>
                      {generatedInviteCode ? <AdminInviteCodeChip code={generatedInviteCode} /> : null}
                    </td>
                    <td className="px-3 py-3">
                      <AdminAccountRowActions
                        nickname={account.nickname}
                        actions={buildAccountRowActions(account, { busy: loading })}
                        onSelect={(actionId) => selectRowAction(account.id, actionId)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </>
      )}

      {accounts.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-foreground/75">
            {copy.table.pageSize}
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-8 rounded border border-line bg-surface px-2"
              disabled={loading}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>

          <AdminPaginationControls
            page={safePage}
            pageCount={pageCount}
            itemLabel={copy.table.paginationItemLabel}
            total={sortedAccounts.length}
            onFirst={() => setPage(1)}
            onPrevious={() => setPage((prev) => Math.max(1, prev - 1))}
            onNext={() => setPage((prev) => Math.min(pageCount, prev + 1))}
            onLast={() => setPage(pageCount)}
            onPageChange={(nextPage) => setPage(nextPage)}
            disabled={loading}
          />
        </div>
      ) : null}
    </section>
  );
}
