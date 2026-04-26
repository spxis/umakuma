"use client";

import { useEffect, useState } from "react";

import type { NewsArticle, NewsArticleBlock } from "@/lib/news/newsTypes";

import NewsCacheBadge from "./NewsCacheBadge";
import NewsReadingControls from "./NewsReadingControls";
import NewsTokenizedText from "./NewsTokenizedText";
import {
  DEFAULT_NEWS_READING_PREFS,
  readReadingPrefs,
  textSizeClass,
  writeReadingPrefs,
  type NewsReadingPrefs,
} from "./newsReadingPrefs";

const AD_INTERVAL = 4;

type Props = {
  article: NewsArticle;
};

export default function NewsArticleView({ article }: Props) {
  const items = interleaveAdSlots(article.blocks);
  const [prefs, setPrefs] = useState<NewsReadingPrefs>(DEFAULT_NEWS_READING_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrefs(readReadingPrefs());
    setHydrated(true);
  }, []);

  function updatePrefs(next: NewsReadingPrefs) {
    setPrefs(next);
    if (hydrated) {
      writeReadingPrefs(next);
    }
  }

  return (
    <article className="space-y-6">
      <header className="space-y-2 border-b border-line pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
            Article
          </p>
          <NewsCacheBadge
            cached={Boolean(article.cached)}
            cachedAgeMs={article.cachedAgeMs}
            fetchedAt={article.fetchedAt}
          />
        </div>
        <h2 className="text-3xl leading-tight text-foreground sm:text-4xl">
          {article.title}
        </h2>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/60">
          {article.siteName ?? hostnameOf(article.finalUrl)}
          {article.byline ? ` · ${article.byline}` : ""}
        </p>
        {article.excerpt ? (
          <p className="text-sm text-foreground/75">{article.excerpt}</p>
        ) : null}
      </header>

      <NewsReadingControls prefs={prefs} onChange={updatePrefs} />

      <div className={`space-y-4 text-foreground ${textSizeClass(prefs.textSize)}`.trim()}>
        {items.map((item, index) => {
          if (item.kind === "ad") {
            return <AdPlaceholder key={`ad-${index}`} />;
          }
          return (
            <BlockView
              key={`block-${index}`}
              block={item.block}
              emphasizeKanji={prefs.emphasizeKanji}
            />
          );
        })}
      </div>

      <footer className="border-t border-line pt-3 text-xs font-semibold uppercase tracking-[0.12em] text-foreground/55">
        Source:{" "}
        <a
          href={article.finalUrl}
          target="_blank"
          rel="noreferrer"
          className="text-accent underline"
        >
          {article.finalUrl}
        </a>
      </footer>
    </article>
  );
}

function BlockView({
  block,
  emphasizeKanji,
}: {
  block: NewsArticleBlock;
  emphasizeKanji: boolean;
}) {
  const content = (
    <NewsTokenizedText text={block.text} emphasizeKanji={emphasizeKanji} />
  );

  if (block.kind === "heading") {
    const level = Math.min(Math.max(block.level ?? 2, 2), 4);
    if (level === 2) {
      return <h3 className="pt-2 text-2xl text-foreground">{content}</h3>;
    }
    if (level === 3) {
      return <h4 className="pt-2 text-xl text-foreground">{content}</h4>;
    }
    return <h5 className="pt-2 text-lg text-foreground">{content}</h5>;
  }
  return <p>{content}</p>;
}

function AdPlaceholder() {
  return (
    <div
      role="presentation"
      aria-label="Ad placeholder"
      className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-line bg-surface-muted text-xs font-bold uppercase tracking-[0.18em] text-foreground/45"
    >
      Ad placeholder
    </div>
  );
}

type RenderItem = { kind: "block"; block: NewsArticleBlock } | { kind: "ad" };

function interleaveAdSlots(blocks: NewsArticleBlock[]): RenderItem[] {
  const out: RenderItem[] = [];
  let paragraphCount = 0;
  for (const block of blocks) {
    out.push({ kind: "block", block });
    if (block.kind === "paragraph") {
      paragraphCount += 1;
      if (paragraphCount % AD_INTERVAL === 0) {
        out.push({ kind: "ad" });
      }
    }
  }
  return out;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
