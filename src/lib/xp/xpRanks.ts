import rankNameData from "@/data/xpRankNames.json";

import { XP_RANKS } from "./xpCurve";

/**
 * What each XP rank is called.
 *
 * The curve in `xpCurve.ts` says what a rank costs; this says what it is
 * named, and the two are kept apart on purpose. Retuning the economy should
 * not rename anybody, and renaming a rank should not move a single number.
 *
 * Shaped after `srsThemes.ts`: a committed JSON file read once at module load,
 * with a function per question rather than the parsed blob handed out. The
 * difference is that this file arrives on its own schedule - a hundred names
 * with nine equivalents each is writing, not code - so **nothing here throws
 * on data that is missing, short or malformed.** A rank with no name reads as
 * `Rank 42`, which is honest and legible, where a crash on a profile page is
 * neither. That fallback is a floor, not a feature: a member should not be
 * seeing it once the names have landed.
 */

export type XpRankEquivalent = {
  name: string;
  /** How a Japanese equivalent is read. Absent everywhere else. */
  reading?: string;
  /** The language or tradition the equivalent comes from. */
  language: string;
  /** Where it needs one; empty otherwise. */
  note: string;
};

export type XpRank = {
  level: number;
  /** The canonical name, the one a member is shown. */
  name: string;
  equivalents: XpRankEquivalent[];
};

type RankNameFile = { version?: number; ranks?: unknown };

function toEquivalents(value: unknown): XpRankEquivalent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const row = entry as Partial<XpRankEquivalent> | null;
    if (!row || typeof row.name !== "string" || row.name.length === 0) return [];
    return [{
      name: row.name,
      ...(typeof row.reading === "string" && row.reading.length > 0 ? { reading: row.reading } : {}),
      language: typeof row.language === "string" ? row.language : "",
      note: typeof row.note === "string" ? row.note : "",
    }];
  });
}

/* Read once. A malformed row is dropped rather than repaired: a rank with a
   blank name is indistinguishable from one that has not been written yet, and
   both want the same fallback. */
const byLevel = new Map<number, XpRank>();
for (const entry of ((rankNameData as RankNameFile)?.ranks as unknown[] | undefined) ?? []) {
  const row = entry as Partial<XpRank> | null;
  if (!row || !Number.isInteger(row.level) || typeof row.name !== "string" || row.name.trim().length === 0) continue;
  byLevel.set(row.level as number, {
    level: row.level as number,
    name: row.name.trim(),
    equivalents: toEquivalents(row.equivalents),
  });
}

/** The rank a level sits at, always answered. Levels outside 1-100 are clamped. */
export function xpRank(level: number): XpRank {
  const clamped = Number.isFinite(level) ? Math.min(Math.max(1, Math.trunc(level)), XP_RANKS) : 1;
  return byLevel.get(clamped) ?? { level: clamped, name: `Rank ${clamped}`, equivalents: [] };
}

/** The canonical name of a rank. */
export function xpRankName(level: number): string {
  return xpRank(level).name;
}

/** The other traditions' words for the same rank. Empty is normal. */
export function xpRankEquivalents(level: number): XpRankEquivalent[] {
  return xpRank(level).equivalents;
}

/** The whole ladder, rank 1 first, with fallbacks filled in. */
export function xpRanks(): XpRank[] {
  return Array.from({ length: XP_RANKS }, (_unused, index) => xpRank(index + 1));
}

/** True once the names have actually landed, for a test to assert on. */
export function xpRanksAreNamed(): boolean {
  return byLevel.size === XP_RANKS;
}

/**
 * `L` belongs to the XP ladder. The curriculum ones are `WK` and `UK`.
 *
 * `levelBadge.ts` exists because a naked `L17` on a subject was a question
 * with two answers, and the fix was to prefix both curriculum ladders. That
 * left `L` free, and John reserved it here on 2026-09-05: a rank is never
 * drawn on a subject, so the one place a bare L can appear is the XP ladder,
 * where `XP10` beside `50,000 XP` would read as a second number rather than a
 * rung.
 *
 * So the three prefixes divide cleanly - `WK` and `UK` for what you have
 * learned, `L` for what you have turned up for - and none of them needs
 * explaining next to the others.
 *
 * Written as a concatenation rather than a template so the guard in
 * `levelBadge.test.ts` still catches a *level* drawn without its system, which
 * is the thing that rule is actually for.
 */
export const XP_RANK_PREFIX = "L";

/** `L10`. The rung, for a line that has already said XP. */
export function xpRankBadge(level: number): string {
  return XP_RANK_PREFIX + String(xpRank(level).level);
}
