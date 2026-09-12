import "server-only";

/* Every country in memory: the server validates a set against its dataset. */
import "./geoRegionServer";

import { GEO_DATASETS } from "@/lib/geoRegion";
import { canUseMapCountry, isPlayableMapCountry } from "@/lib/mapCountries";
import { prisma } from "@/lib/prisma";

import {
  MAP_SET_LIMITS,
  mapSetProblems,
  normalizeMapSetRegions,
  toMapCustomSetSummary,
  type MapCustomSetDraft,
  type MapCustomSetSummary,
} from "./mapCustomSets";

const SELECT = { id: true, country: true, name: true, regions: true, createdAt: true } as const;

/** A member's sets, newest first; a select reads them all at once. */
export async function listMapSets(accountId: string): Promise<MapCustomSetSummary[]> {
  const rows = await prisma.mapCustomSet.findMany({
    where: { accountId },
    select: SELECT,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toMapCustomSetSummary);
}

/** One set, only if it belongs to the member asking. */
export async function loadMapSet(accountId: string, id: string): Promise<MapCustomSetSummary | null> {
  const row = await prisma.mapCustomSet.findFirst({ where: { id, accountId }, select: SELECT });
  return row ? toMapCustomSetSummary(row) : null;
}

export type MapSetCreateOutcome = { ok: true; set: MapCustomSetSummary } | { ok: false; problems: string[] };

/**
 * Saves a set, refusing anything the rules call unusable: a name too long
 * for the column, fewer than two regions, a code the country does not have,
 * a country the game cannot play or this member may not have, a name this
 * member already used on this map, or a thirty-first set.
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
    data: {
      accountId,
      country: draft.country,
      name,
      regions: normalizeMapSetRegions(draft.regions),
    },
    select: SELECT,
  });
  return { ok: true, set: toMapCustomSetSummary(row) };
}
