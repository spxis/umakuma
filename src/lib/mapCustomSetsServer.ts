import "server-only";

/* Every country in memory: the server validates a set against its dataset. */
import "./geoRegionServer";

import { GEO_DATASETS } from "@/lib/geoRegion";
import { isPlayableMapCountry } from "@/lib/mapCountries";
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
 * a country the game cannot play, or a thirty-first set.
 */
export async function createMapSet(accountId: string, draft: MapCustomSetDraft): Promise<MapSetCreateOutcome> {
  if (!isPlayableMapCountry(draft.country)) return { ok: false, problems: ["That map cannot be played."] };
  const known = GEO_DATASETS[draft.country].regions.map((region) => region.code);
  const problems = mapSetProblems(draft, known);
  if (problems.length > 0) return { ok: false, problems };

  const held = await prisma.mapCustomSet.count({ where: { accountId, country: draft.country } });
  if (held >= MAP_SET_LIMITS.maxSets) {
    return { ok: false, problems: [`You already have ${MAP_SET_LIMITS.maxSets} sets for this map.`] };
  }

  const row = await prisma.mapCustomSet.create({
    data: {
      accountId,
      country: draft.country,
      name: draft.name.trim(),
      regions: normalizeMapSetRegions(draft.regions),
    },
    select: SELECT,
  });
  return { ok: true, set: toMapCustomSetSummary(row) };
}
