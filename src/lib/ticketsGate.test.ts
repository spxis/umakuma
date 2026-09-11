import { describe, expect, it } from "vitest";

import { FEATURE_KIND_VALUES } from "./featureTimeline";
import { TASK_LEASE_MS } from "./ticketClaims";
import {
  TICKET_EFFORT_LABELS,
  TICKET_EFFORT_VALUES,
  TICKET_LIMITS,
  TICKET_MOVES,
  TICKET_MOVE_TARGET_VALUES,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_VALUES,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_VALUES,
} from "./tickets";

/**
 * The board gate: docs/plans/board-convergence/BOARD_RULES.md, invariant 10.
 *
 * A status nothing leads to is a hole a row falls into; a status nothing
 * leaves is a hole a row cannot climb out of; a value without a label is a
 * pill drawn blank. TypeScript catches a missing Record entry and nothing
 * else here, so this reads the real constants and says which promise moved
 * when one does. If it fails after a change, either the contract changed or
 * the code did, and the test name says which.
 */
describe("the board gate", () => {
  it("every status can be left, except shipped, which is terminal by design", () => {
    for (const status of TICKET_STATUS_VALUES) {
      if (status === TICKET_STATUSES.shipped) expect(TICKET_MOVES[status]).toEqual([]);
      else expect(TICKET_MOVES[status].length).toBeGreaterThan(0);
    }
  });

  it("every status except shipped can be reached by a move, and shipped by none", () => {
    const reachable = new Set(Object.values(TICKET_MOVES).flat());
    for (const status of TICKET_STATUS_VALUES) {
      /* `filed` is the first board's word for open; nothing writes it any more. */
      if (status === TICKET_STATUSES.shipped || status === TICKET_STATUSES.filed) continue;
      expect(reachable.has(status as never), status).toBe(true);
    }
    expect(reachable.has(TICKET_STATUSES.shipped as never)).toBe(false);
    expect(TICKET_MOVE_TARGET_VALUES as string[]).not.toContain(TICKET_STATUSES.shipped);
  });

  it("every status, kind, priority and effort has a label", () => {
    for (const status of TICKET_STATUS_VALUES) expect(TICKET_STATUS_LABELS[status].trim()).not.toBe("");
    for (const priority of TICKET_PRIORITY_VALUES) expect(TICKET_PRIORITY_LABELS[priority].trim()).not.toBe("");
    for (const effort of TICKET_EFFORT_VALUES) expect(TICKET_EFFORT_LABELS[effort].trim()).not.toBe("");
    expect(FEATURE_KIND_VALUES.length).toBeGreaterThan(0);
  });

  it("holds the contract's numbers", () => {
    expect(TICKET_LIMITS).toEqual({ titleMin: 8, title: 120, detail: 4000, requestedBy: 60, claimedBy: 80 });
    expect(TASK_LEASE_MS).toBe(6 * 60 * 60 * 1000);
  });
});
