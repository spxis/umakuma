"use client";

import { ADMIN_USERS_COPY as copy } from "./AdminUsers.constants";

/**
 * A freshly generated invite code, with a way to copy it.
 *
 * Shared because the accounts list now renders twice - as a table on a desktop
 * and as cards on a phone - and a code you can read but not copy is no use in
 * either. The clipboard call is allowed to fail silently: some browsers refuse
 * it outside a secure context, and the code is on screen to be typed anyway.
 */
export default function AdminInviteCodeChip({ code }: { code: string }) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <code className="rounded border border-line bg-white px-2 py-0.5 text-[11px] font-bold tracking-[0.12em] text-slate-800">
        {code}
      </code>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(code).catch(() => {
            // Ignore clipboard failures; the code is readable on screen.
          });
        }}
        className="rounded-full border border-line bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-700 hover:bg-surface"
      >
        {copy.table.copyCode}
      </button>
    </div>
  );
}
