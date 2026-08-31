import { useMemo, type ReactNode } from "react";

import { orderGeoOptionsByPosition } from "@/lib/mapHandles";

import { GAME_KEY_LAYOUTS, type GameKind, type GameOptionTile, type GameQuestionPayload } from "@/lib/gameMode";
import { mapBoxIsZoomed } from "@/lib/japanPrefectures";
import { geoFocusBox } from "@/lib/geoMapFraming";
import { geoRegionIdFromSubjectId } from "@/lib/geoSubjectIds";
import { GEO_DATASETS, type CountryCode } from "@/lib/geoRegion";

/**
 * The country and region a place id belongs to.
 *
 * The id carries both, which is what lets a run be replayed without the
 * country having been stored beside it - and what this component needs, since
 * it was reading every id as a Japanese prefecture code and drawing Japan
 * underneath a question about Nova Scotia.
 */
function placeFromSubjectId(subjectId: number): { country: CountryCode; code: string } | null {
  const regionId = geoRegionIdFromSubjectId(subjectId);
  if (!regionId) return null;
  const [country, ...rest] = regionId.split("-");
  return { country: country as CountryCode, code: rest.join("-") };
}
import GameChoiceTile from "./GameChoiceTile";
import GameRunnerFrame from "./GameRunnerFrame";
import { GAME_COPY, MAP_TONES } from "./GameMode.constants";
import JapanMap, { type MapMark } from "./JapanMap";
import type { MapTone } from "./GameMode.types";
import { useGameAnswerKeys } from "./useGameAnswerKeys";
import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";

type Props = {
  question: GameQuestionPayload;
  questionIndex: number;
  questionTotal: number;
  kind: GameKind;
  endless: boolean;
  correctCount: number;
  elapsedMs: number;
  remainingMs: number | null;
  answering: boolean;
  feedback: { subjectId: number; correct: boolean } | null;
  error: string | null;
  onAnswer: (subjectId: number) => void;
  onExit: () => void;
};

/**
 * The board for Map mode.
 *
 * Read puts the country in the prompt with one prefecture lit up and the names on
 * tiles. Find reverses it: the name is the prompt and the candidates are places
 * on the map, tapped through numbered handles so a prefecture the size of Kagawa
 * is no harder to hit than Hokkaido.
 */
export default function GameMapRunner({
  question,
  questionIndex,
  questionTotal,
  kind,
  endless,
  correctCount,
  elapsedMs,
  remainingMs,
  answering,
  feedback,
  error,
  onAnswer,
  onExit,
}: Props) {
  return (
    <GameRunnerFrame
      questionIndex={questionIndex}
      questionTotal={questionTotal}
      kind={kind}
      endless={endless}
      correctCount={correctCount}
      elapsedMs={elapsedMs}
      remainingMs={remainingMs}
      error={error}
      onExit={onExit}
    >
      {({ inputBlocked }) => (
        <MapBoard
          question={question}
          answering={answering}
          feedback={feedback}
          inputBlocked={inputBlocked}
          onAnswer={onAnswer}
        />
      )}
    </GameRunnerFrame>
  );
}

function MapCard({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-col rounded-xl border border-line bg-surface-muted p-1.5 sm:p-2">
      <p className="shrink-0 pb-1 text-center text-[10px] font-bold uppercase text-foreground/60">{caption}</p>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function MapBoard({
  question,
  answering,
  feedback,
  inputBlocked,
  onAnswer,
}: {
  question: GameQuestionPayload;
  answering: boolean;
  feedback: { subjectId: number; correct: boolean } | null;
  inputBlocked: boolean;
  onAnswer: (subjectId: number) => void;
}) {
  const promptPlace = question.promptSubjectId === null ? null : placeFromSubjectId(question.promptSubjectId);
  const promptCode = promptPlace?.code ?? null;
  // No prompt place means Find: the name is the question and the map holds the choices.
  const finding = promptCode === null;

  /*
   * In Find, numbered across the map rather than by the shuffle that dealt
   * them. The handles carried each option's index in `question.options`, so a
   * round read 3 2 4 1 from left to right and pressing 1 pointed at nothing
   * you could pick out. Sorting by position makes them a row to read, and the
   * same order drives the keys, so 1 really is the leftmost handle.
   *
   * Read keeps the shuffled order. Its choices are names in a row, not places,
   * and sorting those by where each one sits would put a geographic hint into
   * a list that is supposed to be just four words.
   *
   * Memoised because the key handler lists it as a dependency: a fresh array
   * every render would tear down and re-bind the listener on every render.
   */
  const options = useMemo(
    () => (finding ? orderGeoOptionsByPosition(question.options) : question.options),
    [finding, question.options],
  );

  useGameAnswerKeys({
    options,
    // Prefecture names sit in one row and the map handles are numbered, so the
    // corner keys of the tile board would name nothing here.
    layout: GAME_KEY_LAYOUTS.sequence,
    disabled: answering || Boolean(feedback) || inputBlocked,
    onAnswer,
  });

  const optionCount = options.length;
  const tileGridClass = optionCount === 4
    ? "grid-cols-2 sm:grid-cols-4"
    : optionCount === 3 ? "grid-cols-3" : "grid-cols-2";
  /*
   * Read the country off the question rather than a prop: the tiles and the
   * prompt are all one country by construction, so the first id that resolves
   * settles it.
   */
  const country: CountryCode =
    promptPlace?.country
    ?? options.map((option) => placeFromSubjectId(option.subjectId)?.country).find(Boolean)
    ?? "JP";
  // Prefecture, state, or province and territory - the board knows which.
  const divisionName = GEO_DATASETS[country].divisionTypeName;

  const toneFor = (option: GameOptionTile, fallback: MapTone): MapTone => {
    if (feedback?.subjectId !== option.subjectId) return fallback;
    return feedback.correct ? MAP_TONES.correct : MAP_TONES.wrong;
  };

  // Read: the map is the question, the tiles are the names.
  if (!finding && promptCode !== null) {
    const marks: MapMark[] = [{ code: promptCode, tone: MAP_TONES.target, keyHint: "?" }];
    // The biggest prefectures read fine at national scale; a close-up of one of
    // those would just be the same picture twice.
    const showCloseUp = mapBoxIsZoomed(geoFocusBox(country, [promptCode]));
    return (
      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 sm:mt-4 sm:gap-4">
        <div className={`grid min-h-0 flex-1 gap-2 sm:gap-4 ${showCloseUp ? "grid-cols-2" : "grid-cols-1"}`}>
          <MapCard caption={GAME_COPY.nameHighlightedRegion(divisionName)}>
            <JapanMap marks={marks} country={country} showHandles />
          </MapCard>
          {showCloseUp ? (
            <MapCard caption={GAME_COPY.mapCloseUp}>
              <JapanMap marks={marks} country={country} focusCodes={[promptCode]} />
            </MapCard>
          ) : null}
        </div>
        <div className={`grid h-32 shrink-0 gap-2 sm:h-44 sm:gap-4 ${tileGridClass}`}>
          {options.map((option, index) => (
            <GameChoiceTile
              key={option.subjectId}
              option={option}
              keyHint={String(index + 1)}
              dense={optionCount >= 3}
              isTextAnswer
              showLevel={false}
              disabled={answering}
              feedback={feedback?.subjectId === option.subjectId ? feedback : null}
              onSelect={() => onAnswer(option.subjectId)}
            />
          ))}
        </div>
      </div>
    );
  }

  // Find: the name is the question, the map carries the choices.
  const marks: MapMark[] = options.flatMap((option, index) => {
    const place = placeFromSubjectId(option.subjectId);
    if (!place) return [];
    const code = place.code;
    return [{
      code,
      tone: toneFor(option, MAP_TONES.candidate),
      keyHint: String(index + 1),
      onSelect: () => onAnswer(option.subjectId),
    }];
  });

  return (
    <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 sm:mt-4 sm:gap-4">
      <div className="shrink-0 rounded-xl border border-line bg-surface-muted px-3 py-2 text-center sm:py-3">
        <p className="text-[10px] font-bold uppercase text-foreground/60">
          {GAME_COPY.chooseRegion(divisionName)} · {question.answerType}
        </p>
        <p translate="no" className={`mt-1 text-3xl font-black text-foreground ${JP_TEXT_CLASS} sm:text-5xl`}>
          {question.prompt}
        </p>
      </div>
      <div className="min-h-0 flex-1 rounded-xl border border-line bg-surface-muted p-1.5 sm:p-2">
        <JapanMap
          marks={marks}
          country={country}
          focusCodes={marks.map((mark) => mark.code)}
          showHandles
          disabled={answering || Boolean(feedback)}
        />
      </div>
    </div>
  );
}
