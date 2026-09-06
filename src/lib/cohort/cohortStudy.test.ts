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
  studySession,
  takeLessons,
  type CohortMember,
  type CohortWorld,
} from "./cohortStudy";

const JOINED = new Date("2026-08-01T12:00:00Z");

/** Five small levels: radicals only on 1, then two kanji and two words a level. */
function world(): CohortWorld {
  const subjects: { id: number; kind: string; level: number }[] = [];
  let id = 1;
  for (let level = 1; level <= 5; level += 1) {
    const kinds = level === 1 ? ["radical", "radical", "radical"] : ["radical", "kanji", "kanji", "vocabulary", "vocabulary"];
    for (const kind of kinds) subjects.push({ id: id++, kind, level });
  }
  const totals = [1, 2, 3, 4, 5].map((level) => ({
    level,
    kanji: subjects.filter((s) => s.level === level && s.kind === "kanji").length,
    radicals: subjects.filter((s) => s.level === level && s.kind === "radical").length,
  }));
  return { subjects, totals };
}

function member(slug = "learner", floor = 1): CohortMember {
  const persona = derivePersona({ slug, displayName: slug, country: "CA", joinedAt: JOINED });
  return {
    persona: { ...persona, placementFloor: floor },
    states: new Map(),
    attempts: [],
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
