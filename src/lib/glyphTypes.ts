import type { SubjectType, WkStatus } from "@/lib/domainConstants";
import type { JlptMeta } from "@/lib/jlptTypes";
import type { ConfusableWarning } from "@/lib/kanjiConfusableWarning.types";

export type RelatedReference = {
  subjectId: number;
  label: string;
  wkLevel?: number | null;
  successRate?: number;
  reading?: string | null;
  meaning?: string | null;
};

export type LevelItem = {
  subjectId: number;
  subjectType?: SubjectType;
  wkLevel?: number;
  /** Ours, where the feed is ours. Drawn as UK n beside WK n, never as either. */
  ukLevel?: number | null;
  /** Whose meanings and readings these are, for the credit line under them. Absent means WaniKani's. */
  contentSource?: "wanikani" | "kanjidic2" | "radkfile";
  /*
   * WaniKani's own name for a radical, where they teach it and the member has
   * connected an account. A member who spent two years learning this shape as
   * *toe* is shown "divining" by our curriculum and has no way to know it is
   * the same radical; this is how the two are said in one place.
   *
   * Their invented content, so it is filled server-side only for a connected
   * account and is absent - not empty - for everybody else. `UkSubject` never
   * holds it.
   */
  wanikaniName?: string | null;
  successRate?: number;
  characters: string;
  meanings: string[];
  readings?: string[];
  primaryReadings?: string[];
  radicals?: RelatedReference[];
  /*
   * WaniKani's own look-alike list, still what the level browser draws.
   *
   * The study surfaces draw `confusables` instead: theirs is a list of similar
   * characters and ours is a warning, gated to the twins this member can
   * actually act on. Moving the browser onto the same source is filed work,
   * not an accident.
   */
  visuallySimilar?: RelatedReference[];
  /** The look-alike warning, already gated - see `confusableWarnings`. */
  confusables?: ConfusableWarning[];
  usedInVocabulary?: RelatedReference[];
  componentKanji?: RelatedReference[];
  meaningExplanation?: string;
  readingExplanation?: string;
  jlptLevel?: number | null;
  jlptMeta?: JlptMeta | null;
  srsStage: number;
  status: WkStatus;
  startedAt?: string | null;
  passedAt?: string | null;
  availableAt: string | null;
  isInjectedTrouble?: boolean;
  studyTags?: {
    favorite: boolean;
    trouble: boolean;
    burned?: boolean;
  };
};
