import { GAME_LEADERBOARD_MODE_LABELS, GAME_METRIC_LABELS, GAME_RANGE_LABELS } from "./GameMode.constants";
import type { GameLeaderboardFilters as Filters, GameSetupResponse } from "./GameMode.types";

type Props = {
  filters: Filters;
  setup: GameSetupResponse;
  onChange: (filters: Filters) => void;
};

const SELECT_CLASS = "h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-bold text-foreground";

export default function GameLeaderboardFilters({ filters, setup, onChange }: Props) {
  return (
    <section aria-label="Leaderboard filters" className="flex flex-wrap items-end gap-2 border-y border-line bg-surface/70 px-3 py-3 sm:px-4">
      <label className="grid gap-1 text-[10px] font-bold uppercase text-foreground/55">
        Questions
        <select value={filters.batchSize} onChange={(event) => onChange({ ...filters, batchSize: Number(event.target.value) as Filters["batchSize"] })} className={SELECT_CLASS}>
          {setup.batchSizes.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-[10px] font-bold uppercase text-foreground/55">
        Level
        <select value={filters.level ?? "all"} onChange={(event) => onChange({ ...filters, level: event.target.value === "any" ? "any" : event.target.value === "all" ? null : Number(event.target.value) })} className={SELECT_CLASS}>
          <option value="any">Any level</option>
          <option value="all">All-level rounds</option>
          {setup.levels.map((level) => <option key={level} value={level}>Level {level}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-[10px] font-bold uppercase text-foreground/55">
        Mode
        <select value={filters.mode} onChange={(event) => onChange({ ...filters, mode: event.target.value as Filters["mode"] })} className={SELECT_CLASS}>
          {Object.entries(GAME_LEADERBOARD_MODE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <div className="inline-flex rounded-lg border border-line bg-surface p-1">
        {Object.entries(GAME_RANGE_LABELS).map(([value, label]) => <button key={value} type="button" onClick={() => onChange({ ...filters, range: value as Filters["range"] })} className={`rounded-md px-2.5 py-1.5 text-xs font-bold ${filters.range === value ? "bg-accent text-white" : "text-foreground hover:bg-surface-muted"}`}>{label}</button>)}
      </div>
      <div className="inline-flex rounded-lg border border-line bg-surface p-1">
        {Object.entries(GAME_METRIC_LABELS).map(([value, label]) => <button key={value} type="button" onClick={() => onChange({ ...filters, metric: value as Filters["metric"] })} className={`rounded-md px-2.5 py-1.5 text-xs font-bold ${filters.metric === value ? "bg-accent text-white" : "text-foreground hover:bg-surface-muted"}`}>{label}</button>)}
      </div>
    </section>
  );
}