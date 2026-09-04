import "server-only";

import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";
import { prisma } from "@/lib/prisma";

import { resolveUkLevel, type UkLevelResolution, type UkLevelTotals } from "./ukLevel";

/**
 * Reading and writing a member's UmaKuma level.
 *
 * `Account.ukLevel` is a materialised copy, and this file is the only place
 * that writes it. Every path that can change a member's standing — a review,
 * a placement, a WaniKani import, a reconcile after a curriculum bump — ends
 * by calling `syncAccountUkLevel`, so there is one answer to "how did this
 * number get here" rather than six.
 */

const TTL_MS = 10 * 60_000;
let totalsHeld: { totals: UkLevelTotals[]; builtAtMs: number } | null = null;

/**
 * How many kanji and radicals each level teaches, counted from the curriculum
 * table rather than the JSON: the table is what the admin console edits, and
 * a level gate computed from a stale file would disagree with what a member
 * is actually being shown.
 */
export async function ukLevelTotals(): Promise<UkLevelTotals[]> {
  if (totalsHeld && Date.now() - totalsHeld.builtAtMs <= TTL_MS) return totalsHeld.totals;

  const grouped = await prisma.ukSubject.groupBy({
    by: ["level", "kind"],
    where: { removedAt: null },
    _count: { _all: true },
  });

  const byLevel = new Map<number, UkLevelTotals>();
  for (let level = 1; level <= KANJI_LADDER_LEVELS; level += 1) {
    byLevel.set(level, { level, kanji: 0, radicals: 0 });
  }
  for (const row of grouped) {
    const entry = byLevel.get(row.level);
    if (!entry) continue;
    if (row.kind === "kanji") entry.kanji = row._count._all;
    if (row.kind === "radical") entry.radicals = row._count._all;
  }

  const totals = [...byLevel.values()];
  totalsHeld = { totals, builtAtMs: Date.now() };
  return totals;
}

/** Forgets the counts, for after a seed or an admin edit. */
export function clearUkLevelTotalsCache(): void {
  totalsHeld = null;
}

/** What a member's level would be right now, without writing it. */
export async function deriveUkLevel(accountId: string): Promise<UkLevelResolution> {
  const [account, totals, states] = await Promise.all([
    prisma.account.findUnique({ where: { id: accountId }, select: { ukLevelFloor: true } }),
    ukLevelTotals(),
    prisma.ukSrsState.findMany({
      where: { accountId },
      select: { srsStage: true, passedAt: true, subject: { select: { level: true, kind: true } } },
    }),
  ]);

  return resolveUkLevel({
    rows: states.map((state) => ({
      level: state.subject.level,
      kind: state.subject.kind,
      srsStage: state.srsStage,
      passedAt: state.passedAt,
    })),
    totals,
    floor: account?.ukLevelFloor ?? 1,
  });
}

/**
 * Recomputes and stores the level. The one writer.
 *
 * Returns what it wrote, so a caller that has just taken a review can tell a
 * member they levelled up without asking again.
 */
export async function syncAccountUkLevel(accountId: string): Promise<UkLevelResolution> {
  const resolved = await deriveUkLevel(accountId);
  await prisma.account.update({
    where: { id: accountId },
    data: { ukLevel: resolved.level, ukLevelUpdatedAt: new Date() },
  });
  return resolved;
}

/**
 * Raises the floor and re-derives. Never lowers: a floor is what a placement
 * test or a WaniKani import bought, and taking it back is the one thing that
 * would make either of them not worth sitting.
 */
export async function raiseUkLevelFloor({
  accountId,
  floor,
  source,
}: {
  accountId: string;
  floor: number;
  source: "placement_test" | "wanikani" | "self" | "admin";
}): Promise<UkLevelResolution> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { ukLevelFloor: true },
  });
  const next = Math.min(Math.max(floor, account?.ukLevelFloor ?? 1), KANJI_LADDER_LEVELS);
  await prisma.account.update({
    where: { id: accountId },
    data: { ukLevelFloor: next, ukPlacedAt: new Date(), ukPlacementSource: source },
  });
  return syncAccountUkLevel(accountId);
}
