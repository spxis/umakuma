import type { GameKind, GameQuestionPayload } from "@/lib/gameMode";
import GameChoiceTile from "./GameChoiceTile";
import GameRunnerFrame from "./GameRunnerFrame";
import { GAME_COPY } from "./GameMode.constants";
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

const CHAIN_ANSWER_TYPE = "chain";

export default function GameRunner({
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
  const optionCount = question.options.length;
  const isQuad = optionCount === 4;
  const isChain = question.answerType === CHAIN_ANSWER_TYPE;
  // In Read mode the tiles carry text and the prompt carries the glyph.
  const isTextAnswer = question.options.some((option) => option.label !== option.characters);
  const rowHint = (index: number) => (index === 0 ? "←" : index === optionCount - 1 ? "→" : "↑");

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
      {({ inputBlocked, clockUrgent }) => (
        <GameBoard
          question={question}
          optionCount={optionCount}
          isQuad={isQuad}
          isChain={isChain}
          isTextAnswer={isTextAnswer}
          answering={answering}
          feedback={feedback}
          inputBlocked={inputBlocked}
          clockUrgent={clockUrgent}
          rowHint={rowHint}
          onAnswer={onAnswer}
        />
      )}
    </GameRunnerFrame>
  );
}

function GameBoard({
  question,
  optionCount,
  isQuad,
  isChain,
  isTextAnswer,
  answering,
  feedback,
  inputBlocked,
  clockUrgent,
  rowHint,
  onAnswer,
}: {
  question: GameQuestionPayload;
  optionCount: number;
  isQuad: boolean;
  isChain: boolean;
  isTextAnswer: boolean;
  answering: boolean;
  feedback: { subjectId: number; correct: boolean } | null;
  inputBlocked: boolean;
  clockUrgent: boolean;
  rowHint: (index: number) => string;
  onAnswer: (subjectId: number) => void;
}) {
  useGameAnswerKeys({
    options: question.options,
    disabled: answering || Boolean(feedback) || inputBlocked,
    onAnswer,
  });

  const tile = (option: (typeof question.options)[number], keyHint: string) => (
    <GameChoiceTile
      key={option.subjectId}
      option={option}
      keyHint={keyHint}
      optionCount={optionCount}
      isTextAnswer={isTextAnswer}
      disabled={answering}
      feedback={feedback?.subjectId === option.subjectId ? feedback : null}
      onSelect={() => onAnswer(option.subjectId)}
    />
  );

  const prompt = (
    <div className={`flex flex-1 flex-col items-center justify-center rounded-xl border px-3 py-3 text-center sm:px-5 sm:py-4 ${clockUrgent ? "border-red-500 bg-red-50" : "border-line bg-surface-muted"}`}>
      <p className="text-[10px] font-bold uppercase text-foreground/60">
        {isChain ? GAME_COPY.chooseChain : isTextAnswer ? `${GAME_COPY.chooseAnswer} · ${question.answerType}` : `${GAME_COPY.chooseMatch} · ${question.answerType}`}
      </p>
      <p className={`mt-1 font-black text-foreground ${
        isChain || isTextAnswer
          ? "text-4xl [font-family:var(--font-jp-current)] sm:text-6xl"
          : "text-2xl sm:text-4xl"
      }`}>
        {question.prompt}
      </p>
    </div>
  );

  if (isQuad) {
    // Two above, two below, and the word they are answering in between.
    return (
      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 sm:mt-4 sm:gap-4">
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 sm:gap-4">
          {question.options.slice(0, 2).map((option, index) => tile(option, String(index + 1)))}
        </div>
        <div className="shrink-0">{prompt}</div>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 sm:gap-4">
          {question.options.slice(2).map((option, index) => tile(option, String(index + 3)))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`mt-2 grid h-80 min-h-80 shrink-0 gap-2 sm:mt-4 sm:gap-5 ${optionCount === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {question.options.map((option, index) => tile(option, rowHint(index)))}
      </div>
      <div className="mt-2 flex min-h-0 flex-1 flex-col sm:mt-4">{prompt}</div>
    </>
  );
}
