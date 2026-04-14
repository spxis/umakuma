type RelativeStyle = "short" | "long";

type RelativeOptions = {
  nowMs?: number;
  style?: RelativeStyle;
  allowFuture?: boolean;
  invalidLabel?: string;
  noValueLabel?: string;
  justNowLabel?: string;
  justNowThresholdMs?: number;
};

export function toTimestampMs(input: string | number | Date | null | undefined): number | null {
  if (input === null || input === undefined) {
    return null;
  }

  if (typeof input === "number") {
    return Number.isFinite(input) ? input : null;
  }

  if (input instanceof Date) {
    const value = input.getTime();
    return Number.isNaN(value) ? null : value;
  }

  const parsed = new Date(input).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

export function formatDateTimeShort(input: string | number | Date | null | undefined, fallback: string = "-"): string {
  const timestamp = toTimestampMs(input);
  if (timestamp === null) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function formatDateShort(input: string | number | Date | null | undefined, fallback: string = "-"): string {
  const timestamp = toTimestampMs(input);
  if (timestamp === null) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

function formatRelativePart(value: number, unit: "minute" | "hour" | "day" | "week" | "month" | "year", style: RelativeStyle): string {
  if (style === "short") {
    if (unit === "minute") return `${value} min`;
    if (unit === "hour") return `${value} hr`;
    if (unit === "day") return `${value} day${value === 1 ? "" : "s"}`;
    if (unit === "week") return `${value} wk`;
    if (unit === "month") return `${value} mo`;
    return `${value} yr`;
  }

  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

export function formatRelativeFromNow(
  input: string | number | Date | null | undefined,
  {
    nowMs = Date.now(),
    style = "long",
    allowFuture = true,
    invalidLabel = "unknown",
    noValueLabel = "unknown",
    justNowLabel = "just now",
    justNowThresholdMs = 30_000,
  }: RelativeOptions = {},
): string {
  if (input === null || input === undefined) {
    return noValueLabel;
  }

  const timestamp = toTimestampMs(input);
  if (timestamp === null) {
    return invalidLabel;
  }

  const deltaMs = nowMs - timestamp;
  const absMs = Math.abs(deltaMs);

  if (absMs < justNowThresholdMs) {
    return justNowLabel;
  }

  if (!allowFuture && deltaMs < 0) {
    return justNowLabel;
  }

  const minuteMs = 60_000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const weekMs = 7 * dayMs;
  const monthMs = 30 * dayMs;
  const yearMs = 365 * dayMs;

  let value = 1;
  let unit: "minute" | "hour" | "day" | "week" | "month" | "year" = "minute";

  if (absMs >= yearMs) {
    value = Math.max(1, Math.round(absMs / yearMs));
    unit = "year";
  } else if (absMs >= monthMs) {
    value = Math.max(1, Math.round(absMs / monthMs));
    unit = "month";
  } else if (absMs >= weekMs) {
    value = Math.max(1, Math.round(absMs / weekMs));
    unit = "week";
  } else if (absMs >= dayMs) {
    value = Math.max(1, Math.round(absMs / dayMs));
    unit = "day";
  } else if (absMs >= hourMs) {
    value = Math.max(1, Math.round(absMs / hourMs));
    unit = "hour";
  } else {
    value = Math.max(1, Math.round(absMs / minuteMs));
    unit = "minute";
  }

  const part = formatRelativePart(value, unit, style);
  return deltaMs < 0 ? `in ${part}` : `${part} ago`;
}