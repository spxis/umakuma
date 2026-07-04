import type { ReactNode } from "react";

import type { NewsArticle, NewsArticleBlock } from "@/lib/news/newsTypes";

import type {
  NewsKanjiCapBasis,
  NewsKanjiCapGrade,
  NewsKanjiCapJlpt,
  NewsKanjiCapWk,
} from "./newsReadingPrefs";

export type ArticlePanelTab = "article" | "kanji" | "history" | "stats";

export type NewsArticleViewProps = {
  article: NewsArticle;
  userWkLevel: number | null;
  activeTab: ArticlePanelTab;
  onTabChangeAction: (next: ArticlePanelTab) => void;
  historyCount: number;
  statsCount: number;
  historyPanel: ReactNode;
  statsPanel: ReactNode;
};

export type ArticleTabsProps = {
  activeTab: ArticlePanelTab;
  onChange: (next: ArticlePanelTab) => void;
  kanjiCount: number;
  historyCount: number;
  statsCount: number;
};

export type BlockViewProps = {
  block: NewsArticleBlock;
  emphasizeKanji: boolean;
  kanjiCapBasis: NewsKanjiCapBasis;
  kanjiCapJlpt: NewsKanjiCapJlpt;
  kanjiCapWk: NewsKanjiCapWk;
  kanjiCapGrade: NewsKanjiCapGrade;
  largeArticleMode: boolean;
};

export type RenderItem = { kind: "block"; block: NewsArticleBlock } | { kind: "ad" };
