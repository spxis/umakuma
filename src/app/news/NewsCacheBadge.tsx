"use client";

import { formatRelativeFromNow } from "@/lib/timeFormat";

type Props = {
  cached: boolean;
  cachedAgeMs?: number;
  fetchedAt?: string;
  className?: string;
};

export default function NewsCacheBadge({
  cached,
  cachedAgeMs,
  fetchedAt,
  className = "",
}: Props) {
  if (cached) {
    const age = formatAge(cachedAgeMs, fetchedAt);
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-accent ${className}`.trim()}
        title={fetchedAt ? `First fetched ${fetchedAt}` : undefined}
      >
        <span aria-hidden="true">●</span>
        Cached
        {age ? <span className="font-semibold normal-case tracking-normal text-accent/80">· {age}</span> : null}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-line bg-surface-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/60 ${className}`.trim()}
      title="Just fetched live from the source"
    >
      <span aria-hidden="true">●</span>
      Live fetch
    </span>
  );
}

function formatAge(ageMs: number | undefined, fetchedAt: string | undefined): string | null {
  if (typeof ageMs === "number" && Number.isFinite(ageMs) && ageMs >= 0) {
    const seconds = Math.round(ageMs / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  }

  if (fetchedAt) {
    const parsed = Date.parse(fetchedAt);
    if (!Number.isNaN(parsed)) {
      return formatRelativeFromNow(new Date(parsed));
    }
  }

  return null;
}
