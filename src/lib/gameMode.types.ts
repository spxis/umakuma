/*
 * The shapes a game hands across the wire: a pool item, a question, a run
 * summary, a board row. Pure declarations, kept beside gameMode.ts so the
 * rules file stays under the size gate; gameMode re-exports them, the way it
 * already folds in gameBoard.
 */
import type { SubjectType } from "@/lib/domainConstants";
import type { GameChoiceCount } from "@/lib/gameBoard";
import type { GameCategory, GameAnswerType, GameDirection, GameKind } from "@/lib/gameMode";

export type GamePoolItem = {
  assignmentId: number;
  subjectId: number;
  subjectType: SubjectType;
  level: number;
  srsStage: number;
  startedAt: string | null;
};

export type GameOption = {
  subjectId: number;
  subjectType: SubjectType;
  level: number;
  characters: string;
  primaryMeaning: string | null;
  primaryReading: string | null;
};

/** A tile as rendered: an option plus the text it displays for this direction. */
export type GameOptionTile = GameOption & { label: string };

export type GameQuestionPayload = {
  id: string;
  position: number;
  answerType: GameAnswerType;
  prompt: string;
  /**
   * Set when the prompt is a shape rather than text, so the client knows what to
   * draw. Only Map mode's Read direction uses it, where the prompt is the
   * highlighted prefecture and the tiles carry the names.
   */
  promptSubjectId: number | null;
  /** Two, three or four tiles, in display order. */
  options: GameOptionTile[];
};

export type GameRunSummary = {
  id: string;
  accountId: string;
  kind: GameKind;
  batchSize: number;
  timeLimitMs: number | null;
  level: number | null;
  category: GameCategory;
  hardMode: boolean;
  choiceCount: GameChoiceCount;
  direction: GameDirection;
  ultraMode: boolean;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  currentStreak: number;
  bestStreak: number;
  score: number;
  durationMs: number | null;
  status: "active" | "completed" | "abandoned";
  startedAt: string;
  completedAt: string | null;
};

export type GameLeaderboardEntry = {
  /** Which country a Map run was played on; null for every other game. */
  mapCountry?: string | null;
  runId: string;
  accountId: string;
  nickname: string;
  wkUsername: string;
  kind: GameKind;
  category: GameCategory;
  hardMode: boolean;
  choiceCount: GameChoiceCount;
  direction: GameDirection;
  ultraMode: boolean;
  batchSize: number;
  level: number | null;
  score: number;
  durationMs: number;
  bestStreak: number;
  correctCount: number;
  questionCount: number;
  completedAt: string;
  completedDatePst: string;
};
