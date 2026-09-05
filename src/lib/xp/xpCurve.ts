/**
 * What each XP rank costs, and why these numbers.
 *
 * XP is the second of two ladders and the two are deliberately independent:
 * the curriculum level is earned by learning, this one by turning up. Neither
 * can be bought with the other.
 *
 * **Every rank costs more than the one before**, and the shape has two parts.
 *
 * The first ten ranks are a flat ramp — 25, 50, 75, up to 250 — because early
 * progress should be quick and legible rather than clever. Rank 1 arrives
 * within an hour of starting and rank 10 inside a fortnight, which is what
 * makes somebody keep going. John asked for this specifically after seeing the
 * pure curve: a ladder whose first rungs are already compounding gives a new
 * member nothing to hold on to.
 *
 * From rank 11 the cost compounds at 3.44% a rank, doubling every 20. The rate
 * is not chosen, it is solved: rank 11 continues the ramp at 275 so there is
 * no step down at the handoff, and the rate is whatever carries the remaining
 * 90 ranks to the three-year total from there. An earlier attempt set the flat
 * part and the compounding part independently and produced a rank 10 costing
 * 250 followed by a rank 11 costing 83 — a ladder that got *easier* at the
 * exact moment it was supposed to start biting.
 *
 * The total is calibrated against the **morning-and-night** persona in
 * `simPersonas.ts` — most days, forty-five reviews, ten lessons, twice a day —
 * who reaches rank 100 at about three years and four months. John's target was
 * three years, and the simulator rebuild moved the answer by four months
 * rather than by years, which is the reason to believe either of them.
 * `balanceSimulator.ts` is the instrument; there is no second model.
 *
 * It has been calibrated four times and every pass was a real correction,
 * which is the argument for the model rather than an embarrassment about it.
 *
 * 1. Against a seven-day member — put the steady learner at 3.7 years.
 * 2. Against the steady learner directly — right until ranks began unlocking
 *    capacity, at which point more games a day meant more XP a day and three
 *    years quietly became 2.6.
 * 3. Against a *simulation* of that loop rather than a fixed daily rate, which
 *    is the only instrument that can price a curve whose own rewards feed back
 *    into it. The closed-form model it replaced was retired outright rather
 *    than kept beside it: it still believed a level held forty items where the
 *    shipped ladder averages ninety-three, and two models that disagree are
 *    worse than one that is wrong, because nobody knows which was consulted.
 * 4. With the bonus economy folded in as well — clean sessions, burns, streak
 *    milestones and JLPT bands are earned by the same behaviour the profiles
 *    already describe, so leaving them out made the routine day look smaller
 *    than it is.
 *
 * Not one of those four was visible without modelling a person rather than an
 * average.
 *
 * **Every cost ends in a 0 or a 5.** John's rule, and it earns its place: a
 * rank costing 4,312 reads as a number a machine produced, where 4,310 reads
 * as a number somebody chose. Rounding can flatten two neighbours into
 * equality, so any cost that lands at or below the one before it is nudged up
 * five — which is why the table is stored rather than computed, and why a test
 * asserts the whole sequence strictly increases rather than trusting the
 * generator that made it.
 *
 * Held as a table rather than computed so it can be retuned by editing numbers
 * — there is no migration behind it, and a curve nobody can adjust is a curve
 * that stays wrong.
 */

export const XP_RANKS = 100;

/** Cost of reaching each rank, rank 1 first. */
export const XP_LEVEL_COST: readonly number[] = [
  25, 50, 75, 100, 125, 150, 175, 200, 225, 250,
  275, 285, 295, 305, 315, 325, 335, 350, 360, 375,
  385, 400, 415, 425, 440, 455, 470, 490, 505, 525,
  540, 560, 580, 600, 620, 640, 665, 685, 710, 735,
  760, 785, 810, 840, 870, 900, 930, 960, 995, 1030,
  1065, 1100, 1140, 1180, 1220, 1260, 1305, 1350, 1395, 1445,
  1490, 1545, 1595, 1650, 1710, 1765, 1830, 1890, 1955, 2025,
  2095, 2165, 2240, 2315, 2395, 2480, 2565, 2655, 2745, 2840,
  2935, 3035, 3140, 3250, 3360, 3475, 3595, 3720, 3850, 3980,
  4120, 4260, 4405, 4555, 4715, 4875, 5045, 5220, 5395, 5585,
];

/** Running total to reach a rank, so a progress bar needs no loop. */
const CUMULATIVE: readonly number[] = XP_LEVEL_COST.reduce<number[]>((running, cost, index) => {
  running.push((running[index - 1] ?? 0) + cost);
  return running;
}, []);

/** Total XP needed to stand at `level`. Rank 1 is where everybody starts. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  const capped = Math.min(Math.max(2, Math.trunc(level)), XP_RANKS);
  return CUMULATIVE[capped - 2];
}

/** The rank an amount of XP has earned. */
export function xpLevelFor(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 1;
  for (let level = XP_RANKS; level >= 2; level -= 1) {
    if (xp >= xpForLevel(level)) return level;
  }
  return 1;
}

export type XpStanding = {
  level: number;
  /** XP earned since reaching this rank. */
  into: number;
  /** XP this rank needs in total. Zero at the top, where there is no next. */
  span: number;
  /** 0-1 through the current rank; 1 at the top. */
  ratio: number;
  toNext: number;
};

export function xpStanding(xp: number): XpStanding {
  const level = xpLevelFor(xp);
  if (level >= XP_RANKS) return { level, into: 0, span: 0, ratio: 1, toNext: 0 };
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  const span = ceiling - floor;
  const into = Math.max(0, xp - floor);
  return { level, into, span, ratio: span === 0 ? 1 : into / span, toNext: Math.max(0, ceiling - xp) };
}
