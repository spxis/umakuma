/**
 * A custom set: a member's own handful of a country's regions to play the Map
 * game on.
 *
 * Pure rules, shared by the picker, the route and the planner, so the three
 * cannot disagree about what a usable set is. A student learning twelve
 * prefectures at a time drills those twelve; the other thirty-five wait until
 * they have been learned.
 */

export const MAP_SET_LIMITS = {
  name: 60,
  /** Fewer than two and there is nothing to choose between. */
  minRegions: 2,
  /** Per member per country. Nobody needs thirty; this stops a loop. */
  maxSets: 30,
} as const;

/**
 * Who a set is offered to. `private` is the owner's alone. `site` is every
 * member's to see and play: an admin builds the map the children practise
 * on, and it shows in their Play row and on their Your maps page. Only an
 * admin may make a set `site`, and only the owner may change or delete it.
 */
export const MAP_SET_VISIBILITIES = { private: "private", site: "site" } as const;
export type MapSetVisibility = (typeof MAP_SET_VISIBILITIES)[keyof typeof MAP_SET_VISIBILITIES];
export const MAP_SET_VISIBILITY_VALUES = Object.values(MAP_SET_VISIBILITIES);
export function isMapSetVisibility(value: unknown): value is MapSetVisibility {
  return typeof value === "string" && (MAP_SET_VISIBILITY_VALUES as string[]).includes(value);
}

export type MapCustomSetSummary = {
  id: string;
  country: string;
  name: string;
  /** Region codes as the dataset names them, as strings. */
  regions: string[];
  visibility: MapSetVisibility;
  /** Whether the reader owns it, which is what decides edit and delete. */
  mine: boolean;
  /** Who made it, for a site set that is somebody else's. */
  ownerName: string;
  createdAt: string;
};

export type MapCustomSetDraft = {
  country: string;
  name: string;
  regions: readonly (string | number)[];
  visibility?: MapSetVisibility;
};

/** Whether a member may ask for this visibility. Site is an admin's word. */
export function canSetMapSetVisibility(visibility: MapSetVisibility, isAdmin: boolean): boolean {
  return visibility === MAP_SET_VISIBILITIES.private || isAdmin;
}

/** The sets a select offers, split the way the select groups them. */
export function groupMapSets(sets: readonly MapCustomSetSummary[]): { site: MapCustomSetSummary[]; mine: MapCustomSetSummary[] } {
  return {
    site: sets.filter((set) => set.visibility === MAP_SET_VISIBILITIES.site),
    mine: sets.filter((set) => set.mine && set.visibility !== MAP_SET_VISIBILITIES.site),
  };
}

/** Trimmed, as strings, each once, in the order first chosen. */
export function normalizeMapSetRegions(regions: readonly (string | number)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const region of regions) {
    const code = String(region).trim();
    if (code === "" || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

/**
 * What is wrong with a draft, in words a person can act on; empty means it
 * may be saved. `knownCodes` is the country's own list, so a code the map
 * does not draw cannot be saved into a set it would never show.
 */
export function mapSetProblems(draft: MapCustomSetDraft, knownCodes: readonly (string | number)[]): string[] {
  const problems: string[] = [];
  const name = draft.name.trim();
  if (name.length === 0) problems.push("Give the set a name.");
  if (name.length > MAP_SET_LIMITS.name) problems.push(`A name is at most ${MAP_SET_LIMITS.name} characters.`);
  const regions = normalizeMapSetRegions(draft.regions);
  if (regions.length < MAP_SET_LIMITS.minRegions) {
    problems.push(`Choose at least ${MAP_SET_LIMITS.minRegions} to play with.`);
  }
  const known = new Set(knownCodes.map(String));
  const unknown = regions.filter((code) => !known.has(code));
  if (unknown.length > 0) problems.push(`Not on this map: ${unknown.join(", ")}.`);
  return problems;
}

/** The entries of a pool that a set names, in the pool's own order. */
export function entriesInMapSet<T extends { code: string | number }>(entries: readonly T[], regions: readonly string[]): T[] {
  const wanted = new Set(regions);
  return entries.filter((entry) => wanted.has(String(entry.code)));
}

/** "Kanto twelve · 12", for a select. */
export function mapSetLabel(set: Pick<MapCustomSetSummary, "name" | "regions">): string {
  return `${set.name} · ${set.regions.length}`;
}

export function toMapCustomSetSummary(
  row: {
    id: string;
    accountId: string;
    country: string;
    name: string;
    regions: string[];
    visibility: string;
    createdAt: Date;
    account?: { nickname: string; displayName: string | null } | null;
  },
  viewerAccountId: string,
): MapCustomSetSummary {
  return {
    id: row.id,
    country: row.country,
    name: row.name,
    regions: row.regions,
    visibility: isMapSetVisibility(row.visibility) ? row.visibility : MAP_SET_VISIBILITIES.private,
    mine: row.accountId === viewerAccountId,
    ownerName: row.account?.displayName?.trim() || row.account?.nickname || "",
    createdAt: row.createdAt.toISOString(),
  };
}
