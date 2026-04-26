"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { NewsArticle } from "@/lib/news/newsTypes";

import NewsArticleView from "./NewsArticleView";
import NewsHistoryPanel from "./NewsHistoryPanel";
import {
  clearNewsHistory,
  readNewsHistory,
  recordNewsView,
  removeNewsView,
  type NewsHistoryEntry,
} from "./newsHistory";

type Props = {
  devSampleUrls?: string[];
};

export default function NewsReader({ devSampleUrls = [] }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUrlParam = searchParams.get("url") ?? "";

  const [url, setUrl] = useState(initialUrlParam);
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<NewsHistoryEntry[]>([]);
  const lastFetchedUrl = useRef<string | null>(null);

  useEffect(() => {
    setHistory(readNewsHistory());
  }, []);

  const fetchArticle = useCallback(
    async (target: string) => {
      const trimmed = target.trim();
      if (!trimmed) {
        return;
      }

      lastFetchedUrl.current = trimmed;
      setLoading(true);
      setError(null);
      setArticle(null);

      try {
        const response = await fetch("/api/news/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { article?: NewsArticle; error?: string }
          | null;

        if (!response.ok || !payload?.article) {
          setError(payload?.error ?? "Couldn't read that article.");
          return;
        }

        setArticle(payload.article);
        setHistory(
          recordNewsView({
            url: trimmed,
            title: payload.article.title,
            siteName: payload.article.siteName,
          }),
        );
        const next = `/news?url=${encodeURIComponent(trimmed)}`;
        if (`${window.location.pathname}${window.location.search}` !== next) {
          router.replace(next, { scroll: false });
        }
      } catch {
        setError("Network problem — try again.");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    const param = searchParams.get("url") ?? "";
    if (!param || param === lastFetchedUrl.current) {
      return;
    }
    setUrl(param);
    void fetchArticle(param);
  }, [searchParams, fetchArticle]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await fetchArticle(url);
  }

  function handleSelectHistory(target: string) {
    setUrl(target);
    void fetchArticle(target);
  }

  function handleRemoveHistory(target: string) {
    setHistory(removeNewsView(target));
  }

  function handleClearHistory() {
    clearNewsHistory();
    setHistory([]);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label
          htmlFor="news-url"
          className="block text-xs font-bold uppercase tracking-[0.14em] text-foreground/70"
        >
          Article URL
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="news-url"
            type="url"
            inputMode="url"
            placeholder="https://..."
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="h-11 flex-1 rounded-full border border-line bg-surface px-5 text-sm text-foreground placeholder:text-foreground/40 focus:border-accent focus:outline-none"
            required
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="inline-flex h-11 items-center justify-center rounded-full border border-line bg-accent px-6 text-sm font-bold uppercase tracking-[0.14em] text-surface transition hover:bg-accent-2 disabled:opacity-50"
          >
            {loading ? "Reading…" : "Read"}
          </button>
        </div>
        <p className="text-xs text-foreground/60">
          You provide the link, so you take responsibility for the source. Articles are cached briefly and not stored.
        </p>
        {devSampleUrls.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/55">
              Dev samples
            </span>
            {devSampleUrls.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setUrl(sample)}
                className="rounded-full border border-line bg-surface-muted px-3 py-1 text-[11px] font-semibold text-foreground/80 transition hover:border-accent hover:text-accent"
              >
                {hostnameOf(sample)}
              </button>
            ))}
          </div>
        ) : null}
      </form>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {article && !loading ? <NewsArticleView article={article} /> : null}

      <NewsHistoryPanel
        entries={history}
        activeUrl={article ? lastFetchedUrl.current : null}
        onSelect={handleSelectHistory}
        onRemove={handleRemoveHistory}
        onClear={handleClearHistory}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface-muted p-6 text-center text-sm font-semibold uppercase tracking-[0.14em] text-foreground/60">
      Fetching the article…
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-hot/60 bg-hot/10 p-4 text-sm text-foreground">
      {message}
    </div>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
