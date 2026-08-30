import type { ReactNode } from "react";

import type { GameKind, GameOptionTile, GameQuestionPayload } from "@/lib/gameMode";
import { mapBoxIsZoomed, prefectureCodeFromSubjectId, prefectureFocusBox } from "@/lib/japanPrefectures";
import GameChoiceTile from "./GameChoiceTile";
import GameRunnerFrame from "./GameRunnerFrame";
import { GAME_COPY, MAP_TONES } from "./GameMode.constants";
import JapanMap, { type MapMark } from "./JapanMap";
import type { MapTone } from "./GameMode.types";
import { useGameAnswerKeys } from "./useGameAnswerKeys";

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
  useGameAnswerKeys({
    options: question.options,
    disabled: answering || Boolean(feedback) || inputBlocked,
    onAnswer,
  });

  const optionCount = question.options.length;
  const tileGridClass = optionCount === 4
    ? "grid-cols-2 sm:grid-cols-4"
    : optionCount === 3 ? "grid-cols-3" : "grid-cols-2";
  const promptCode = question.promptSubjectId === null ? null : prefectureCodeFromSubjectId(question.promptSubjectId);

  const toneFor = (option: GameOptionTile, fallback: MapTone): MapTone => {
    if (feedback?.subjectId !== option.subjectId) return fallback;
    return feedback.correct ? MAP_TONES.correct : MAP_TONES.wrong;
  };

  // Read: the map is the question, the tiles are the names.
  if (promptCode !== null) {
    const marks: MapMark[] = [{ code: promptCode, tone: MAP_TONES.target, keyHint: "?" }];
    // The biggest prefectures read fine at national scale; a close-up of one of
    // those would just be the same picture twice.
    const showCloseUp = mapBoxIsZoomed(prefectureFocusBox([promptCode]));
    return (
      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 sm:mt-4 sm:gap-4">
        <div className={`grid min-h-0 flex-1 gap-2 sm:gap-4 ${showCloseUp ? "grid-cols-2" : "grid-cols-1"}`}>
          <MapCard caption={GAME_COPY.choosePrefectureName}>
            <JapanMap marks={marks} showHandles />
          </MapCard>
          {showCloseUp ? (
            <MapCard caption={GAME_COPY.mapCloseUp}>
              <JapanMap marks={marks} focusCodes={[promptCode]} />
            </MapCard>
          ) : null}
        </div>
        <div className={`grid h-32 shrink-0 gap-2 sm:h-44 sm:gap-4 ${tileGridClass}`}>
          {question.options.map((option, index) => (
            <GameChoiceTile
              key={option.subjectId}
              option={option}
              keyHint={String(index + 1)}
              optionCount={optionCount}
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
  const marks: MapMark[] = question.options.flatMap((option, index) => {
    const code = prefectureCodeFromSubjectId(option.subjectId);
    if (code === null) return [];
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
          {GAME_COPY.choosePrefecture} · {question.answerType}
        </p>
        <p className="mt-1 text-3xl font-black text-foreground [font-family:var(--font-jp-current)] sm:text-5xl">
          {question.prompt}
        </p>
      </div>
      <div className="min-h-0 flex-1 rounded-xl border border-line bg-surface-muted p-1.5 sm:p-2">
        <JapanMap
          marks={marks}
          focusCodes={marks.map((mark) => mark.code)}
          showHandles
          disabled={answering || Boolean(feedback)}
        />
      </div>
    </div>
  );
}
