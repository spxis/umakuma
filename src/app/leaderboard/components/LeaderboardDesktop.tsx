import Link from "next/link";
import { Fragment } from "react";

import LeaderboardExpandedRow from "./LeaderboardExpandedRow";
import {
  LEADERBOARD_TABS,
  type LeaderboardRow,
  type LeaderboardTab,
  type SortKey,
  type SortState,
} from "../lib/leaderboardTypes";
import {
  deltaClass,
  formatDate,
  formatDelta,
  formatNumber,
  formatSince,
  kanjiCountFromRow,
  learnedKanjiFromRow,
  learnedPercent,
  learnedRadicalsFromRow,
  learnedVocabularyFromRow,
} from "../lib/leaderboardUtils";

type Props = {
  activeTab: LeaderboardTab;
  activeSort: SortState;
  sortedRows: LeaderboardRow[];
  rankById: Map<string, number>;
  canViewAllUserPages: boolean;
  viewerWkUsername: string | null;
  filteredExpanded: Set<string>;
  canRefreshAdmin: boolean;
  refreshingRowIds: Set<string>;
  showItemSpreadPanel: boolean;
  showLevelProgressPanel: boolean;
  onRequestSort: (key: SortKey) => void;
  onToggleRow: (id: string) => void;
  onRefreshUser: (id: string) => Promise<void>;
  onToggleItemSpreadPanel: () => void;
  onToggleLevelProgressPanel: () => void;
};

function headerClassFor(activeSort: SortState, sortKey: SortKey): string {
  return activeSort.key !== sortKey ? "text-foreground/70" : "text-accent";
}

export default function LeaderboardDesktop({
  activeTab,
  activeSort,
  sortedRows,
  rankById,
  canViewAllUserPages,
  viewerWkUsername,
  filteredExpanded,
  canRefreshAdmin,
  refreshingRowIds,
  showItemSpreadPanel,
  showLevelProgressPanel,
  onRequestSort,
  onToggleRow,
  onRefreshUser,
  onToggleItemSpreadPanel,
  onToggleLevelProgressPanel,
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
    <div className="hidden overflow-x-auto md:block">
      <table className="min-w-full">
        <thead className="border-b border-line bg-surface-muted text-left text-xs font-bold uppercase tracking-[0.14em] text-foreground/70">
          <tr>
            <th className="px-4 py-3">
              <button type="button" onClick={() => onRequestSort("rank")} className={`inline-flex items-center gap-1 ${headerClassFor(activeSort, "rank")}`}>
                #
              </button>
            </th>
            <th className="px-4 py-3">
              <button type="button" onClick={() => onRequestSort("nickname")} className={`inline-flex items-center gap-1 ${headerClassFor(activeSort, "nickname")}`}>
                Nickname
              </button>
            </th>
            <th className="px-4 py-3">
              <button type="button" onClick={() => onRequestSort("wkLevel")} className={`inline-flex items-center gap-1 ${headerClassFor(activeSort, "wkLevel")}`}>
                Level
              </button>
            </th>
            {activeTab === LEADERBOARD_TABS.overall ? (
              <>
                <th className="px-4 py-3"><button type="button" onClick={() => onRequestSort("radicalPercent")} className={`inline-flex items-center gap-1 ${headerClassFor(activeSort, "radicalPercent")}`}>Radicals</button></th>
                <th className="px-4 py-3"><button type="button" onClick={() => onRequestSort("kanjiPercent")} className={`inline-flex items-center gap-1 ${headerClassFor(activeSort, "kanjiPercent")}`}>Kanji</button></th>
                <th className="px-4 py-3"><button type="button" onClick={() => onRequestSort("vocabularyPercent")} className={`inline-flex items-center gap-1 ${headerClassFor(activeSort, "vocabularyPercent")}`}>Vocab</button></th>
                <th className="px-4 py-3"><button type="button" onClick={() => onRequestSort("score")} className={`inline-flex items-center gap-1 ${headerClassFor(activeSort, "score")}`}>Score</button></th>
                <th className="px-4 py-3"><button type="button" onClick={() => onRequestSort("lastActivityAt")} className={`inline-flex items-center gap-1 ${headerClassFor(activeSort, "lastActivityAt")}`}>Last activity</button></th>
              </>
            ) : (
              <>
                <th className="px-4 py-3"><button type="button" onClick={() => onRequestSort("pendingReviews")} className={`inline-flex items-center gap-1 ${headerClassFor(activeSort, "pendingReviews")}`}>Due now</button></th>
                <th className="px-4 py-3"><button type="button" onClick={() => onRequestSort("apprenticeCount")} className={`inline-flex items-center gap-1 ${headerClassFor(activeSort, "apprenticeCount")}`}>Apprentice</button></th>
                <th className="px-4 py-3"><button type="button" onClick={() => onRequestSort("guruCount")} className={`inline-flex items-center gap-1 ${headerClassFor(activeSort, "guruCount")}`}>Guru</button></th>
                <th className="px-4 py-3"><button type="button" onClick={() => onRequestSort("masterCount")} className={`inline-flex items-center gap-1 ${headerClassFor(activeSort, "masterCount")}`}>Master</button></th>
                <th className="px-4 py-3"><button type="button" onClick={() => onRequestSort("enlightenedCount")} className={`inline-flex items-center gap-1 ${headerClassFor(activeSort, "enlightenedCount")}`}>Enlightened</button></th>
                <th className="px-4 py-3"><button type="button" onClick={() => onRequestSort("burnedCount")} className={`inline-flex items-center gap-1 ${headerClassFor(activeSort, "burnedCount")}`}>Burned</button></th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-line text-sm text-foreground/90">
          {sortedRows.map((row) => (
            <Fragment key={row.id}>
              <tr className="transition hover:bg-surface-muted/80">
                <td className="px-4 py-3 font-black">
                  <button
                    type="button"
                    onClick={() => onToggleRow(row.id)}
                    aria-label={filteredExpanded.has(row.id) ? "Collapse row" : "Expand row"}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm font-black text-foreground"
                  >
                    <span>{filteredExpanded.has(row.id) ? "▾" : "▸"}</span>
                    <span>#{rankById.get(row.id) ?? "-"}</span>
                  </button>
                </td>
                <td className="px-4 py-3 text-lg font-black text-foreground">
                  {canViewRowPage(row.wkUsername) ? (
                    <>
                      <Link href={`/users/${encodeURIComponent(row.wkUsername)}`} className="hover:text-accent">{row.nickname}</Link>
                      <p className="text-xs font-semibold text-foreground/60"><Link href={`/users/${encodeURIComponent(row.wkUsername)}`} className="hover:text-accent">@{row.wkUsername}</Link></p>
                    </>
                  ) : (
                    <>
                      <p>{row.nickname}</p>
                      <p className="text-xs font-semibold text-foreground/60">@{row.wkUsername}</p>
                    </>
                  )}
                </td>
                <td className="px-4 py-3 text-lg font-black text-accent"><p>{row.wkLevel}</p><p className={`mt-0.5 text-[10px] font-semibold ${deltaClass(row.dailyDelta?.wkLevel)}`}>{formatDelta(row.dailyDelta?.wkLevel)}</p></td>
                {activeTab === LEADERBOARD_TABS.overall ? (
                  <>
                    <td className="px-4 py-3"><span className="subject-pill subject-pill--radical">{formatNumber(learnedRadicalsFromRow(row))}</span><p className="mt-1 text-[10px] font-semibold text-foreground/60">/ {formatNumber(row.radicalCount)} ({learnedPercent(learnedRadicalsFromRow(row), row.radicalCount)}%)</p></td>
                    <td className="px-4 py-3"><span className="subject-pill subject-pill--kanji">{formatNumber(learnedKanjiFromRow(row))}</span><p className="mt-1 text-[10px] font-semibold text-foreground/60">/ {formatNumber(kanjiCountFromRow(row))} ({learnedPercent(learnedKanjiFromRow(row), kanjiCountFromRow(row))}%)</p></td>
                    <td className="px-4 py-3"><span className="subject-pill subject-pill--vocabulary">{formatNumber(learnedVocabularyFromRow(row))}</span><p className="mt-1 text-[10px] font-semibold text-foreground/60">/ {formatNumber(row.vocabularyCount)} ({learnedPercent(learnedVocabularyFromRow(row), row.vocabularyCount)}%)</p></td>
                    <td className="px-4 py-3 text-lg font-black text-hot"><p>{formatNumber(row.score)}</p><p className={`mt-0.5 text-[10px] font-semibold ${deltaClass(row.dailyDelta?.score)}`}>{formatDelta(row.dailyDelta?.score)}</p></td>
                    <td className="px-4 py-3 text-xs uppercase tracking-[0.08em] text-foreground/60"><p>{row.lastActivityAt ? formatDate(row.lastActivityAt) : "-"}</p><p className="mt-1 text-[10px] font-semibold normal-case tracking-normal text-foreground/50">{formatSince(row.lastActivityAt)}</p></td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-lg font-black text-accent">{formatNumber(row.pendingReviews)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground/80">{formatNumber(row.apprenticeCount)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground/80">{formatNumber(row.guruCount)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground/80">{formatNumber(row.masterCount)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground/80">{formatNumber(row.enlightenedCount)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground/80">{formatNumber(row.burnedCount)}</td>
                  </>
                )}
              </tr>
              {filteredExpanded.has(row.id) ? (
                <tr className="bg-surface-muted/40">
                  <td colSpan={activeTab === LEADERBOARD_TABS.overall ? 8 : 9} className="px-4 py-4">
                    <LeaderboardExpandedRow
                      row={row}
                      activeTab={activeTab}
                      canRefreshAdmin={canRefreshAdmin}
                      isRefreshing={refreshingRowIds.has(row.id)}
                      onRefreshUser={() => onRefreshUser(row.id)}
                      showItemSpreadPanel={showItemSpreadPanel}
                      showLevelProgressPanel={showLevelProgressPanel}
                      onToggleItemSpreadPanel={onToggleItemSpreadPanel}
                      onToggleLevelProgressPanel={onToggleLevelProgressPanel}
                    />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
