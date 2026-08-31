import type { GameKind } from "@/lib/gameMode";
import {
  GAME_COPY,
  GAME_KIND_ACCENT,
  GAME_KIND_EMOJI,
  GAME_KIND_LABELS,
  GAME_KIND_RULE_COPY,
  GAME_KIND_TAGLINES,
} from "./GameMode.constants";
import GameCardActivity from "./GameCardActivity";
import type { GameHubCard } from "./GameMode.types";

type Props = {
  cards: GameHubCard[];
  selectedKind: GameKind;
  onSelect: (kind: GameKind) => void;
};

export default function GamesHub({ cards, selectedKind, onSelect }: Props) {
  return (
    <section aria-label="Choose a game" className="border-y border-line bg-surface/70 px-3 py-5 sm:px-5 sm:py-6">
      <div className="mb-4">
        <h2 className="text-2xl font-black text-foreground sm:text-3xl">{GAME_COPY.hubTitle}</h2>
        <p className="mt-1 text-sm font-semibold text-foreground/60">{GAME_COPY.hubSubtitle}</p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const accent = GAME_KIND_ACCENT[card.kind];
          const isSelected = card.kind === selectedKind;
          return (
            <li key={card.kind} className="min-w-0">
              <button
                type="button"
                onClick={() => onSelect(card.kind)}
                disabled={!card.playable}
                aria-current={isSelected ? "true" : undefined}
                className={`flex h-full w-full min-w-0 flex-col rounded-2xl border-2 bg-surface p-4 text-left transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:hover:bg-surface sm:p-5 ${isSelected ? accent.border : "border-line"}`}
              >
                <span className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-2">
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span aria-hidden="true" className="shrink-0 text-2xl leading-none">{GAME_KIND_EMOJI[card.kind]}</span>
                    <span className="min-w-0">
                      <span className={`block truncate text-lg font-black ${accent.text}`}>{GAME_KIND_LABELS[card.kind]}</span>
                      <span className="block truncate text-xs font-bold text-foreground/60">{GAME_KIND_TAGLINES[card.kind]}</span>
                    </span>
                  </span>
                  {card.statusLabel ? (
                    <span className="max-w-full rounded-full border border-line bg-surface-muted px-2.5 py-1 text-[10px] font-black uppercase text-foreground/65">
                      {card.statusLabel}
                    </span>
                  ) : null}
                </span>
                <span className="mt-3 block flex-1 text-sm font-semibold leading-snug text-foreground/70">
                  {GAME_KIND_RULE_COPY[card.kind]}
                </span>
                <GameCardActivity activity={card.activity} accentText={accent.text} />
                <span className={`mt-4 inline-flex h-10 min-w-0 items-center justify-center rounded-full border px-5 text-center text-sm font-black ${card.playable ? accent.solid : "border-line bg-surface-muted text-foreground/50"}`}>
                  {card.playable
                    ? GAME_COPY.play
                    : card.blockedReason === "played-today"
                      ? GAME_COPY.dailyComeBack
                      : card.blockedReason === "needs-wanikani"
                        ? GAME_COPY.needsWanikani
                        : GAME_COPY.notEnough}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
