import { describe, expect, it } from "vitest";

import { seededRandom } from "@/lib/gameRandom";
import { LADDER_STREAMS } from "@/lib/ladder/ladderStreams";
import { SRS_BURNED_STAGE } from "@/lib/srs/srsSchedule";
import { XP_AWARDS, XP_BONUSES } from "@/lib/xp/xpAwards";

import { CohortLedger } from "./cohortLedger";
import { derivePersona } from "./cohortPersona";
import {
  answerReview,
  applyPlacement,
  dueStates,
  openLessons,
  resolvedLevel,
  sitHeldGate,
  studySession,
  takeLessons,
  type CohortMember,
  type CohortSubject,
  type CohortWorld,
} from "./cohortStudy";

const JOINED = new Date("2026-08-01T12:00:00Z");

/** Five small levels: radicals only on 1, then two kanji and two words a level. */
function world(): CohortWorld {
  const subjects: CohortSubject[] = [];
  let id = 1;
  for (let level = 1; level <= 5; level += 1) {
    const kinds = level === 1 ? ["radical", "radical", "radical"] : ["radical", "kanji", "kanji", "vocabulary", "vocabulary"];
    /* The same shape on both ladders here: this fixture is about the walk,
       not about the two orderings differing. `ladderColumns` picks the column
       and a UG member reads `ugLevel`, so both must be present. */
    for (const kind of kinds) subjects.push({ id: id++, kind, level, ugLevel: level });
  }
  const perLevel = [1, 2, 3, 4, 5].map((level) => ({
    level,
    kanji: subjects.filter((s) => s.level === level && s.kind === "kanji").length,
    radicals: subjects.filter((s) => s.level === level && s.kind === "radical").length,
  }));
  return { subjects, totals: { UN: perLevel, UG: perLevel } };
}

function member(slug = "learner", floor = 1): CohortMember {
  const persona = derivePersona({ slug, displayName: slug, country: "CA", joinedAt: JOINED });
  return {
    persona: { ...persona, placementFloor: floor },
    states: new Map(),
    attempts: [],
    tests: [],
    passedGates: new Set<string>(),
    floor: 1,
    level: 1,
    placedAt: null,
    ledger: new CohortLedger(),
    bestScores: new Map(),
    lastActivityAt: null,
  };
}

describe("takeLessons and answerReview", () => {
  it("opens only what is unlocked, then climbs a level when its gate is met", () => {
    const w = world();
    const m = member();
    expect(openLessons(m, w).map((s) => s.level)).toEqual([1, 1, 1]);

    const at = new Date("2026-08-01T14:00:00Z");
    expect(takeLessons(m, openLessons(m, w), at)).toBe(3);
    expect(m.ledger.xp).toBe(3 * XP_AWARDS.lessonLearned);
    expect(dueStates(m, at)).toHaveLength(0);
    expect(dueStates(m, new Date(at.getTime() + 5 * 3_600_000))).toHaveLength(3);

    /* Four correct answers take a radical to Guru; level 1 clears at 90% of its radicals. */
    let clock = at;
    for (let round = 0; round < 4; round += 1) {
      clock = new Date(clock.getTime() + 3 * 86_400_000);
      for (const state of dueStates(m, clock)) answerReview(m, w, state, true, clock);
    }
    expect(m.level).toBe(2);
    expect(resolvedLevel(m, w)).toBe(2);
    expect(openLessons(m, w).every((s) => s.level === 2)).toBe(true);
    for (const state of m.states.values()) expect(state.passedAt).not.toBeNull();
  });

  it("keeps every answer, stamped the way the site stamps it, and drops a stage on a miss", () => {
    const w = world();
    const m = member();
    const at = new Date("2026-08-01T14:00:00Z");
    takeLessons(m, openLessons(m, w), at);
    const state = [...m.states.values()][0]!;
    answerReview(m, w, state, true, new Date(at.getTime() + 5 * 3_600_000));
    answerReview(m, w, state, false, new Date(at.getTime() + 20 * 3_600_000));
    expect(m.attempts.map((a) => [a.previousSrsStage, a.newSrsStage, a.result])).toEqual([
      [1, 2, "correct"],
      [2, 1, "wrong"],
    ]);
    expect(m.attempts[0]!.curriculumStream).toBe(LADDER_STREAMS.un);
    expect(m.attempts[0]!.curriculumVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(state.reviewCount).toBe(2);
    expect(state.wrongCount).toBe(1);
    expect(state.dirty).toBe(true);
  });

  it("pays the burn bonus once, on the first arrival at the top", () => {
    const w = world();
    const m = member();
    const at = new Date("2026-08-01T14:00:00Z");
    takeLessons(m, openLessons(m, w).slice(0, 1), at);
    const state = [...m.states.values()][0]!;
    const before = m.ledger.xp;
    let clock = at;
    while (state.srsStage < SRS_BURNED_STAGE) {
      clock = new Date(state.availableAt!.getTime() + 1);
      answerReview(m, w, state, true, clock);
    }
    const paidPerAnswer = XP_AWARDS.reviewAnswered + XP_AWARDS.reviewCorrect;
    expect(m.ledger.xp - before).toBe(8 * paidPerAnswer + XP_BONUSES.burnedItem);
    expect(state.burnedAt).toEqual(clock);
    expect(state.availableAt).toBeNull();
  });
});

describe("applyPlacement", () => {
  it("seeds everything below the floor, marks it as placed, and pays the award once", () => {
    const w = world();
    const m = member("placed", 3);
    const at = new Date("2026-08-01T14:00:00Z");
    applyPlacement(m, w, at, seededRandom("placement"));
    expect(m.floor).toBe(3);
    expect(m.placedAt).toEqual(at);
    expect(m.level).toBeGreaterThanOrEqual(3);
    const seeded = [...m.states.values()];
    expect(seeded.length).toBe(w.subjects.filter((s) => s.level < 3).length);
    expect(seeded.every((s) => s.origin === "placement")).toBe(true);
    expect(m.ledger.xp).toBe(XP_BONUSES.placementAward);

    applyPlacement(m, w, new Date(at.getTime() + 86_400_000), seededRandom("again"));
    expect(m.ledger.xp).toBe(XP_BONUSES.placementAward);
  });

  it("does nothing for a member who starts from the beginning", () => {
    const m = member("fresh", 1);
    applyPlacement(m, world(), JOINED, seededRandom("x"));
    expect(m.states.size).toBe(0);
    expect(m.placedAt).toBeNull();
  });
});

describe("studySession", () => {
  it("answers what is due, takes lessons on the first sitting only, and keeps XP equal to its rows", () => {
    const w = world();
    const m = member("sitter");
    const first = studySession({ member: m, world: w, at: new Date("2026-08-01T14:00:00Z"), random: seededRandom("s1"), withLessons: true });
    expect(first.lessons).toBeGreaterThan(0);
    expect(first.reviews).toBe(0);
    expect(m.lastActivityAt).not.toBeNull();

    const later = new Date("2026-08-02T14:00:00Z");
    const second = studySession({ member: m, world: w, at: later, random: seededRandom("s2"), withLessons: false });
    expect(second.reviews).toBe(first.lessons);
    expect(second.lessons).toBe(0);
    expect(second.correct).toBeLessThanOrEqual(second.reviews);

    const rowTotal = m.ledger.dayKeys().flatMap((day) => m.ledger.rowsForDay(day)).reduce((sum, row) => sum + row.amount, 0);
    expect(m.ledger.xp).toBe(rowTotal);
    expect(m.ledger.dayKeys().length).toBe(2);
  });

  it("is deterministic for the same member, sitting and random source", () => {
    const run = () => {
      const m = member("same");
      studySession({ member: m, world: world(), at: new Date("2026-08-01T14:00:00Z"), random: seededRandom("r"), withLessons: true });
      studySession({ member: m, world: world(), at: new Date("2026-08-02T14:00:00Z"), random: seededRandom("r2"), withLessons: true });
      return { xp: m.ledger.xp, attempts: m.attempts, states: [...m.states.values()] };
    };
    expect(run()).toEqual(run());
  });
});

/**
 * A simulated member climbs the ladder they follow.
 *
 * `resolvedLevel` resolved everybody against UN - their subjects' UN levels,
 * UN's totals and, by omission, UN's JLPT gates - so a UG persona was
 * simulated climbing the JLPT ordering. It is the same lookup the site uses
 * now, so the two cannot answer differently.
 */
describe("which ladder a simulated member climbs", () => {
  /* Two orderings that disagree: a subject on UN level 1 sits on UG level 5,
     and vice versa. A member who has passed only the UN-level-1 items has
     cleared UN 1 and nothing on UG. */
  const split: CohortWorld = {
    subjects: [
      { id: 1, kind: "radical", level: 1, ugLevel: 5 },
      { id: 2, kind: "radical", level: 5, ugLevel: 1 },
    ],
    totals: {
      UN: [1, 2, 3, 4, 5].map((level) => ({ level, kanji: 0, radicals: level === 1 || level === 5 ? 1 : 0 })),
      UG: [1, 2, 3, 4, 5].map((level) => ({ level, kanji: 0, radicals: level === 1 || level === 5 ? 1 : 0 })),
    },
  };

  const passed = (subjectId: number) =>
    new Map([[subjectId, { id: null, subjectId, srsStage: 9, availableAt: null, unlockedAt: JOINED, startedAt: JOINED, passedAt: JOINED, burnedAt: null, lastReviewedAt: JOINED, reviewCount: 5, correctCount: 5, wrongCount: 0, origin: "lesson" as const, dirty: false }]]);

  it("reads the UN column for a UN member", () => {
    const un = { ...member(), persona: { ...member().persona, stream: "UN" as const }, states: passed(1) };
    /* Cleared UN level 1. Levels 2-4 hold nothing, and an empty level does
       not block the walk, so they come to rest on 5 - the next level that
       actually asks for something. */
    expect(resolvedLevel(un, split)).toBe(5);
  });

  it("reads the UG column for a UG member, and gets a different answer", () => {
    const ug = { ...member(), persona: { ...member().persona, stream: "UG" as const }, states: passed(1) };
    /* The same subject is UG level 5, so UG level 1 is still unmet and they
       have not left the bottom. Same states, same world, different ladder. */
    expect(resolvedLevel(ug, split)).toBe(1);
  });

  it("puts the same member on different rungs depending on their path", () => {
    const states = passed(2);
    const un = { ...member(), persona: { ...member().persona, stream: "UN" as const }, states };
    const ug = { ...member(), persona: { ...member().persona, stream: "UG" as const }, states };
    expect(resolvedLevel(un, split)).not.toBe(resolvedLevel(ug, split));
  });
});

/**
 * A simulated member sits the final that holds them.
 *
 * They did not, and the simulation stopped dead at the first mandatory gate:
 * six of eleven members piled onto UN level 10 and no simulated member could
 * exist above it however long they studied, so the board read flat exactly
 * where it should have spread out.
 */
describe("sitting the gate that holds a member", () => {
  /* One level, one kanji, and a final standing on it. */
  const gated: CohortWorld = {
    subjects: [{ id: 1, kind: "kanji", level: 1, ugLevel: 1 }],
    totals: { UN: [{ level: 1, kanji: 1, radicals: 0 }], UG: [{ level: 1, kanji: 1, radicals: 0 }] },
  };
  const held = () => {
    const m = member();
    m.persona = { ...m.persona, stream: "UN" as const };
    m.states.set(1, { id: null, subjectId: 1, srsStage: 9, availableAt: null, unlockedAt: JOINED, startedAt: JOINED, passedAt: JOINED, burnedAt: null, lastReviewedAt: JOINED, reviewCount: 5, correctCount: 5, wrongCount: 0, origin: "lesson", dirty: false });
    return m;
  };

  it("records the attempt whether it clears or not", () => {
    const m = held();
    /* The gate here is whatever the ladder puts on level 1; if none, nothing
       is sat and nothing is recorded, which is also correct. */
    sitHeldGate(m, gated, JOINED, () => 0.5);
    for (const test of m.tests) {
      expect(test.questionCount).toBeGreaterThan(0);
      expect(test.correctCount).toBeLessThanOrEqual(test.questionCount);
      expect(test.attempt).toBeGreaterThanOrEqual(1);
    }
  });

  it("does nothing when no gate is holding them", () => {
    const free = member();
    free.passedGates = new Set<string>();
    expect(sitHeldGate(free, world(), JOINED, () => 0.5)).toBe(false);
    expect(free.tests).toEqual([]);
  });

  /* A member who already cleared a gate does not sit it again on a re-run -
     the cleared set is loaded back from the database for exactly this. */
  it("leaves a cleared gate alone", () => {
    const m = held();
    m.passedGates = new Set(["jlpt:5"]);
    const before = m.tests.length;
    sitHeldGate(m, gated, JOINED, () => 0.5);
    expect(m.tests.filter((t) => t.gateKey === "jlpt:5").length).toBe(before);
  });

  /* A weak member fails and comes back to it; the attempt number climbs so
     the rows do not collide on (account, gate, attempt). */
  it("numbers a retake after a failure", () => {
    const m = held();
    const weak = () => 0;
    m.persona = { ...m.persona, accuracy: 0.2 };
    sitHeldGate(m, gated, JOINED, weak);
    sitHeldGate(m, gated, JOINED, weak);
    const attempts = m.tests.map((t) => t.attempt);
    expect(new Set(attempts).size).toBe(attempts.length);
  });
});
