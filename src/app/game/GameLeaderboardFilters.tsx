import { gameKindRules, type GameKind } from "@/lib/gameMode";
import {
  GAME_KIND_ACCENT,
  GAME_KIND_EMOJI,
  GAME_KIND_LABELS,
  GAME_LEADERBOARD_MODE_LABELS,
  GAME_METRIC_LABELS,
  GAME_RANGE_LABELS,
} from "./GameMode.constants";
import type { GameLeaderboardFilters as Filters, GameSetupResponse } from "./GameMode.types";

type Props = {
  filters: Filters;
  setup: GameSetupResponse;
  /** Set while a game is open, so the scoreboard stays pinned to that game. */
  lockedKind: GameKind | null;
  onChange: (filters: Filters) => void;
};

const SELECT_CLASS = "h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-bold text-foreground";
const GROUP_CLASS = "grid gap-1 text-[10px] font-bold uppercase text-foreground/55";

export default function GameLeaderboardFilters({ filters, setup, lockedKind, onChange }: Props) {
  const activeKind = lockedKind ?? (filters.kind === "any" ? null : filters.kind);
  const rules = activeKind ? gameKindRules(activeKind) : null;
  const showBatchSize = (rules?.usesBatchSize ?? true) && !filters.ultraMode;
  const showLevel = rules?.usesLevel ?? true;
  const showCategory = rules ? rules.fixedCategory === null : true;
  const showUltra = rules?.usesUltraMode ?? true;
  const showHard = rules?.usesHardMode ?? true;

  return (
    <section aria-label="Leaderboard filters" className="flex flex-wrap items-end gap-2 border-y border-line bg-surface/70 px-3 py-3 sm:px-4">
      {lockedKind ? (
        <span className={`inline-flex h-9 items-center gap-1.5 rounded-lg border-2 px-3 text-xs font-black uppercase ${GAME_KIND_ACCENT[lockedKind].border} ${GAME_KIND_ACCENT[lockedKind].text}`}>
          <span aria-hidden="true">{GAME_KIND_EMOJI[lockedKind]}</span>
          {GAME_KIND_LABELS[lockedKind]}
        </span>
      ) : (
        <label className={GROUP_CLASS}>
          Game
          <select
            value={filters.kind}
            onChange={(event) => onChange({ ...filters, kind: event.target.value as Filters["kind"] })}
            className={SELECT_CLASS}
          >
            <option value="any">All games</option>
            {setup.kinds.map((kind) => <option key={kind} value={kind}>{GAME_KIND_LABELS[kind]}</option>)}
          </select>
        </label>
      )}

      {showBatchSize ? (
        <label className={GROUP_CLASS}>
          Questions
          <select value={filters.batchSize} onChange={(event) => onChange({ ...filters, batchSize: event.target.value === "any" ? "any" : Number(event.target.value) as Filters["batchSize"] })} className={SELECT_CLASS}>
            <option value="any">All</option>
            {setup.batchSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      ) : null}

      {showLevel ? (
        <label className={GROUP_CLASS}>
          Level
          <select value={filters.level ?? "all"} onChange={(event) => onChange({ ...filters, level: event.target.value === "any" ? "any" : event.target.value === "all" ? null : Number(event.target.value) })} className={SELECT_CLASS}>
            <option value="any">Any level</option>
            <option value="all">All-level rounds</option>
            {setup.levels.map((level) => <option key={level} value={level}>Level {level}</option>)}
          </select>
        </label>
      ) : null}

      {showCategory ? (
        <label className={GROUP_CLASS}>
          Mode
          <select value={filters.mode} onChange={(event) => onChange({ ...filters, mode: event.target.value as Filters["mode"] })} className={SELECT_CLASS}>
            {Object.entries(GAME_LEADERBOARD_MODE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      ) : null}

      <div className="inline-flex rounded-lg border border-line bg-surface p-1">
        {Object.entries(GAME_RANGE_LABELS).map(([value, label]) => <button key={value} type="button" onClick={() => onChange({ ...filters, range: value as Filters["range"] })} className={`rounded-md px-2.5 py-1.5 text-xs font-bold ${filters.range === value ? "bg-accent text-white" : "text-foreground hover:bg-surface-muted"}`}>{label}</button>)}
      </div>
      <div className="inline-flex rounded-lg border border-line bg-surface p-1">
        {Object.entries(GAME_METRIC_LABELS).map(([value, label]) => <button key={value} type="button" onClick={() => onChange({ ...filters, metric: value as Filters["metric"] })} className={`rounded-md px-2.5 py-1.5 text-xs font-bold ${filters.metric === value ? "bg-accent text-white" : "text-foreground hover:bg-surface-muted"}`}>{label}</button>)}
      </div>

      {showHard ? (
        <button type="button" aria-pressed={filters.hardMode} onClick={() => onChange({ ...filters, hardMode: !filters.hardMode })} className={`h-9 rounded-lg border px-3 text-xs font-black uppercase ${filters.hardMode ? "border-red-600 bg-red-600 text-white" : "border-line bg-surface text-foreground hover:bg-surface-muted"}`}>Hard mode</button>
      ) : null}
      {showUltra ? (
        <button type="button" aria-pressed={filters.ultraMode} onClick={() => onChange({ ...filters, ultraMode: !filters.ultraMode })} className={`h-9 rounded-lg border px-3 text-xs font-black uppercase ${filters.ultraMode ? "border-fuchsia-700 bg-fuchsia-700 text-white" : "border-line bg-surface text-foreground hover:bg-surface-muted"}`}>Ultra mode</button>
      ) : null}
    </section>
  );
}
