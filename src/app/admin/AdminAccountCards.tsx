"use client";

import { formatDateShort, formatDateTimeShort } from "@/lib/timeFormat";
import { isTestUser } from "@/lib/userType";

import AdminAccountRowActions from "./AdminAccountRowActions";
import { buildAccountRowActions, lockLabel } from "./AdminAccountsSection.helpers";
import type { AccountRowActionId, AdminAccount } from "./AdminAccountsSection.types";
import AdminInviteCodeChip from "./AdminInviteCodeChip";
import { ADMIN_USERS_COPY as copy } from "./AdminUsers.constants";

/**
 * The accounts list on a phone.
 *
 * The table is 980 pixels of seven columns, which on a 393-pixel screen showed
 * User, Level and a sliced-off Due while everything else - when they last
 * synced, whether an invite code is set, the actions menu - sat behind a
 * horizontal scroll nobody thinks to try. A table that has to be dragged
 * sideways is not a table you can administer from.
 *
 * So the same seven columns become labelled fields in a card. Nothing is
 * dropped: an admin on a phone is usually there precisely because something
 * needs attention, and guessing which fields they will not need is how the
 * useful one goes missing.
 */
export default function AdminAccountCards({
  accounts,
  loading,
  viewerEmail,
  generatedInviteCodesByAccountId,
  onSelectAction,
}: {
  accounts: AdminAccount[];
  loading: boolean;
  viewerEmail?: string | null;
  generatedInviteCodesByAccountId: Record<string, string>;
  onSelectAction: (accountId: string, actionId: AccountRowActionId) => void;
}) {
  return (
    <ul className="divide-y divide-line/70">
      {accounts.map((account) => {
        const syncLockLabel = lockLabel(account);
        const linkedEmail = account.joinedByEmail?.trim().toLowerCase() ?? null;
        const isMe = Boolean(viewerEmail && linkedEmail && linkedEmail === viewerEmail.trim().toLowerCase());
        const generatedInviteCode = generatedInviteCodesByAccountId[account.id] ?? null;

        return (
          <li key={account.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold text-foreground">
                  <span className="truncate">{account.nickname}</span>
                  {isMe ? (
                    <span className="shrink-0 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent">
                      {copy.table.meBadge}
                    </span>
                  ) : null}
                  {account.internal ? (
                    <span className="shrink-0 rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-foreground/70">
                      {copy.table.internalBadge}
                    </span>
                  ) : null}
                  {isTestUser(account.userType) ? (
                    <span className="shrink-0 rounded-full border border-dashed border-line bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-foreground/70">
                      {copy.table.testBadge}
                    </span>
                  ) : null}
                  {/* An account switched off is the one thing about a row that
                      changes what every other column means, so it is said on
                      the row rather than only on the member's own screen. */}
                  {account.disabledAt ? (
                    <span className="shrink-0 rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-rose-700">
                      {copy.table.disabledBadge}
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-foreground/65">@{account.wkUsername}</p>
              </div>

              {/* The row's own menu, kept where the thumb already is. */}
              <div className="shrink-0">
                <AdminAccountRowActions
                  nickname={account.nickname}
                  actions={buildAccountRowActions(account, { busy: loading })}
                  onSelect={(actionId) => onSelectAction(account.id, actionId)}
                />
              </div>
            </div>

            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <Field label={copy.table.level}>
                {copy.table.levelPrefix} {account.wkLevel}
              </Field>
              <Field label={copy.table.due}>{account.pendingReviews}</Field>

              <Field label={copy.table.joined}>
                <span className="block">{formatDateShort(account.createdAt)}</span>
                {account.joinedByName ? (
                  <span className="block text-foreground/60">
                    {copy.table.joinedByPrefix} {account.joinedByName}
                  </span>
                ) : null}
                {account.joinedByEmail ? (
                  <span className="block break-all text-foreground/60">{account.joinedByEmail}</span>
                ) : null}
              </Field>

              <Field label={copy.table.sync}>
                <span className="block">{formatDateTimeShort(account.lastSyncedAt)}</span>
                <span className="block uppercase tracking-[0.08em] text-foreground/60">
                  {account.lastSyncStatus}
                </span>
                {syncLockLabel ? <span className="block text-foreground/60">{syncLockLabel}</span> : null}
              </Field>

              <div className="col-span-2">
                <Field label={copy.table.inviteCode}>
                  {account.inviteCodeUpdatedAt
                    ? `${copy.table.inviteSetPrefix} ${formatDateTimeShort(account.inviteCodeUpdatedAt)}`
                    : copy.table.inviteNotSet}
                  {generatedInviteCode ? <AdminInviteCodeChip code={generatedInviteCode} /> : null}
                </Field>
              </div>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/60">{label}</dt>
      <dd className="mt-0.5 font-semibold text-foreground/80">{children}</dd>
    </div>
  );
}
