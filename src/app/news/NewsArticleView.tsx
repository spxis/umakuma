import type { NewsArticle, NewsArticleBlock } from "@/lib/news/newsTypes";

const AD_INTERVAL = 4;

type Props = {
  article: NewsArticle;
};

export default function NewsArticleView({ article }: Props) {
  const items = interleaveAdSlots(article.blocks);

  return (
    <article className="space-y-6">
      <header className="space-y-2 border-b border-line pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
          Article
        </p>
        <h2 className="text-3xl leading-tight text-foreground sm:text-4xl">
          {article.title}
        </h2>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/60">
          {article.siteName ?? hostnameOf(article.finalUrl)}
          {article.byline ? ` · ${article.byline}` : ""}
          {article.cached ? " · cached" : ""}
        </p>
        {article.excerpt ? (
          <p className="text-sm text-foreground/75">{article.excerpt}</p>
        ) : null}
      </header>

      <div className="space-y-4 text-[15px] leading-relaxed text-foreground">
        {items.map((item, index) => {
          if (item.kind === "ad") {
            return <AdPlaceholder key={`ad-${index}`} />;
          }
          return <BlockView key={`block-${index}`} block={item.block} />;
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

function BlockView({ block }: { block: NewsArticleBlock }) {
  if (block.kind === "heading") {
    const level = Math.min(Math.max(block.level ?? 2, 2), 4);
    if (level === 2) {
      return <h3 className="pt-2 text-2xl text-foreground">{block.text}</h3>;
    }
    if (level === 3) {
      return <h4 className="pt-2 text-xl text-foreground">{block.text}</h4>;
    }
    return <h5 className="pt-2 text-lg text-foreground">{block.text}</h5>;
  }
  return <p>{block.text}</p>;
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
