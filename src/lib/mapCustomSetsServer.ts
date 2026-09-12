import "server-only";

/* Every country in memory: the server validates a set against its dataset. */
import "./geoRegionServer";

import { GEO_DATASETS } from "@/lib/geoRegion";
import { canUseMapCountry, isPlayableMapCountry } from "@/lib/mapCountries";
import { prisma } from "@/lib/prisma";

import {
  MAP_SET_LIMITS,
  MAP_SET_VISIBILITIES,
  canSetMapSetVisibility,
  mapSetProblems,
  normalizeMapSetRegions,
  toMapCustomSetSummary,
  type MapCustomSetDraft,
  type MapCustomSetSummary,
  type MapSetVisibility,
} from "./mapCustomSets";

const SELECT = {
  id: true,
  accountId: true,
  country: true,
  name: true,
  regions: true,
  visibility: true,
  createdAt: true,
  account: { select: { nickname: true, displayName: true } },
} as const;

/**
 * The sets a member may play: their own, and every site set. Newest first;
 * a select reads them all at once.
 */
export async function listMapSetsFor(accountId: string): Promise<MapCustomSetSummary[]> {
  const rows = await prisma.mapCustomSet.findMany({
    where: { OR: [{ accountId }, { visibility: MAP_SET_VISIBILITIES.site }] },
    select: SELECT,
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => toMapCustomSetSummary(row, accountId));
}

/** One set the member may play: theirs, or a site set. Nobody else's. */
export async function loadMapSet(accountId: string, id: string): Promise<MapCustomSetSummary | null> {
  const row = await prisma.mapCustomSet.findFirst({
    where: { id, OR: [{ accountId }, { visibility: MAP_SET_VISIBILITIES.site }] },
    select: SELECT,
  });
  return row ? toMapCustomSetSummary(row, accountId) : null;
}

export type MapSetCreateOutcome = { ok: true; set: MapCustomSetSummary } | { ok: false; problems: string[] };

export type MapSetEditOutcome = MapSetCreateOutcome | { ok: false; missing: true };

/**
 * Saves a set, refusing anything the rules call unusable: a name too long
 * for the column, fewer than two regions, a code the country does not have,
 * a country the game cannot play or this member may not have, a name this
 * member already used on this map, a thirty-first set, or "site" from
 * anybody but an admin.
 *
 * The country is asked of `canUseMapCountry`, the one predicate every
 * entrance asks. This route is the third writer taking a country code, and
 * a set saved against an admin-only pilot would sit in the table looking
 * legitimate and then play through the runs route's set path, which trusts
 * the set's country because the set was already checked. Here.
 */
export async function createMapSet(accountId: string, draft: MapCustomSetDraft, isAdmin: boolean): Promise<MapSetCreateOutcome> {
  if (!isPlayableMapCountry(draft.country) || !canUseMapCountry(draft.country, isAdmin)) {
    return { ok: false, problems: ["That map is not available."] };
  }
  const visibility = draft.visibility ?? MAP_SET_VISIBILITIES.private;
  if (!canSetMapSetVisibility(visibility, isAdmin)) return { ok: false, problems: ["Only an admin can share a set with the site."] };
  const known = GEO_DATASETS[draft.country].regions.map((region) => region.code);
  const problems = mapSetProblems(draft, known);
  if (problems.length > 0) return { ok: false, problems };

  const name = draft.name.trim();
  const [held, sameName] = await Promise.all([
    prisma.mapCustomSet.count({ where: { accountId, country: draft.country } }),
    prisma.mapCustomSet.findFirst({ where: { accountId, country: draft.country, name }, select: { id: true } }),
  ]);
  if (held >= MAP_SET_LIMITS.maxSets) {
    return { ok: false, problems: [`You already have ${MAP_SET_LIMITS.maxSets} sets for this map.`] };
  }
  if (sameName) return { ok: false, problems: [`You already have a set called ${name}.`] };

  const row = await prisma.mapCustomSet.create({
    data: { accountId, country: draft.country, name, regions: normalizeMapSetRegions(draft.regions), visibility },
    select: SELECT,
  });
  return { ok: true, set: toMapCustomSetSummary(row, accountId) };
}

/**
 * Changes a set's name, regions or visibility. The country cannot change: a
 * set belongs to one map, and moving it would leave codes that name nothing.
 * Only the owner's set is found, so a stranger's id is missing, not refused;
 * a site set is somebody else's to read and nobody else's to change.
 */
export async function updateMapSet(
  accountId: string,
  id: string,
  edit: { name?: string; regions?: readonly (string | number)[]; visibility?: MapSetVisibility },
  isAdmin: boolean,
): Promise<MapSetEditOutcome> {
  const current = await prisma.mapCustomSet.findFirst({ where: { id, accountId }, select: SELECT });
  if (!current) return { ok: false, missing: true };
  if (!isPlayableMapCountry(current.country)) return { ok: false, problems: ["That map is not available."] };
  if (edit.visibility !== undefined && edit.visibility !== current.visibility && !canSetMapSetVisibility(edit.visibility, isAdmin)) {
    return { ok: false, problems: ["Only an admin can share a set with the site."] };
  }

  const draft = { country: current.country, name: edit.name ?? current.name, regions: edit.regions ?? current.regions };
  const known = GEO_DATASETS[current.country].regions.map((region) => region.code);
  const problems = mapSetProblems(draft, known);
  if (problems.length > 0) return { ok: false, problems };

  const name = draft.name.trim();
  if (name !== current.name) {
    const sameName = await prisma.mapCustomSet.findFirst({
      where: { accountId, country: current.country, name, id: { not: id } },
      select: { id: true },
    });
    if (sameName) return { ok: false, problems: [`You already have a set called ${name}.`] };
  }

  const row = await prisma.mapCustomSet.update({
    where: { id },
    data: { name, regions: normalizeMapSetRegions(draft.regions), ...(edit.visibility !== undefined ? { visibility: edit.visibility } : {}) },
    select: SELECT,
  });
  return { ok: true, set: toMapCustomSetSummary(row, accountId) };
}

/** Removes the owner's set. Runs played on it keep their questions; nothing points back. */
export async function deleteMapSet(accountId: string, id: string): Promise<boolean> {
  const removed = await prisma.mapCustomSet.deleteMany({ where: { id, accountId } });
  return removed.count > 0;
}
