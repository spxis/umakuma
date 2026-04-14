import type { LevelItem } from "../../explorerTypes";
import {
  formatDateTimeShort,
  formatRelativeFromNow as formatRelativeFromNowShared,
} from "@/lib/timeFormat";

export function formatNumber(input: number): string {
  return new Intl.NumberFormat("en-US").format(input);
}

export function formatDate(input: string | null | undefined): string {
  return formatDateTimeShort(input, "-");
}

type NextReviewBadge = {
  label: string;
  className: string;
};

export function formatNextReviewBadge(input: string | null | undefined): NextReviewBadge | null {
  if (!input) {
    return null;
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const deltaMs = parsed.getTime() - Date.now();
  const absMs = Math.abs(deltaMs);
  if (deltaMs <= 0) {
    if (absMs < 15 * 60 * 1000) {
      return { label: "LATE now", className: "border-orange-300 bg-orange-50 text-orange-700" };
    }
    if (absMs < 60 * 60 * 1000) {
      const minutes = Math.max(1, Math.round(absMs / (60 * 1000)));
      return { label: `LATE ${minutes}M`, className: "border-orange-300 bg-orange-50 text-orange-700" };
    }
    if (absMs < 24 * 60 * 60 * 1000) {
      const hours = Math.max(1, Math.round(absMs / (60 * 60 * 1000)));
      return { label: `LATE ${hours}H`, className: "border-orange-300 bg-orange-50 text-orange-700" };
    }
    const days = Math.max(1, Math.round(absMs / (24 * 60 * 60 * 1000)));
    return { label: `LATE ${days}D`, className: "border-red-300 bg-red-50 text-red-700" };
  }
  if (absMs < 15 * 60 * 1000) {
    return { label: "Due soon", className: "border-emerald-300 bg-emerald-50 text-emerald-700" };
  }
  if (absMs < 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.round(absMs / (60 * 1000)));
    return { label: `In ${minutes}M`, className: "border-emerald-300 bg-emerald-50 text-emerald-700" };
  }
  if (absMs < 24 * 60 * 60 * 1000) {
    const hours = Math.max(1, Math.round(absMs / (60 * 60 * 1000)));
    return { label: `In ${hours}H`, className: "border-emerald-300 bg-emerald-50 text-emerald-700" };
  }
  const days = Math.max(1, Math.round(absMs / (24 * 60 * 60 * 1000)));
  return { label: `In ${days}D`, className: "border-emerald-300 bg-emerald-50 text-emerald-700" };
}

export function formatRelativeFromNow(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }
  return formatRelativeFromNowShared(input, {
    style: "long",
    allowFuture: true,
    invalidLabel: "-",
  });
}

export function isNewGlyphWithinHours(
  item: LevelItem,
  hours: number = 72,
  nowMs: number = Date.now(),
): boolean {
  const anchor = item.startedAt ?? item.availableAt;
  if (!anchor) {
    return false;
  }

  const anchorMs = Date.parse(anchor);
  if (Number.isNaN(anchorMs) || anchorMs > nowMs) {
    return false;
  }

  return nowMs - anchorMs <= hours * 60 * 60 * 1000;
}
