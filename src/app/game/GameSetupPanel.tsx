import { GAME_KINDS, gameKindRules } from "@/lib/gameMode";
import {
  GAME_CATEGORY_LABELS,
  GAME_COPY,
  GAME_KIND_ACCENT,
  GAME_KIND_EMOJI,
  GAME_KIND_LABELS,
  GAME_KIND_RULE_COPY,
  gameTimeLimitLabel,
} from "./GameMode.constants";
import { gameAvailableCount, gameRequiredCount, gameSelectionIsPlayable } from "./gameHubCards";
import type { GameSelection, GameSetupResponse } from "./GameMode.types";

type Props = {
  setup: GameSetupResponse;
  selection: GameSelection;
  starting: boolean;
  onChange: (update: (value: GameSelection) => GameSelection) => void;
  onStart: () => void;
  onBack: () => void;
};

const FIELD_CLASS = "mt-2 h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm font-black text-foreground";
const LABEL_CLASS = "text-xs font-bold uppercase text-foreground/60";

export default function GameSetupPanel({ setup, selection, starting, onChange, onStart, onBack }: Props) {
  const rules = gameKindRules(selection.kind);
  const accent = GAME_KIND_ACCENT[selection.kind];
  const available = gameAvailableCount(setup, selection.kind, rules.usesLevel ? selection.level : null, selection.category);
  const playable = gameSelectionIsPlayable(setup, selection);
  const dailyPlayed = selection.kind === GAME_KINDS.daily && setup.availability.daily.playedToday;

  return (
    <section aria-label="Game setup" className="border-y border-line bg-surface/70 px-3 py-5 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="text-3xl leading-none">{GAME_KIND_EMOJI[selection.kind]}</span>
          <div className="min-w-0">
            <h2 className={`text-xl font-black sm:text-2xl ${accent.text}`}>{GAME_KIND_LABELS[selection.kind]}</h2>
            <p className="text-xs font-semibold text-foreground/60">{GAME_KIND_RULE_COPY[selection.kind]}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="h-9 shrink-0 rounded-full border border-line bg-surface px-4 text-xs font-black uppercase text-foreground hover:bg-surface-muted"
        >
          {GAME_COPY.changeGame}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rules.usesBatchSize && !selection.ultraMode ? (
          <label className={LABEL_CLASS}>{GAME_COPY.questions}
            <select
              value={selection.batchSize}
              onChange={(event) => onChange((value) => ({ ...value, batchSize: event.target.value === "all" ? "all" : Number(event.target.value) as GameSelection["batchSize"] }))}
              className={FIELD_CLASS}
            >
              <option value="all">All</option>
              {setup.batchSizes.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        ) : null}

        {rules.usesLevel ? (
          <label className={LABEL_CLASS}>{GAME_COPY.level}
            <select
              value={selection.level ?? "all"}
              onChange={(event) => onChange((value) => ({ ...value, level: event.target.value === "all" ? null : Number(event.target.value) }))}
              className={FIELD_CLASS}
            >
              {!selection.ultraMode ? <option value="all">{GAME_COPY.allLevels}</option> : null}
              {setup.levels.map((level) => <option key={level} value={level}>Level {level}</option>)}
            </select>
          </label>
        ) : null}

        {rules.usesCategory ? (
          <label className={LABEL_CLASS}>{GAME_COPY.category}
            <select
              value={selection.category}
              onChange={(event) => onChange((value) => ({ ...value, category: event.target.value as GameSelection["category"] }))}
              className={FIELD_CLASS}
            >
              {setup.categories.map((category) => (
                <option key={category} value={category}>
                  {GAME_CATEGORY_LABELS[category]} ({gameAvailableCount(setup, selection.kind, rules.usesLevel ? selection.level : null, category)})
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {rules.usesTimeLimit ? (
          <label className={LABEL_CLASS}>{GAME_COPY.timeLimit}
            <select
              value={selection.timeLimitMs}
              onChange={(event) => onChange((value) => ({ ...value, timeLimitMs: Number(event.target.value) as GameSelection["timeLimitMs"] }))}
              className={FIELD_CLASS}
            >
              {setup.timeLimitsMs.map((limit) => <option key={limit} value={limit}>{gameTimeLimitLabel(limit)}</option>)}
            </select>
          </label>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {rules.usesHardMode ? (
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-black uppercase text-foreground hover:bg-surface-muted">
            <input
              type="checkbox"
              checked={selection.hardMode}
              onChange={(event) => onChange((value) => ({ ...value, hardMode: event.target.checked }))}
              className="h-4 w-4 accent-red-600"
            />
            {GAME_COPY.hardMode}
          </label>
        ) : null}

        {rules.usesUltraMode ? (
          <button
            type="button"
            aria-pressed={selection.ultraMode}
            onClick={() => onChange((value) => ({ ...value, ultraMode: !value.ultraMode, level: value.ultraMode ? value.level : value.level ?? setup.account.wkLevel }))}
            className={`h-11 rounded-lg border px-5 text-sm font-black uppercase transition ${selection.ultraMode ? "border-fuchsia-700 bg-fuchsia-700 text-white" : "border-line bg-surface text-foreground hover:bg-surface-muted"}`}
          >
            {GAME_COPY.ultraMode}
          </button>
        ) : null}

        <button
          type="button"
          disabled={!playable || starting}
          onClick={onStart}
          className={`h-11 rounded-lg border px-7 text-sm font-black uppercase transition disabled:cursor-not-allowed disabled:opacity-45 ${accent.solid} hover:brightness-95`}
        >
          {starting ? GAME_COPY.starting : GAME_COPY.start}
        </button>
        {!rules.oncePerDay ? (
          <span className="text-xs font-bold text-foreground/50">{available} items</span>
        ) : null}
      </div>

      <p className="mt-3 text-xs font-semibold text-foreground/60">
        {dailyPlayed
          ? `${GAME_COPY.dailyPlayed}. ${GAME_COPY.dailyOneAttempt}`
          : !playable
            ? GAME_COPY.notEnoughItems
            : selection.kind === GAME_KINDS.daily
              ? GAME_COPY.dailyOneAttempt
              : selection.ultraMode
                ? "Keep going until the first wrong answer. Time and streak keep running."
                : available < gameRequiredCount(selection)
                  ? GAME_COPY.notEnoughItems
                  : GAME_COPY.scoreRule}
      </p>
    </section>
  );
}
