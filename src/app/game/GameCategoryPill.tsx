import { SubjectTypePill } from "@/app/users/[nickname]/shared/ExplorerPill";
import { GAME_KINDS, type GameCategory, type GameKind } from "@/lib/gameMode";
import { GAME_CATEGORY_LABELS, GAME_COPY, GAME_MIXED_PILL_CLASS } from "./GameMode.constants";

/**
 * What a run was played on, wherever a run is listed.
 *
 * Map mode records the vocabulary category so it inherits that accent, but it is
 * played on prefectures rather than WaniKani vocabulary, so labelling it by its
 * stored category would misdescribe the run.
 */
export default function GameCategoryPill({ kind, category }: { kind: GameKind; category: GameCategory }) {
  if (kind === GAME_KINDS.map) {
    return <span className={GAME_MIXED_PILL_CLASS}>{GAME_COPY.prefectures}</span>;
  }
  if (category === "mixed") {
    return <span className={GAME_MIXED_PILL_CLASS}>{GAME_CATEGORY_LABELS[category]}</span>;
  }
  return <SubjectTypePill type={category}>{GAME_CATEGORY_LABELS[category]}</SubjectTypePill>;
}
