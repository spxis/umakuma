# SRS mechanisms: what the field does, what we do, and why

John, 2026-09-04: *"We should take the best features from all the systems, or at
least log them and say what we have and what we don't have. That way if we ever
revisit our system we can say, oh, why didn't we do that?"*

This is that log. It comes from a research pass over WaniKani, Anki and FSRS,
SuperMemo, Duolingo's half-life regression, Bunpro and Skritter, done the same
day. Every claim about another system was checked against a primary source
(their docs, their code, or their published paper); where only community
folklore existed, it says so. Memrise was dropped entirely rather than repeat
numbers nobody could open a source for.

The verdicts are as of the date above. When we change one, change the row.

## The one that matters most: the level gate is a latch

WaniKani counts a kanji toward a level once it has **ever** reached Guru, not
only while it currently sits there. Two independent official sources: the
level-progress page ("permanently considered as such … even if that item gets
bumped back down"), and the API's `passed_at`, "when the user reaches SRS
stage 5 for the first time."

The research modelled both gates against WaniKani's real intervals and
demotion. Median days to clear a level, 35 kanji, 300 trials:

| accuracy | latch gate | census gate |
|---|---|---|
| 0.80 | 12 d, always clears | 20 d, always clears |
| 0.70 | 24 d, always clears | 106 d |
| 0.65 | 34 d, always clears | 56% clear within 400 d |
| 0.60 | 53 d, always clears | **0% clear within 400 d** |

A phase transition, and it lives in the *gate*, not the intervals. Reddy et al.,
*Unbounded Human Learning*, KDD 2016, finds the same shape formally.

**We latch.** `hasPassed` in `src/lib/uk/ukLevel.ts` is
`passedAt !== null || srsStage >= 5`; `ukStudyWrite.ts` stamps `passedAt` the
first time an item reaches Guru and never clears it. As of 0.454.0 the flag is
visible on the item too — an item back at stage 2 with **Passed** beside it
tells a member the level is safe, and why. WaniKani has this rule and never
says so on screen.

## The mechanisms, by category

Legend: **have** · **switchable** · **partial** · **don't** · **won't**

**switchable** means it is built and off, waiting on a switch in
Admin → Data → **Scoring**. John, 2026-09-04: *"Some of these sound like they
should be options in the administrative site where we calculate scoring, and we
can turn them on or off and thus change scoring on a live basis."* Every rule
there is off by default and takes effect on the next review with no deploy in
between — because how hard a scheduler should be is exactly the judgement you
only make properly while watching somebody use it.

| # | Mechanism | Who does it | Us | Why, or why not |
|---|---|---|---|---|
| A | **Leech detection**: surface an item that keeps failing, and suspend or flag it | Anki: 8 lapses → tag + suspend, warn every 4 after. SuperMemo: lapses *and* current interval, with a one-lapse-early "semi-leech" warning. Skritter built it and switched it off. WaniKani: none. | **switchable** | `isLeech` in `srsScoringRules.ts`, off by default, threshold and stage both tunable. Flagging only — nothing is suspended or hidden, because the simulator says low accuracy is a tax not a wall (a 60% learner is 2.2× slower, never stuck) and hiding an item is the change hardest to undo. Uses SuperMemo's conjunctive rule rather than Anki's raw count: an item at or above `leechMinStage` is not a leech however badly it started. |
| B | **Reformulate or split** the failing item | SuperMemo's minimum-information principle; Anki's manual calls editing "the most efficient method"; Bjornstad's stepping-stone and discriminating cards; Skritter ships four separately scheduled parts per character. | **don't** | A kanji is one item with one stage. Confusable pairs (料/科, 徹/撤/徴) are on the board as "teach together"; a discriminating card is the cheap half of that. |
| C | **Bound the demotion**, in time | Skritter: a wrong answer gives ~25% of the scheduled interval, floor 30 s, **ceiling 7 days**. FSRS: post-lapse stability is continuous and capped at prior stability. Duolingo: √-compressed counters, clamped to [15 min, 9 months], no reset at all. | **partial** | Ours is a flat one stage from `DEMOTION_MAP` in `srsSchedule.ts`, with a floor at 1. Already gentler than WaniKani's `ceil(wrong/2) × 2` above Guru, which can send a 30-day item to 23 hours in one session. **Do not harden it** — the whole low-accuracy picture rests on it. |
| D | **Keep a per-item difficulty term from running away** | FSRS mean-reverts difficulty toward a default on every update. SM-18 uses a damped running average. Duolingo *deleted* the feature class after it produced items that "would decay rapidly, regardless of how often they practised." | **won't** (for now) | We have no per-item difficulty term, so nothing to run away. If one is ever added, mean-revert it: every mature system converged there and regularisation alone did not save Duolingo. |
| E | **A side channel** for the failing item so it cannot block the main line | Bunpro ghost reviews: a miss spawns a separate 4 h / 12 h / 24 h / 48 h track while the main schedule advances. WaniKani Extra Study / Recent Mistakes (24 h, no SRS effect). Anki filtered decks. | **don't** | The best structural fit we do not have. The switch exists in Admin → Scoring and is marked as doing nothing, so the switchboard does not quietly imply the list is complete. Bunpro's "Minimal" setting (only after two misses on the same item) is the right default when it is built. |
| F | **Throttle intake off the backlog** automatically | Anki, by default: the review limit also caps new cards, so introduction pauses when you are behind. WaniKani leaves it to the learner and their own docs show it does not work. | **switchable** | `ukLessonThrottle` in `ukStudyQueue.ts`, off by default, threshold tunable. The simulator measured it across twenty-four personas: average backlog **−85%** for 0.8% of progress, costing single-sitting learners most because they open behind more often. Lessons are *held*, not hidden — the study page says how many reviews are waiting, because an empty lesson list with no explanation reads as "you have finished". The level gate remains a throttle in its own right: you cannot start material from levels you have not unlocked. |
| G | **Reorder a backlog** so it is survivable | Anki: "relative overdueness" / "ascending retrievability", recommended for a large backlog. WaniKani: "Lower SRS Stages First." SuperMemo: priority sort. | **partial** | `ukReviews` orders by `availableAt asc` — most overdue first — which is relative overdueness by construction. No member-facing choice of order. |
| H | **Reschedule the backlog itself** | SuperMemo: Postpone, Auto-postpone, Mercy, Dilute, each with a retention-cost warning. Anki: Set Due Date, Easy Days. WaniKani: nothing. | **partial** | Vacation mode shifts every due date by the actual absence, past ones included — SuperMemo's own docs name "accumulation of outstanding material after a short break" as the number one reason people quit. No general postpone. |
| I | **Target retention** as an explicit, tunable number | FSRS: desired retention, default 90%, warns above 97%. SuperMemo: requested forgetting index 3–20%. Anki SM-2: interval modifier, `log(desired)/log(current)`. WaniKani's stated healthy band: 85–95%. | **don't** | Fixed ladder, no global multiplier. If added, note SuperMemo's distinction: 90% is recall *at review*; average retention across the interval for the same setting is ≈95%. |
| J | **Soften the question**, not the schedule | WaniKani: a shake-and-hint on near-misses, user synonyms. Bunpro: a four-level hint ladder and Reveal & Grade. | **partial** | We are self-graded, which is Reveal & Grade in effect. No typed answer, so no near-miss handling yet. |
| K | **Give up on the item, or the level** | Anki: delete, or leave suspended. SuperMemo: Forget vs Dismiss. Skritter: reversible per-part ban. WaniKani: reset your level, recommended below 45% accuracy. | **won't** (level reset) | Anki's manual calls level reset "the worst possible thing you can do," and the reasoning is sound: you still remember many of those items. A per-item retire is worth having; a level reset is not. |
| — | **Vacation mode** | WaniKani has it and never documented what it does; the freeze-vs-shift question is unanswered in their KB *and* API, and the confusion is visible in their forum. | **have** | Ours shifts every due date forward by the actual absence and returns unused days. Written down in `xpRestServer.ts` and in the member's profile. |
| — | **Streak protection** | Duolingo streak freeze. | **have** | Rest days spent automatically after the fact; a streak that ended yesterday is not broken yet. Earned by rank, tunable from the admin screen. |
| — | **Recent mistakes / extra study** with no SRS effect | WaniKani, Anki Custom Study. | **don't** | Cheap and useful. A drill over the last 24 h of wrong answers that touches nothing. |
| — | **Intervals** | WaniKani: 4 h, 8 h, 23 h, 47 h, 7 d, 14 d, 30 d, 120 d, rounded down to the hour so items drift *earlier* each day. One system for all types; levels 1–2 accelerated. | **have** (theirs) | `srsSchedule.ts` copies the table deliberately so an imported WaniKani stage means the same thing here. We do not round to the hour and do not accelerate levels 1–2. |

## Things the research could not verify, so neither can we

- WaniKani vacation mode semantics — "pauses your reviews" is all their docs say.
- The "type of review" clause in WaniKani's demotion prose contradicts its own formula and API. The answer-slot explanation (two-part items accrue more wrong submissions) is inference.
- Bunpro's one-level demotion — a staff forum post, not current docs.
- Skritter's current mobile scheduler is unpublished; only the legacy API-v0 algorithm is documented.
- Duolingo's production target recall probability — never published. The circulating 50% is a modelling assumption from the paper's Pimsleur derivation.
- SuperMemo's "~200 reps a day" capacity figure — community-wiki origin, not on the page it is attributed to.
- Memrise — no primary source reachable.

## Sources

WaniKani: docs.api.wanikani.com, knowledge.wanikani.com (SRS stages, level progress, correct percentage, reset level, app settings, common mistakes, recent mistakes). Anki: docs.ankiweb.net (deck options, leeches), faqs.ankiweb.net (algorithm). SuperMemo: super-memory.com (SM-2, 20 rules, leech, postpone), supermemo.guru (E-Factor, SM-17, SM-18, forgetting index, overload). Duolingo: Settles & Meeder, ACL 2016, and github.com/duolingo/halflife-regression. Bunpro: bunpro.jp/support. Skritter: skritter.com/api/v0/docs/scheduling, legacy.skritter.com/faq, docs.skritter.com. Reddy et al., arXiv 1602.07032.
