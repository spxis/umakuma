import type {
  NewsKanjiCapBasis,
  NewsKanjiCapGrade,
  NewsKanjiCapJlpt,
  NewsKanjiCapWk,
} from "./newsReadingPrefs";

export type NewsTokenizedTextProps = {
  text: string;
  emphasizeKanji: boolean;
  kanjiCapBasis: NewsKanjiCapBasis;
  kanjiCapJlpt: NewsKanjiCapJlpt;
  kanjiCapWk: NewsKanjiCapWk;
  kanjiCapGrade: NewsKanjiCapGrade;
  largeArticleMode: boolean;
};
