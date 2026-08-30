import timelineData from "@/data/featureTimeline.json";

/**
 * The record of what UmaKuma has shipped and what is queued next.
 *
 * One JSON file backs both the admin release page and the written backlog, so
 * the two cannot drift apart. Shipped dates come from the commit history;
 * planned dates are estimates and are always rendered as such.
 */

export const FEATURE_STATUSES = {
  shipped: "shipped",
  planned: "planned",
} as const;

export type FeatureStatus = (typeof FEATURE_STATUSES)[keyof typeof FEATURE_STATUSES];

export const FEATURE_STATUS_VALUES = Object.values(FEATURE_STATUSES);

export const FEATURE_AREAS = {
  study: "study",
  games: "games",
  jlpt: "jlpt",
  news: "news",
  reading: "reading",
  account: "account",
  admin: "admin",
  platform: "platform",
} as const;

export type FeatureArea = (typeof FEATURE_AREAS)[keyof typeof FEATURE_AREAS];

export const FEATURE_AREA_VALUES = Object.values(FEATURE_AREAS);

export const FEATURE_AREA_LABELS: Record<FeatureArea, string> = {
  [FEATURE_AREAS.study]: "Study",
  [FEATURE_AREAS.games]: "Games",
  [FEATURE_AREAS.jlpt]: "JLPT",
  [FEATURE_AREAS.news]: "News",
  [FEATURE_AREAS.reading]: "Reading",
  [FEATURE_AREAS.account]: "Accounts",
  [FEATURE_AREAS.admin]: "Admin",
  [FEATURE_AREAS.platform]: "Platform",
};

export const FEATURE_STATUS_LABELS: Record<FeatureStatus, string> = {
  [FEATURE_STATUSES.shipped]: "Released",
  [FEATURE_STATUSES.planned]: "Planned",
};

export type FeatureTimelineEntry = {
  id: string;
  name: string;
  area: FeatureArea;
  status: FeatureStatus;
  /** ISO calendar date, `YYYY-MM-DD`. */
  date: string;
  summary: string;
  /** True when `date` is a forecast rather than a release that happened. */
  dateIsEstimate?: boolean;
  /** Ordering hint for planned work; absent once the entry has shipped. */
  release?: number;
  /** The site version this feature shipped as, `0.N.0`; absent while planned. */
  version?: string;
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isFeatureArea(value: string): value is FeatureArea {
  return (FEATURE_AREA_VALUES as string[]).includes(value);
}

export function isFeatureStatus(value: string): value is FeatureStatus {
  return (FEATURE_STATUS_VALUES as string[]).includes(value);
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  return !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function versionMinor(entry: FeatureTimelineEntry): number | null {
  if (!entry.version) {
    return null;
  }
  const minor = Number(entry.version.split(".")[1]);
  return Number.isFinite(minor) ? minor : null;
}

/**
 * Newest first. The version number is the true release order — several
 * releases share a calendar day, and sorting those by name shuffled v0.53
 * between v0.57 and v0.55. Entries without a version fall back to date, with
 * name as the last stable tiebreak.
 */
export function sortFeaturesNewestFirst(
  entries: readonly FeatureTimelineEntry[],
): FeatureTimelineEntry[] {
  return [...entries].sort((left, right) => {
    const leftMinor = versionMinor(left);
    const rightMinor = versionMinor(right);
    if (leftMinor !== null && rightMinor !== null && leftMinor !== rightMinor) {
      return rightMinor - leftMinor;
    }

    if (left.date !== right.date) {
      return left.date < right.date ? 1 : -1;
    }

    return left.name.localeCompare(right.name);
  });
}

/** Planned work reads best in the order it will be built, not newest first. */
export function sortFeaturesByRelease(
  entries: readonly FeatureTimelineEntry[],
): FeatureTimelineEntry[] {
  return [...entries].sort((left, right) => {
    const leftRelease = left.release ?? Number.MAX_SAFE_INTEGER;
    const rightRelease = right.release ?? Number.MAX_SAFE_INTEGER;
    if (leftRelease !== rightRelease) {
      return leftRelease - rightRelease;
    }

    return left.name.localeCompare(right.name);
  });
}

export function featuresByStatus(
  entries: readonly FeatureTimelineEntry[],
  status: FeatureStatus,
): FeatureTimelineEntry[] {
  return entries.filter((entry) => entry.status === status);
}

export type FeatureMonthGroup = {
  /** `YYYY-MM`, usable as a stable React key. */
  monthKey: string;
  label: string;
  entries: FeatureTimelineEntry[];
};

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * These are calendar days, not instants, so they are formatted in UTC. The
 * shared `formatDateShort` renders in the viewer's zone, which pushes a
 * `YYYY-MM-DD` string back a day for anyone west of Greenwich.
 */
export function formatFeatureDate(date: string): string {
  return DAY_LABEL_FORMATTER.format(new Date(`${date}T00:00:00Z`));
}

export function monthLabel(monthKey: string): string {
  return MONTH_LABEL_FORMATTER.format(new Date(`${monthKey}-01T00:00:00Z`));
}

/** Groups an already-sorted list, preserving the order it was given. */
export function groupFeaturesByMonth(
  entries: readonly FeatureTimelineEntry[],
): FeatureMonthGroup[] {
  const groups: FeatureMonthGroup[] = [];

  for (const entry of entries) {
    const monthKey = entry.date.slice(0, 7);
    const current = groups.at(-1);

    if (current?.monthKey === monthKey) {
      current.entries.push(entry);
      continue;
    }

    groups.push({ monthKey, label: monthLabel(monthKey), entries: [entry] });
  }

  return groups;
}

export type FeatureTimelineTotals = {
  total: number;
  shipped: number;
  planned: number;
  firstShippedDate: string | null;
  lastShippedDate: string | null;
};

export function summarizeFeatureTimeline(
  entries: readonly FeatureTimelineEntry[],
): FeatureTimelineTotals {
  const shipped = featuresByStatus(entries, FEATURE_STATUSES.shipped);
  const shippedDates = shipped.map((entry) => entry.date).sort();

  return {
    total: entries.length,
    shipped: shipped.length,
    planned: featuresByStatus(entries, FEATURE_STATUSES.planned).length,
    firstShippedDate: shippedDates.at(0) ?? null,
    lastShippedDate: shippedDates.at(-1) ?? null,
  };
}

/**
 * Validates the JSON at the boundary. A malformed entry is a build-time
 * mistake, so this throws rather than quietly dropping a feature from the page.
 */
function parseEntries(raw: unknown): FeatureTimelineEntry[] {
  if (!Array.isArray(raw)) {
    throw new Error("Feature timeline data must be an array.");
  }

  const seenIds = new Set<string>();

  return raw.map((value, index) => {
    const entry = value as Partial<FeatureTimelineEntry>;
    const where = `Feature timeline entry ${index}`;

    if (!entry.id || typeof entry.id !== "string") {
      throw new Error(`${where} is missing an id.`);
    }
    if (seenIds.has(entry.id)) {
      throw new Error(`${where} repeats the id "${entry.id}".`);
    }
    seenIds.add(entry.id);

    if (!entry.name || typeof entry.name !== "string") {
      throw new Error(`${where} ("${entry.id}") is missing a name.`);
    }
    if (typeof entry.area !== "string" || !isFeatureArea(entry.area)) {
      throw new Error(`${where} ("${entry.id}") has an unknown area.`);
    }
    if (typeof entry.status !== "string" || !isFeatureStatus(entry.status)) {
      throw new Error(`${where} ("${entry.id}") has an unknown status.`);
    }
    if (typeof entry.date !== "string" || !isIsoDate(entry.date)) {
      throw new Error(`${where} ("${entry.id}") needs a YYYY-MM-DD date.`);
    }
    if (typeof entry.summary !== "string" || entry.summary.length === 0) {
      throw new Error(`${where} ("${entry.id}") is missing a summary.`);
    }

    return {
      id: entry.id,
      name: entry.name,
      area: entry.area,
      status: entry.status,
      date: entry.date,
      summary: entry.summary,
      dateIsEstimate: entry.dateIsEstimate === true,
      release: typeof entry.release === "number" ? entry.release : undefined,
      version: typeof entry.version === "string" ? entry.version : undefined,
    };
  });
}

export function loadFeatureTimeline(): FeatureTimelineEntry[] {
  return parseEntries(timelineData);
}
