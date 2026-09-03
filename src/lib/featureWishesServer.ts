import "server-only";

import { prisma } from "@/lib/prisma";

import {
  FEATURE_WISH_STATUSES,
  toFeatureWish,
  type FeatureWish,
  type FeatureWishStatus,
} from "@/lib/featureWishes";
import type { FeatureArea, FeatureKind } from "@/lib/featureTimeline";

/**
 * Wish list reads and writes, for the admin page and its API.
 *
 * Split from `featureWishes.ts` the way `featureFlagsServer` is split from
 * `featureFlags`: the rules are shared with the backlog CLI, which has no
 * business importing a server-only Prisma singleton.
 */

const SELECT = {
  id: true,
  title: true,
  detail: true,
  area: true,
  kind: true,
  status: true,
  filedAs: true,
  requestedBy: true,
  createdAt: true,
} as const;

/** Newest first: a wish list is read to see what has just been asked for. */
export async function listFeatureWishes(): Promise<FeatureWish[]> {
  const rows = await prisma.featureWish.findMany({
    select: SELECT,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toFeatureWish);
}

export type FeatureWishDraft = {
  title: string;
  detail: string | null;
  area: FeatureArea | null;
  kind: FeatureKind;
  requestedBy: string | null;
};

export async function createFeatureWish(draft: FeatureWishDraft): Promise<FeatureWish> {
  const row = await prisma.featureWish.create({
    data: {
      title: draft.title,
      detail: draft.detail,
      area: draft.area,
      kind: draft.kind,
      requestedBy: draft.requestedBy,
      status: FEATURE_WISH_STATUSES.open,
    },
    select: SELECT,
  });
  return toFeatureWish(row);
}

/**
 * Moves a wish between states.
 *
 * `filedAs` is cleared on anything but `filed`, so a wish that was filed and
 * then reopened does not keep pointing at an entry it is no longer connected
 * to.
 */
export async function setFeatureWishStatus(
  id: string,
  status: FeatureWishStatus,
  filedAs: string | null = null,
): Promise<FeatureWish | null> {
  const row = await prisma.featureWish
    .update({
      where: { id },
      data: { status, filedAs: status === FEATURE_WISH_STATUSES.filed ? filedAs : null },
      select: SELECT,
    })
    .catch(() => null);
  return row ? toFeatureWish(row) : null;
}
