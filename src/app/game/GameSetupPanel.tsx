import { GAME_CHOICE_COUNTS, GAME_KINDS, GAME_PRACTICE_LIST_VALUES, gameKindRules } from "@/lib/gameMode";
import { GAME_DIRECTION_VALUES, gameAnswerModesFor, type GameAnswerMode, type GameChoiceCount, type GameDirection, type GamePracticeList } from "@/lib/gameMode";
import SegmentedControl from "@/app/shared/SegmentedControl";
import StudyTagListsButton from "@/app/shared/StudyTagListsButton";
import {
  GAME_CATEGORY_LABELS,
  GAME_ANSWER_MODE_LABELS,
  GAME_MAP_DIRECTION_HINTS,
  GAME_DIRECTION_HINTS,
  GAME_DIRECTION_LABELS,
  GAME_COPY,
  GAME_KIND_ACCENT,
  GAME_KIND_EMOJI,
  GAME_KIND_LABELS,
  GAME_KIND_RULE_COPY,
  GAME_PRACTICE_LIST_HINTS,
  GAME_PRACTICE_LIST_LABELS,
  gameTimeLimitLabel,
} from "./GameMode.constants";
import GameCornersPicker from "./GameCornersPicker";
import GameModeToggle from "./GameModeToggle";
import { gameAvailableCount, gameRequiredCount, gameSelectionAvailableCount, gameSelectionIsPlayable } from "./gameHubCards";
import type { GameSelection, GameSetupResponse } from "./GameMode.types";

type Props = {
  accountId: string;
  setup: GameSetupResponse;
  selection: GameSelection;
  starting: boolean;
  onChange: (update: (value: GameSelection) => GameSelection) => void;
  onStart: () => void;
  onBack: () => void;
};

const FIELD_CLASS = "mt-2 h-11 w-full rounded-full border border-line bg-surface px-4 text-sm font-black text-foreground";
const LABEL_CLASS = "text-xs font-bold uppercase text-foreground/60";

export default function GameSetupPanel({ accountId, setup, selection, starting, onChange, onStart, onBack }: Props) {
  const rules = gameKindRules(selection.kind);
  const accent = GAME_KIND_ACCENT[selection.kind];
  const available = gameSelectionAvailableCount(setup, selection);
  const playable = gameSelectionIsPlayable(setup, selection);
  const dailyPlayed = selection.kind === GAME_KINDS.daily && setup.availability.daily.playedToday;
  // Daily is fixed for everyone and Shiritori always chains words.
  const supportsDirection = rules.usesDirection;
  // Map mode's directions act on a prefecture rather than a glyph.
  const directionHints = selection.kind === GAME_KINDS.map ? GAME_MAP_DIRECTION_HINTS : GAME_DIRECTION_HINTS;

  return (
    <section aria-label="Game setup" className="border-y border-line bg-surface/70 px-3 py-5 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="text-3xl leading-none">{GAME_KIND_EMOJI[selection.kind]}</span>
          <div className="min-w-0">
            <h2 className={`text-xl font-black sm:text-2xl ${accent.text}`}>{GAME_KIND_LABELS[selection.kind]}</h2>
            <p className="text-xs font-semibold text-foreground/60">
              {GAME_KIND_RULE_COPY[selection.kind]}
              {supportsDirection ? ` ${directionHints[selection.direction]}` : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="h-9 shrink-0 rounded-full border border-line bg-surface px-4 text-sm font-black text-foreground hover:bg-surface-muted"
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
                  {GAME_CATEGORY_LABELS[category]} ({gameAvailableCount(setup, selection.kind, rules.usesLevel ? selection.level : null, category, selection.practiceList)})
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {supportsDirection ? (
          <label className={LABEL_CLASS}>{GAME_COPY.direction}
            <select
              value={selection.direction}
              onChange={(event) => onChange((value) => ({ ...value, direction: event.target.value as GameDirection }))}
              className={FIELD_CLASS}
            >
              {GAME_DIRECTION_VALUES.map((value) => (
                <option key={value} value={value}>{GAME_DIRECTION_LABELS[value]}</option>
              ))}
            </select>
          </label>
        ) : null}

        {rules.usesAnswerMode ? (
          <label className={LABEL_CLASS}>{GAME_COPY.answerWith}
            <select
              value={selection.answerMode}
              onChange={(event) => onChange((value) => ({ ...value, answerMode: event.target.value as GameAnswerMode }))}
              className={FIELD_CLASS}
            >
              {gameAnswerModesFor(selection.kind).map((value) => (
                <option key={value} value={value}>{GAME_ANSWER_MODE_LABELS[value]}</option>
              ))}
            </select>
          </label>
        ) : null}

        {rules.usesHardMode && !rules.usesCornersBoard ? (
          <label className={LABEL_CLASS}>{GAME_COPY.choices}
            <select
              value={selection.choiceCount}
              onChange={(event) => onChange((value) => ({ ...value, choiceCount: Number(event.target.value) as GameChoiceCount }))}
              className={FIELD_CLASS}
            >
              {GAME_CHOICE_COUNTS.map((count) => <option key={count} value={count}>{count}</option>)}
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

      {(rules.usesHardMode && rules.usesCornersBoard) || rules.usesPracticeList ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {rules.usesHardMode && rules.usesCornersBoard ? (
            <GameCornersPicker
              choiceCount={selection.choiceCount}
              accentClass={accent.solid}
              onChange={(choiceCount) => onChange((value) => ({ ...value, choiceCount }))}
            />
          ) : null}

          {rules.usesPracticeList ? (
            <div>
              <p className="text-xs font-bold uppercase text-foreground/60">{GAME_COPY.practiceList}</p>
              <SegmentedControl
                ariaLabel={GAME_COPY.practiceList}
                size="md"
                className="mt-2 inline-flex flex-wrap items-center gap-1 rounded-full border border-line bg-surface p-1"
                value={selection.practiceList}
                onChange={(practiceList: GamePracticeList) => onChange((value) => ({ ...value, practiceList }))}
                options={GAME_PRACTICE_LIST_VALUES.map((list) => ({
                  value: list,
                  label: `${GAME_PRACTICE_LIST_LABELS[list]} · ${gameAvailableCount(setup, selection.kind, null, selection.category, list)}`,
                  title: GAME_PRACTICE_LIST_HINTS[list],
                  activeClassName: `border ${accent.solid}`,
                }))}
              />
              <p className="mt-1 text-[11px] font-semibold text-foreground/55">{GAME_PRACTICE_LIST_HINTS[selection.practiceList]}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {rules.usesUltraMode ? (
          <GameModeToggle
            label={GAME_COPY.ultraMode}
            checked={selection.ultraMode}
            onChange={(checked) => onChange((value) => ({
              ...value,
              ultraMode: checked,
              level: checked ? value.level ?? setup.account.wkLevel : value.level,
            }))}
            accentClass="accent-fuchsia-700"
          />
        ) : null}

        <button
          type="button"
          disabled={!playable || starting}
          onClick={onStart}
          className={`h-11 rounded-full border px-7 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${accent.solid} hover:brightness-95`}
        >
          {starting ? GAME_COPY.starting : GAME_COPY.start}
        </button>
        <StudyTagListsButton accountId={accountId} />
        {!rules.oncePerDay ? (
          <span className="text-xs font-bold text-foreground/50">{available} items</span>
        ) : null}
      </div>

      <p className="mt-3 text-xs font-semibold text-foreground/60">
        {dailyPlayed
          ? `${GAME_COPY.dailyPlayed}. ${GAME_COPY.dailyOneAttempt}`
          : !playable
            ? rules.usesPracticeList && available === 0
              ? GAME_COPY.practiceEmpty
              : GAME_COPY.notEnoughItems
            : selection.kind === GAME_KINDS.daily
              ? GAME_COPY.dailyOneAttempt
              : selection.ultraMode
                ? GAME_COPY.ultraRule
                : available < gameRequiredCount(selection)
                  ? GAME_COPY.notEnoughItems
                  : GAME_COPY.scoreRule}
      </p>
    </section>
  );
}
