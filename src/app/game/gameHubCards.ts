import {
  GAME_KINDS,
  gameKindRules,
  type GameCategory,
  type GameKind,
} from "@/lib/gameMode";
import { GAME_COPY } from "./GameMode.constants";
import type { GameBlockedReason, GameHubCard, GameSelection, GameSetupResponse } from "./GameMode.types";

/** Items a kind can actually draw from, given the level/category the player picked. */
export function gameAvailableCount(
  setup: GameSetupResponse,
  kind: GameKind,
  level: number | null,
  category: GameCategory,
): number {
  if (kind === GAME_KINDS.shiritori) return setup.availability.shiritori.available;
  if (kind === GAME_KINDS.daily) return setup.availability.daily.playedToday ? 0 : 1;

  // Revenge ignores the level filter but still honors the category.
  const resolvedCategory = gameKindRules(kind).fixedCategory ?? category;
  if (kind === GAME_KINDS.revenge) return setup.totalCounts[resolvedCategory] ?? 0;
  if (level === null) return setup.totalCounts[resolvedCategory] ?? 0;
  return setup.countsByLevel[level]?.[resolvedCategory] ?? 0;
}

/** The smallest pool that can produce a round for this selection. */
export function gameRequiredCount(selection: GameSelection): number {
  const rules = gameKindRules(selection.kind);
  const minimumItems = rules.usesHardMode ? selection.choiceCount : 2;
  if (selection.kind === GAME_KINDS.daily) return 1;
  if (!rules.usesBatchSize || selection.ultraMode || selection.batchSize === "all") return minimumItems;
  return Math.max(minimumItems, selection.batchSize);
}

export function gameSelectionIsPlayable(setup: GameSetupResponse, selection: GameSelection): boolean {
  if (selection.kind === GAME_KINDS.daily && setup.availability.daily.playedToday) return false;
  return gameAvailableCount(setup, selection.kind, selection.level, selection.category)
    >= gameRequiredCount(selection);
}

function statusLabel(setup: GameSetupResponse, kind: GameKind, available: number): string | null {
  if (kind === GAME_KINDS.daily) {
    return setup.availability.daily.playedToday ? GAME_COPY.dailyPlayed : GAME_COPY.dailyReady;
  }
  if (kind === GAME_KINDS.revenge) {
    const { troubleCount } = setup.availability.revenge;
    return troubleCount > 0 ? `${troubleCount} tagged trouble` : `${available} items ranked`;
  }
  if (kind === GAME_KINDS.shiritori) return `${available} chainable words`;
  return `${available} items`;
}

/**
 * Builds one card per game for the hub, using the player's persisted level and
 * category so the counts shown match what pressing Play would actually start.
 */
export function buildGameHubCards(setup: GameSetupResponse, selection: GameSelection): GameHubCard[] {
  return setup.kinds.map((kind) => {
    const rules = gameKindRules(kind);
    const level = rules.usesLevel ? selection.level : null;
    const available = gameAvailableCount(setup, kind, level, selection.category);
    const minimumItems = rules.usesHardMode ? selection.choiceCount : 2;
    const required = kind === GAME_KINDS.daily ? 1 : minimumItems;
    const playedToday = kind === GAME_KINDS.daily && setup.availability.daily.playedToday;
    const playable = !playedToday && available >= required;
    const blockedReason: GameBlockedReason | null = playable
      ? null
      : playedToday
        ? "played-today"
        : "not-enough-items";

    return {
      kind,
      available,
      minimumItems,
      playable,
      blockedReason,
      statusLabel: statusLabel(setup, kind, available),
    };
  });
}
