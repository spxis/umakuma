import { SUBJECT_TYPES } from "@/lib/domainConstants";
import type { GameOptionTile } from "@/lib/gameMode";

type Props = {
  option: GameOptionTile;
  /** The arrow or number that answers with this tile. */
  keyHint: string;
  optionCount: number;
  /** Text answers wrap; glyph answers are set large in the Japanese face. */
  isTextAnswer: boolean;
  /** Hidden for items outside the WaniKani level ladder, such as prefectures. */
  showLevel?: boolean;
  disabled: boolean;
  feedback: { correct: boolean } | null;
  onSelect: () => void;
};

function choiceTone(subjectType: string): string {
  if (subjectType === SUBJECT_TYPES.radical) return "border-radical/60 bg-radical/15 text-radical";
  if (subjectType === SUBJECT_TYPES.kanji) return "border-kanji/60 bg-kanji/15 text-kanji";
  return "border-vocabulary/60 bg-vocabulary/15 text-vocabulary";
}

export default function GameChoiceTile({
  option,
  keyHint,
  optionCount,
  isTextAnswer,
  showLevel = true,
  disabled,
  feedback,
  onSelect,
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`relative flex min-w-0 items-center justify-center overflow-hidden rounded-2xl border p-2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40 disabled:cursor-wait sm:p-5 ${choiceTone(option.subjectType)} ${feedback ? (feedback.correct ? "ring-8 ring-emerald-500 bg-emerald-100" : "ring-8 ring-red-500 bg-red-100") : "hover:brightness-95"}`}
    >
      <span aria-hidden="true" className="absolute left-2 top-2 text-lg font-black text-foreground/50 sm:left-4 sm:top-4">{keyHint}</span>
      {showLevel ? (
        <span className="absolute right-2 top-2 rounded-full border border-line bg-surface/90 px-2 py-1 text-[10px] font-bold text-foreground sm:right-4 sm:top-4 sm:text-xs">L{option.level}</span>
      ) : null}
      <span className={`text-center font-black leading-tight ${
        isTextAnswer
          ? `break-words ${optionCount >= 3 ? "text-xl sm:text-3xl" : "text-2xl sm:text-5xl"}`
          : `break-all [font-family:var(--font-jp-current)] leading-none ${optionCount >= 3 ? "text-4xl sm:text-6xl" : "text-5xl sm:text-9xl"}`
      }`}>
        {option.label}
      </span>
    </button>
  );
}
