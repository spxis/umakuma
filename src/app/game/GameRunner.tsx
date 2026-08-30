import type { GameKind, GameQuestionPayload } from "@/lib/gameMode";
import GameCornersBoard from "./GameCornersBoard";
import GameRunnerFrame from "./GameRunnerFrame";

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
  const isChain = question.answerType === CHAIN_ANSWER_TYPE;
  // In Read mode the tiles carry text and the prompt carries the glyph.
  const isTextAnswer = question.options.some((option) => option.label !== option.characters);

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
        <GameCornersBoard
          question={question}
          isChain={isChain}
          isTextAnswer={isTextAnswer}
          answering={answering}
          feedback={feedback}
          inputBlocked={inputBlocked}
          clockUrgent={clockUrgent}
          onAnswer={onAnswer}
        />
      )}
    </GameRunnerFrame>
  );
}
