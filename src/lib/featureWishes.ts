import { FEATURE_KINDS, isFeatureArea, isFeatureKind, type FeatureArea, type FeatureKind } from "./featureTimeline";

/**
 * The wish list: what has been asked for, before anyone has agreed to build it.
 *
 * The release timeline is a file in the repository, so the running site cannot
 * add to it — an agent commits an entry, the site would lose one on the next
 * deploy. A wish is the other direction: typed into the admin page, stored in
 * the database, and read back by `pnpm backlog wishes` when an agent is ready
 * to turn it into real planned work.
 *
 * Pure rules only, so the CLI and the API can share them without either one
 * dragging in the other's Prisma client.
 */

export const FEATURE_WISH_STATUSES = {
  /** Asked for, waiting for an agent to pick it up. */
  open: "open",
  /** Filed as a planned timeline entry; `filedAs` names it. */
  filed: "filed",
  /** Answered no. Kept, because a wish list that forgets is asked twice. */
  declined: "declined",
} as const;

export type FeatureWishStatus = (typeof FEATURE_WISH_STATUSES)[keyof typeof FEATURE_WISH_STATUSES];

export const FEATURE_WISH_STATUS_VALUES = Object.values(FEATURE_WISH_STATUSES);

export const FEATURE_WISH_STATUS_LABELS: Record<FeatureWishStatus, string> = {
  [FEATURE_WISH_STATUSES.open]: "Waiting",
  [FEATURE_WISH_STATUSES.filed]: "Filed",
  [FEATURE_WISH_STATUSES.declined]: "Declined",
};

export function isFeatureWishStatus(value: string): value is FeatureWishStatus {
  return (FEATURE_WISH_STATUS_VALUES as string[]).includes(value);
}

export type FeatureWish = {
  id: string;
  title: string;
  detail: string | null;
  /** Null when whoever asked did not know, or did not care, which area. */
  area: FeatureArea | null;
  kind: FeatureKind;
  status: FeatureWishStatus;
  filedAs: string | null;
  requestedBy: string | null;
  createdAt: string;
};

export const FEATURE_WISH_LIMITS = {
  title: 120,
  detail: 2000,
} as const;

/**
 * The database columns are plain strings, because areas and kinds are
 * TypeScript unions that change with the code and a Postgres enum would have
 * to be migrated every time one did. So a row is narrowed on the way out and
 * an unrecognised value falls back rather than reaching a component that only
 * handles the ones it knows.
 */
export function toFeatureWish(row: {
  id: string;
  title: string;
  detail: string | null;
  area: string | null;
  kind: string;
  status: string;
  filedAs: string | null;
  requestedBy: string | null;
  createdAt: Date;
}): FeatureWish {
  return {
    id: row.id,
    title: row.title,
    detail: row.detail,
    area: row.area && isFeatureArea(row.area) ? row.area : null,
    kind: isFeatureKind(row.kind) ? row.kind : FEATURE_KINDS.feature,
    status: isFeatureWishStatus(row.status) ? row.status : FEATURE_WISH_STATUSES.open,
    filedAs: row.filedAs,
    requestedBy: row.requestedBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export function openWishes(wishes: readonly FeatureWish[]): FeatureWish[] {
  return wishes.filter((wish) => wish.status === FEATURE_WISH_STATUSES.open);
}

/*
 * Dropped before an id is cut to length, so the four words kept are four that
 * say something. "Furigana toggle on the reading pages" became
 * `furigana-toggle-on-the` without this - an id ending on an article.
 */
const ID_STOP_WORDS = new Set([
  "a", "an", "and", "as", "at", "by", "for", "from", "in", "into", "is", "it",
  "of", "on", "or", "the", "to", "with",
]);

/**
 * The timeline id a wish would be filed under, suggested from its title.
 *
 * Only a suggestion: the agent filing it may know a better name, and a
 * collision with an existing id is refused by `addEntry`. Kebab-case and short,
 * because that is what every id in the file already looks like.
 */
export function suggestedEntryId(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .split("-")
    .filter(Boolean);

  const kept = words.filter((word) => !ID_STOP_WORDS.has(word));
  return (kept.length > 0 ? kept : words).slice(0, 4).join("-") || "wish";
}
