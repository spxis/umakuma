"use client";

import NewsCacheBadge from "./NewsCacheBadge";
import type { DiscoveredLink } from "@/lib/news/newsDiscover";

type Props = {
  baseUrl: string | null;
  links: DiscoveredLink[];
  cached: boolean;
  cachedAgeMs?: number;
  fetchedAt?: string;
  loading: boolean;
  error: string | null;
  onSelect: (url: string) => void;
  onDismiss: () => void;
};

export default function NewsSiteLinks({
  baseUrl,
  links,
  cached,
  cachedAgeMs,
  fetchedAt,
  loading,
  error,
  onSelect,
  onDismiss,
}: Props) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-dashed border-line bg-surface-muted p-6 text-center text-sm font-semibold uppercase tracking-[0.14em] text-foreground/60">
        Scanning page for article links…
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex items-start justify-between gap-3 rounded-2xl border border-hot/60 bg-hot/10 p-4 text-sm text-foreground">
        <span>{error}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/70 hover:text-foreground"
        >
          Dismiss
        </button>
      </section>
    );
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-2xl border border-line/80 bg-surface/85 p-5 shadow-[0_18px_60px_-40px_rgba(15,111,255,0.4)]">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
              Candidate articles
            </p>
            <NewsCacheBadge cached={cached} cachedAgeMs={cachedAgeMs} fetchedAt={fetchedAt} />
          </div>
          <h2 className="text-base font-semibold text-foreground">
            {baseUrl ? hostnameOf(baseUrl) : "Found links"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full border border-line px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/70 hover:border-accent hover:text-accent"
        >
          Hide
        </button>
      </header>
      <ul className="divide-y divide-line/70">
        {links.map((link) => (
          <li key={link.url} className="py-2">
            <button
              type="button"
              onClick={() => onSelect(link.url)}
              className="group block w-full text-left"
            >
              <span className="block text-sm font-semibold text-foreground group-hover:text-accent">
                {link.title}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-foreground/55">
                {link.url}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
