import "server-only";

import ladderData from "@/data/kanjiLadder.json";
import { prisma } from "@/lib/prisma";

import { applyLadderOps, LADDER_OP_TYPES, kanjiOf } from "./ladderOps.mjs";

/**
 * An admin's edit to the curriculum, checked before it is written.
 *
 * The check is the whole point. `applyLadderOps` is the same function the
 * build replays with, so an op accepted here is an op the next
 * `pnpm ladder:refresh` will also accept — and an op that would break an
 * invariant is refused by name rather than written and discovered later, when
 * the rebuild fails and somebody has to work out which of forty edits did it.
 *
 * Pending ops are replayed underneath the candidate, because an edit is only
 * valid against the ladder as it will actually stand: two moves out of the
 * same level can each be fine alone and empty it together.
 */

export type LadderOpInput = {
  op: "move" | "add" | "remove";
  key: string;
  toLevel?: number | null;
  reason?: string | null;
};

type LevelDraft = { level: number; nLevel: number; kanji: string[] };

function baselineLevels(): LevelDraft[] {
  return (ladderData.ladder as { level: number; nLevel: number; kanji: string[] }[]).map((entry) => ({
    level: entry.level,
    nLevel: entry.nLevel,
    kanji: [...entry.kanji],
  }));
}

/** Ops not yet written into the committed overrides file, oldest first. */
export async function pendingLadderOps() {
  return prisma.ladderOverride.findMany({
    where: { exportedAt: null },
    orderBy: { createdAt: "asc" },
  });
}

export type LadderOpRefusal = { key: string; reason: string };

/**
 * Records an op, if it survives the replay.
 *
 * Two writes in one transaction: the op itself, and the live `UkSubject.level`
 * so the change reaches members immediately rather than waiting for an export
 * and a deploy. The file lags on purpose — the admin page says by how many.
 */
export async function recordLadderOp({
  input,
  by,
}: {
  input: LadderOpInput;
  by: string;
}): Promise<{ ok: true; id: string; fromLevel: number | null } | { ok: false; refusal: LadderOpRefusal }> {
  const pending = await pendingLadderOps();
  /* Only kanji ops reshape the levels - radicals follow the kanji they build
     and words follow their kanji floor, both recomputed by the build - so a
     radical or vocabulary op is recorded but is not part of this replay. */
  const replayed = applyLadderOps(
    baselineLevels(),
    pending
      .filter((row) => row.kind === "kanji")
      .map((row) => ({
        id: row.id,
        op: row.op,
        kind: "kanji" as const,
        key: row.key,
        fromLevel: row.fromLevel,
        toLevel: row.toLevel,
      })),
  );

  const characters = kanjiOf(input.key);
  const fromLevel = characters
    ? (replayed.levels.find((level) => level.kanji.includes(characters))?.level ?? null)
    : null;

  const candidate = {
    id: "candidate",
    op: input.op,
    kind: "kanji" as const,
    key: input.key,
    fromLevel,
    toLevel: input.toLevel ?? null,
  };
  const checked = applyLadderOps(replayed.levels, [candidate]);
  if (checked.refused.length > 0) {
    return { ok: false, refusal: { key: input.key, reason: checked.refused[0].reason } };
  }

  const subject = await prisma.ukSubject.findUnique({ where: { key: input.key }, select: { id: true } });

  const [row] = await prisma.$transaction([
    prisma.ladderOverride.create({
      data: {
        op: input.op,
        kind: "kanji",
        key: input.key,
        fromLevel,
        toLevel: input.toLevel ?? null,
        reason: input.reason ?? null,
        by,
      },
    }),
    ...(subject && input.op !== LADDER_OP_TYPES.remove && typeof input.toLevel === "number"
      ? [prisma.ukSubject.update({ where: { id: subject.id }, data: { level: input.toLevel } })]
      : []),
    ...(subject && input.op === LADDER_OP_TYPES.remove
      ? [prisma.ukSubject.update({ where: { id: subject.id }, data: { removedAt: new Date() } })]
      : []),
  ]);

  return { ok: true, id: row.id, fromLevel };
}

/**
 * Withdraws an op, but only while it is still ours to withdraw.
 *
 * Once exported it is in the committed file and the build replays it; deleting
 * the row would leave the two disagreeing with no way to tell which was right.
 *
 * **It also puts the item back.** Recording an op moves the live
 * `UkSubject.level` in the same transaction so the change reaches members
 * immediately; deleting only the op therefore left the database saying level 9
 * and the committed ladder saying 10, with nothing recording why - which is
 * precisely the drift this whole log exists to prevent. Caught by withdrawing
 * a test move and then looking at the row, which the tests had not thought to
 * do.
 */
export async function deleteLadderOp(id: string): Promise<boolean> {
  const row = await prisma.ladderOverride.findUnique({ where: { id } });
  if (!row || row.exportedAt !== null) return false;

  const subject = await prisma.ukSubject.findUnique({ where: { key: row.key }, select: { id: true } });
  const undo =
    subject === null
      ? []
      : row.op === LADDER_OP_TYPES.remove
        ? [prisma.ukSubject.update({ where: { id: subject.id }, data: { removedAt: null } })]
        : row.op === LADDER_OP_TYPES.add
          ? /* An added item has no level to go back to; withdrawing the op
               retires the row rather than leaving it stranded on the ladder. */
            [prisma.ukSubject.update({ where: { id: subject.id }, data: { removedAt: new Date() } })]
          : row.fromLevel !== null
            ? [prisma.ukSubject.update({ where: { id: subject.id }, data: { level: row.fromLevel } })]
            : [];

  await prisma.$transaction([prisma.ladderOverride.delete({ where: { id } }), ...undo]);
  return true;
}
