import type { LevelItem, RelatedReference } from "../../explorerTypes";
import type { VocabularyKanjiLink } from "../lib/levelExplorerItemDetails";

export type RelatedEntry = {
  subjectId: number;
  label: string;
  wkLevel: number | null;
  reading: string | null;
  meaning: string | null;
  fallbackKey?: string;
};

export type RelatedReferenceCardsProps = {
  items: RelatedReference[];
  large?: boolean;
  showEnglish: boolean;
  subjectById: Map<number, LevelItem>;
  fallbackType?: LevelItem["subjectType"];
  onJumpToRelatedSubject: (subjectId: number, targetLevel?: number | null) => Promise<void>;
};

export type VocabularyKanjiCardsProps = {
  links: VocabularyKanjiLink[];
  showEnglish: boolean;
  selectedSubjectId: number;
  onJumpToKanji: (subjectId: number, wkLevel: number | null) => Promise<void>;
};
