import { badgeClass, formatNumber } from "../lib/levelExplorerDisplay";
import { LEVEL_EXPLORER_TEXT } from "./LevelExplorer.constants";

type Props = {
  visibleCount: number;
  totalCount: number;
  showEnglish: boolean;
  canToggleEnglish: boolean;
  recentOnly: boolean;
  showLocked: boolean;
  allowHideLocked: boolean;
  bulkModeEnabled: boolean;
  onToggleShowEnglish: () => void;
  onSetRecentOnly: (next: boolean) => void;
  onSetShowLocked: (next: boolean) => void;
  onToggleBulkMode: () => void;
};

export default function LevelExplorerGridToolbar({
  visibleCount,
  totalCount,
  showEnglish,
  canToggleEnglish,
  recentOnly,
  showLocked,
  allowHideLocked,
  bulkModeEnabled,
  onToggleShowEnglish,
  onSetRecentOnly,
  onSetShowLocked,
  onToggleBulkMode,
}: Props) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">
        Showing {formatNumber(visibleCount)} of {formatNumber(totalCount)} items
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleShowEnglish}
          disabled={!canToggleEnglish}
          className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {canToggleEnglish ? (showEnglish ? LEVEL_EXPLORER_TEXT.hideEnglish : LEVEL_EXPLORER_TEXT.showEnglish) : LEVEL_EXPLORER_TEXT.hintsHidden}
        </button>
        <button
          type="button"
          onClick={() => onSetRecentOnly(!recentOnly)}
          className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] transition ${badgeClass(recentOnly)}`}
        >
          {LEVEL_EXPLORER_TEXT.recentOnly}
        </button>
        {allowHideLocked ? (
          <button
            type="button"
            onClick={() => onSetShowLocked(!showLocked)}
            className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] transition hover:bg-surface-muted"
          >
            {showLocked ? LEVEL_EXPLORER_TEXT.hideLocked : LEVEL_EXPLORER_TEXT.showLocked}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onToggleBulkMode}
          className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] transition ${badgeClass(
            bulkModeEnabled,
          )}`}
        >
          {bulkModeEnabled ? LEVEL_EXPLORER_TEXT.bulkOpsActive : LEVEL_EXPLORER_TEXT.bulkOperations}
        </button>
      </div>
    </div>
  );
}
