import type { SimItem } from "./simTypes";

/**
 * The SRS schedule, and what it costs to climb it.
 *
 * Two things live here because they are the same fact asked two ways. The
 * hours decide *when* an item can next be touched, which is what makes a
 * second sitting worth anything at all. The Markov solve decides *how many*
 * touches an item needs at a given accuracy, which is what makes accuracy
 * compound. Neither is a guess: the intervals and the demotion map are
 * `srsSchedule.ts` verbatim.
 */

/** Hours until an item at each stage comes back. Index 9 is burned. */
export const SRS_STAGE_HOURS: readonly number[] = [0, 4, 8, 23, 47, 168, 336, 720, 2880, 0];

/**
 * Where a wrong answer sends an item. One stage, flat.
 *
 * Worth knowing before anybody proposes making it harsher: **ours is already
 * the gentle version.** WaniKani drops an item by `ceil(wrong ÷ 2) × penalty`
 * where the penalty is *two* at or above Guru, so a thirty-day item can fall
 * to twenty-three hours on two wrong submissions in one sitting. A flat single
 * stage is a deliberate softening, and the whole low-accuracy picture in this
 * simulator rests on it.
 */
export const SRS_DEMOTION: Readonly<Record<number, number>> = {
  0: 0, 1: 1, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8,
};

export const SRS_FIRST_STAGE = 1;
/** Guru, and the bar a level gate is measured against. */
export const SRS_GURU_STAGE = 5;
/** The top. An item here is done and never comes back. */
export const SRS_BURNED_STAGE = 9;

/**
 * The longest an item can sit out of the pool, for sizing the due buckets.
 *
 * Four months at stage 8, which is the one that makes a simulation of a year
 * different from a simulation of a fortnight: an item learned in month eleven
 * cannot possibly burn inside the horizon, and a model that lets it is
 * counting work that never happened.
 */
export const SRS_MAX_INTERVAL_HOURS = Math.max(...SRS_STAGE_HOURS);

/**
 * Expected reviews to carry one item from `from` to burned, at `accuracy`.
 *
 * Solved rather than counted, because the answer is not four-divided-by-p. A
 * wrong answer at stage 4 does not cost one review, it costs that review plus
 * the two it takes to climb back — and the item waits 23 and 47 hours on the
 * way, so the loss is days rather than seconds. At 92% an item reaches Guru in
 * 4.6 reviews and burns in 9.5; at 65% those are 9.8 and 27.5. That is the
 * whole of why low accuracy is not simply "slower".
 *
 * Fixed-point iteration on E[s] = 1 + p·E[s+1] + q·E[demote(s)]. The system is
 * substochastic so it converges; the cap is there so a caller passing 0 gets a
 * number rather than a hang.
 */
export function expectedReviews(accuracy: number, target = SRS_BURNED_STAGE): number {
  const p = Math.min(0.999, Math.max(0.01, accuracy));
  const q = 1 - p;
  const expected = new Array<number>(SRS_BURNED_STAGE + 1).fill(0);
  for (let pass = 0; pass < 10_000; pass += 1) {
    let moved = 0;
    for (let stage = target - 1; stage >= SRS_FIRST_STAGE; stage -= 1) {
      const next = stage + 1 >= target ? 0 : expected[stage + 1];
      const back = expected[SRS_DEMOTION[stage] ?? SRS_FIRST_STAGE];
      const value = 1 + p * next + q * back;
      moved = Math.max(moved, Math.abs(value - expected[stage]));
      expected[stage] = value;
    }
    if (moved < 1e-9) break;
  }
  return expected[SRS_FIRST_STAGE];
}

/** Expected reviews to first reach Guru, which is what a level gate wants. */
export function expectedReviewsToGuru(accuracy: number): number {
  return expectedReviews(accuracy, SRS_GURU_STAGE);
}

/**
 * The lifetime review load one new item a day eventually adds.
 *
 * The number that decides whether a lesson rate is solvent. Ten lessons a day
 * at 85% accuracy is about 65 reviews a day of standing load, once the
 * schedule has caught up six months later — so a member doing ten lessons on
 * a fifty-review budget is not behind, they are insolvent, and no amount of
 * effort inside those fifty reviews fixes it.
 */
export function standingReviewLoad(lessonsPerActiveDay: number, accuracy: number): number {
  return lessonsPerActiveDay * expectedReviews(accuracy);
}

/**
 * The pool, bucketed by the hour an item comes due.
 *
 * A sorted array would do and would be O(n log n) every sitting over a pool
 * that reaches nine thousand. Buckets make it O(hours walked), and they give
 * the property that actually matters: `ready` fills in due order, so a sitting
 * spends its budget on the most overdue items rather than on whichever were
 * learned first.
 *
 * That ordering is not a detail. Served in learn order, a member who sits
 * three times a day spends the second and third sittings re-answering items
 * that came back after four hours while a week-old backlog waits — which made
 * *more* sittings score worse, an inversion that was the model's and not the
 * schedule's.
 */
export class SimDueQueue {
  private readonly buckets: SimItem[][];
  private ready: SimItem[] = [];
  private cursor = 0;

  constructor(private readonly horizonHours: number) {
    this.buckets = Array.from({ length: horizonHours + 1 }, () => []);
  }

  /** Items waiting, answered or not. Everything still in circulation. */
  get inFlight(): number {
    let held = this.ready.length;
    for (let hour = this.cursor; hour < this.buckets.length; hour += 1) held += this.buckets[hour].length;
    return held;
  }

  /** Items that came due and have not been answered. The backlog. */
  get waiting(): number {
    return this.ready.length;
  }

  /**
   * How many are due at `hour`, without answering any of them.
   *
   * For the Anki-style throttle: new cards there come out of the same limit as
   * reviews, so being behind on reviews pauses introduction by itself. Asking
   * costs nothing — the cursor only moves items from a bucket into the ready
   * list, which is where the next `take` was going to find them anyway.
   */
  countDueBy(hour: number): number {
    this.advanceTo(hour);
    return this.ready.length;
  }

  schedule(item: SimItem, hour: number): void {
    const at = Math.max(this.cursor, Math.ceil(hour));
    /* Past the horizon is out of the run, not lost work: an item due in month
       fourteen of a twelve-month simulation genuinely never comes back. */
    if (at >= this.buckets.length) return;
    this.buckets[at].push(item);
  }

  /** Move everything due at or before `hour` into the ready list, in due order. */
  private advanceTo(hour: number): void {
    const limit = Math.min(this.buckets.length - 1, Math.floor(hour));
    for (; this.cursor <= limit; this.cursor += 1) {
      const bucket = this.buckets[this.cursor];
      if (bucket.length > 0) {
        this.ready.push(...bucket);
        bucket.length = 0;
      }
    }
  }

  /** Up to `limit` of the most overdue items, taken out of the queue. */
  take(hour: number, limit: number): SimItem[] {
    this.advanceTo(hour);
    if (limit <= 0 || this.ready.length === 0) return [];
    if (limit >= this.ready.length) {
      const all = this.ready;
      this.ready = [];
      return all;
    }
    return this.ready.splice(0, limit);
  }
}
