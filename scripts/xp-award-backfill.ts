import { PrismaClient } from "@prisma/client";

import { getVancouverDateKey } from "../src/lib/dailySnapshot";
import { SRS_BURNED_STAGE } from "../src/lib/srs/srsSchedule";
import { XP_AWARDS } from "../src/lib/xp/xpAwards";

/**
 * The XP ledger, for the days that happened before there was one.
 *
 * `XpAward` records what each award was for, and it started recording at
 * 1.110.0 - so a member's history before that says "50 XP of Review Answered"
 * and cannot name a character. This puts the missing rows back from the
 * answers themselves rather than inventing them: `UkReviewAttempt` holds every
 * answer with its subject, its result and its timestamp, and the two review
 * awards are uncapped at 1 XP each while burning is uncapped at 5, so what an
 * attempt earned is arithmetic rather than a guess.
 *
 * **What it cannot reach, and says so rather than papering over.** Reviews
 * answered on the WaniKani feed leave no `UkReviewAttempt` row, so their XP is
 * real and their characters are gone; lessons past a daily cap were never
 * written at all before 1.110.0, and neither were games. The script reports
 * the XP it could account for against the XP the tally holds, so the gap is a
 * number somebody can read rather than a silence.
 *
 * Re-runnable. It writes only for attempts older than an account's earliest
 * real award, so the rows written live since 1.110.0 are never doubled.
 *
 *   pnpm xp:awards:backfill            what it would write, and writes nothing
 *   pnpm xp:awards:backfill --write    write it
 */

const prisma = new PrismaClient({ log: ["error"] });
const CHUNK = 500;

type Planned = { accountId: string; kind: string; amount: number; subjectId: number; dayKey: string; awardedAt: Date };

async function main(): Promise<void> {
  const write = process.argv.includes("--write");
  const accounts = await prisma.account.findMany({ select: { id: true, slug: true } });
  let plannedTotal = 0;
  let wroteTotal = 0;

  for (const account of accounts) {
    /* Live rows start where the ledger did. Anything at or after an account's
       earliest award is already recorded, and re-writing it would double the
       history rather than complete it. */
    const earliest = await prisma.xpAward.findFirst({
      where: { accountId: account.id },
      orderBy: { awardedAt: "asc" },
      select: { awardedAt: true },
    });

    const attempts = await prisma.ukReviewAttempt.findMany({
      where: {
        accountId: account.id,
        ...(earliest ? { submittedAt: { lt: earliest.awardedAt } } : {}),
      },
      orderBy: { submittedAt: "asc" },
      select: { subjectId: true, result: true, previousSrsStage: true, newSrsStage: true, submittedAt: true },
    });
    if (attempts.length === 0) continue;

    const planned: Planned[] = [];
    for (const attempt of attempts) {
      const dayKey = getVancouverDateKey(attempt.submittedAt);
      const base = { accountId: account.id, subjectId: attempt.subjectId, dayKey, awardedAt: attempt.submittedAt };
      planned.push({ ...base, kind: "reviewAnswered", amount: XP_AWARDS.reviewAnswered });
      if (attempt.result === "correct") {
        planned.push({ ...base, kind: "reviewCorrect", amount: XP_AWARDS.reviewCorrect });
      }
      if (attempt.newSrsStage === SRS_BURNED_STAGE && (attempt.previousSrsStage ?? 0) < SRS_BURNED_STAGE) {
        planned.push({ ...base, kind: "burnedItem", amount: 5 });
      }
    }

    /*
     * The tally decides what an award may claim to have paid.
     *
     * I assumed the reconstruction could only ever be short of the tally - a
     * WaniKani answer pays real XP and leaves no attempt row to find it by -
     * and a dry run against production disproved it: John's 2026-09-04 holds
     * three attempts and two answered XP, almost certainly the day awarding
     * was wired, with one answer landing before it. A cohort member whose
     * XpEvent rows were deleted and rebuilt by a replay is short by thousands.
     *
     * So the rule is the one the caps already taught: record the work, and pay
     * out only what the day's row actually holds. Awards fill in the order
     * they were earned until the tally is exhausted; the rest are recorded at
     * zero, which is true - that study happened and it was never paid for.
     * The property this buys is the one the history needs: the items under a
     * row always add up to the number beside it.
     */
    const heldByRow = new Map<string, number>();
    for (const event of await prisma.xpEvent.findMany({
      where: { accountId: account.id, kind: { in: ["reviewAnswered", "reviewCorrect", "burnedItem"] } },
      select: { kind: true, dayKey: true, amount: true },
    })) {
      heldByRow.set(`${event.dayKey}:${event.kind}`, event.amount);
    }

    const remaining = new Map(heldByRow);
    let unpaid = 0;
    for (const award of planned) {
      const key = `${award.dayKey}:${award.kind}`;
      const left = remaining.get(key) ?? 0;
      if (left >= award.amount) {
        remaining.set(key, left - award.amount);
        continue;
      }
      award.amount = 0;
      unpaid += 1;
    }

    const accounted = planned.reduce((sum, row) => sum + row.amount, 0);
    const held = [...heldByRow.values()].reduce((sum, amount) => sum + amount, 0);
    plannedTotal += planned.length;
    console.log(
      `${account.slug ?? account.id}: ${planned.length} awards, ${accounted} XP accounted of ${held} held` +
        (unpaid > 0 ? `  (${unpaid} recorded at 0 - studied, never paid)` : "") +
        (accounted < held ? `  (${held - accounted} XP has no attempt row - WaniKani feed, or before attempts were kept)` : ""),
    );

    if (!write) continue;
    for (let at = 0; at < planned.length; at += CHUNK) {
      const batch = await prisma.xpAward.createMany({ data: planned.slice(at, at + CHUNK) });
      wroteTotal += batch.count;
    }
  }

  console.log(
    write ? `\nWrote ${wroteTotal} award rows.` : `\nWould write ${plannedTotal} award rows. Re-run with --write.`,
  );
  await prisma.$disconnect();
}

main().catch(async (problem) => {
  console.error(problem);
  await prisma.$disconnect();
  process.exit(1);
});
