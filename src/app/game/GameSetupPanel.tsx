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

/**
 * Setup is a dense field row, not a stack of full-width bands.
 *
 * Every control is one of at most seven, and which ones appear depends on the
 * game, so they share a grid that reflows rather than each owning a row. The
 * labels sit tight above compact fields; the rules line and the item count are
 * folded into one footer instead of three separate paragraphs.
 */
const LABEL_CLASS = "mb-1 block truncate text-[10px] font-black uppercase tracking-wide text-foreground/50";
const FIELD_CLASS = "h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-sm font-bold text-foreground";

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

  const footer = dailyPlayed
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
            : GAME_COPY.scoreRule;

  return (
    <section aria-label="Game setup" className="border-y border-line bg-surface/70 px-3 py-4 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <span aria-hidden="true" className="mt-0.5 shrink-0 text-2xl leading-none">{GAME_KIND_EMOJI[selection.kind]}</span>
          <div className="min-w-0">
            <h2 className={`text-lg font-black leading-tight sm:text-xl ${accent.text}`}>{GAME_KIND_LABELS[selection.kind]}</h2>
            <p className="text-[11px] font-semibold leading-snug text-foreground/55">
              {GAME_KIND_RULE_COPY[selection.kind]}
              {supportsDirection ? ` ${directionHints[selection.direction]}` : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="h-8 shrink-0 rounded-full border border-line bg-surface px-3.5 text-xs font-black text-foreground hover:bg-surface-muted"
        >
          {GAME_COPY.changeGame}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 items-start gap-x-2.5 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {rules.usesBatchSize && !selection.ultraMode ? (
          <label>
            <span className={LABEL_CLASS}>{GAME_COPY.questions}</span>
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
          <label>
            <span className={LABEL_CLASS}>{GAME_COPY.level}</span>
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
          <label>
            <span className={LABEL_CLASS}>{GAME_COPY.category}</span>
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
          <label>
            <span className={LABEL_CLASS}>{GAME_COPY.direction}</span>
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
          <label>
            <span className={LABEL_CLASS}>{GAME_COPY.answerWith}</span>
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
          <label>
            <span className={LABEL_CLASS}>{GAME_COPY.choices}</span>
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
          <label>
            <span className={LABEL_CLASS}>{GAME_COPY.timeLimit}</span>
            <select
              value={selection.timeLimitMs}
              onChange={(event) => onChange((value) => ({ ...value, timeLimitMs: Number(event.target.value) as GameSelection["timeLimitMs"] }))}
              className={FIELD_CLASS}
            >
              {setup.timeLimitsMs.map((limit) => <option key={limit} value={limit}>{gameTimeLimitLabel(limit)}</option>)}
            </select>
          </label>
        ) : null}

        {rules.usesHardMode && rules.usesCornersBoard ? (
          <GameCornersPicker
            choiceCount={selection.choiceCount}
            accentClass={accent.solid}
            labelClass={LABEL_CLASS}
            onChange={(choiceCount) => onChange((value) => ({ ...value, choiceCount }))}
          />
        ) : null}

        {rules.usesPracticeList ? (
          <div className="col-span-2 sm:col-span-3">
            <span className={LABEL_CLASS}>{GAME_COPY.practiceList}</span>
            <SegmentedControl
              ariaLabel={GAME_COPY.practiceList}
              size="sm"
              className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-line bg-surface p-1"
              value={selection.practiceList}
              onChange={(practiceList: GamePracticeList) => onChange((value) => ({ ...value, practiceList }))}
              options={GAME_PRACTICE_LIST_VALUES.map((list) => ({
                value: list,
                label: `${GAME_PRACTICE_LIST_LABELS[list]} · ${gameAvailableCount(setup, selection.kind, null, selection.category, list)}`,
                title: GAME_PRACTICE_LIST_HINTS[list],
                activeClassName: `border ${accent.solid}`,
              }))}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!playable || starting}
          onClick={onStart}
          className={`h-10 rounded-full border px-6 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${accent.solid} hover:brightness-95`}
        >
          {starting ? GAME_COPY.starting : GAME_COPY.start}
        </button>

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

        <StudyTagListsButton accountId={accountId} />

        {!rules.oncePerDay ? (
          <span className="text-xs font-bold text-foreground/50">{available} items</span>
        ) : null}

        <p className="w-full text-[11px] font-semibold text-foreground/55 sm:ml-auto sm:w-auto sm:flex-1 sm:text-right">
          {footer}
        </p>
      </div>
    </section>
  );
}
