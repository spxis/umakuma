import Link from "next/link";

import { LEADERBOARD_TABS, type LeaderboardRow, type LeaderboardTab } from "../lib/leaderboardTypes";
import {
  deltaClass,
  formatDate,
  formatDelta,
  formatNumber,
  formatSince,
} from "../lib/leaderboardUtils";

type Props = {
  activeTab: LeaderboardTab;
  sortedRows: LeaderboardRow[];
  rankById: Map<string, number>;
  canViewAllUserPages: boolean;
  viewerWkUsername: string | null;
  filteredExpanded: Set<string>;
  onToggleRow: (id: string) => void;
  canRefreshAdmin: boolean;
  refreshingRowIds: Set<string>;
  onRefreshUser: (id: string) => Promise<void>;
};

export default function LeaderboardMobile({
  activeTab,
  sortedRows,
  rankById,
  canViewAllUserPages,
  viewerWkUsername,
  filteredExpanded,
  onToggleRow,
  canRefreshAdmin,
  refreshingRowIds,
  onRefreshUser,
}: Props) {
  const normalizedViewerWkUsername = viewerWkUsername?.trim().toLowerCase() ?? null;

  function canViewRowPage(rowWkUsername: string): boolean {
    if (canViewAllUserPages) {
      return true;
    }

    if (!normalizedViewerWkUsername) {
      return false;
    }

    return rowWkUsername.trim().toLowerCase() === normalizedViewerWkUsername;
  }

  return (
    <div className="space-y-4 md:hidden">
      {sortedRows.map((row) => (
        <article key={row.id} className="rounded-2xl border border-line bg-surface/90 p-4 shadow-[0_10px_24px_rgba(8,16,36,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => onToggleRow(row.id)}
                aria-label={filteredExpanded.has(row.id) ? "Collapse row" : "Expand row"}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm font-black text-foreground"
              >
                <span>{filteredExpanded.has(row.id) ? "▾" : "▸"}</span>
                <span>#{rankById.get(row.id) ?? "-"}</span>
              </button>

              {canViewRowPage(row.wkUsername) ? (
                <>
                  <Link href={`/users/${encodeURIComponent(row.wkUsername)}`} className="mt-2 block text-3xl font-black text-foreground hover:text-accent">
                    {row.nickname}
                  </Link>
                  <p className="mt-0.5 text-sm text-foreground/60">
                    <Link href={`/users/${encodeURIComponent(row.wkUsername)}`} className="hover:text-accent">
                      @{row.wkUsername}
                    </Link>
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-3xl font-black text-foreground">{row.nickname}</p>
                  <p className="mt-0.5 text-sm text-foreground/60">@{row.wkUsername}</p>
                </>
              )}
            </div>
          </div>

          {activeTab === LEADERBOARD_TABS.overall ? (
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm font-semibold text-foreground/80">
              <div className="rounded-xl bg-surface-muted px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/60">Level</p>
                <p className="mt-1 text-xl font-black text-accent">Lv {row.wkLevel}</p>
                <p className={`mt-0.5 text-[10px] font-semibold ${deltaClass(row.dailyDelta?.wkLevel)}`}>{formatDelta(row.dailyDelta?.wkLevel)}</p>
              </div>
              <div className="rounded-xl bg-surface-muted px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/60">Score</p>
                <p className="mt-1 text-xl font-black text-hot">{formatNumber(row.score)}</p>
                <p className={`mt-0.5 text-[10px] font-semibold ${deltaClass(row.dailyDelta?.score)}`}>{formatDelta(row.dailyDelta?.score)}</p>
              </div>
              <div className="rounded-xl bg-surface-muted px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/60">Last activity</p>
                <p className="mt-1 text-sm font-black text-foreground">{row.lastActivityAt ? formatDate(row.lastActivityAt) : "-"}</p>
                <p className="mt-0.5 text-[10px] text-foreground/60">{formatSince(row.lastActivityAt)}</p>
              </div>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm font-semibold text-foreground/80">
              <div className="col-span-3 rounded-xl bg-surface-muted px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/60">Due now</p>
                <p className="mt-1 text-2xl font-black text-accent">{formatNumber(row.pendingReviews)}</p>
              </div>
              <div className="rounded-xl bg-surface-muted px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/60">Apprentice</p>
                <p className="mt-1 text-xl font-black text-foreground">{formatNumber(row.apprenticeCount)}</p>
              </div>
              <div className="rounded-xl bg-surface-muted px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/60">Guru</p>
                <p className="mt-1 text-xl font-black text-foreground">{formatNumber(row.guruCount)}</p>
              </div>
              <div className="rounded-xl bg-surface-muted px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/60">Master</p>
                <p className="mt-1 text-xl font-black text-foreground">{formatNumber(row.masterCount)}</p>
              </div>
              <div className="rounded-xl bg-surface-muted px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/60">Enlightened</p>
                <p className="mt-1 text-xl font-black text-foreground">{formatNumber(row.enlightenedCount)}</p>
              </div>
              <div className="rounded-xl bg-surface-muted px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/60">Burned</p>
                <p className="mt-1 text-xl font-black text-foreground">{formatNumber(row.burnedCount)}</p>
              </div>
            </div>
          )}

          {filteredExpanded.has(row.id) ? (
            <div className="mt-3 space-y-2 text-xs font-semibold text-foreground/80">
              {canRefreshAdmin ? (
                <button
                  type="button"
                  disabled={refreshingRowIds.has(row.id)}
                  onClick={() => {
                    void onRefreshUser(row.id);
                  }}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-line bg-white px-4 text-[11px] font-black uppercase tracking-[0.1em] text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshingRowIds.has(row.id) ? "Refreshing..." : "Refresh user"}
                </button>
              ) : null}
              <div className="rounded-lg bg-surface-muted p-2">Last updated {formatDate(row.lastSyncedAt)} · {formatSince(row.lastSyncedAt)}</div>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
