import { describe, expect, it } from "vitest";

import { ACCOUNT_APPROVAL } from "@/lib/accountApproval";
import { ACCOUNT_VISIBILITY } from "@/lib/accountVisibility";
import type {
  AdminAccountDetail,
  AdminActivitySummary,
  AdminRestStanding,
  AdminXpTypeOption,
} from "@/lib/adminAccountDetail.types";
import { AGE_BANDS } from "@/lib/srs/ageBand";

import { ADMIN_USER_DETAIL_COPY as COPY } from "./AdminUserDetail.constants";
import {
  accountFacts,
  activityFacts,
  capLine,
  capWarning,
  editDraftFrom,
  editPatchFrom,
  lastActiveLine,
  standingLine,
  usedOfAllowedLine,
  vacationState,
} from "./adminUserDetail.helpers";

function account(overrides: Partial<AdminAccountDetail> = {}): AdminAccountDetail {
  return {
    id: "acc-1",
    nickname: "John",
    slug: "john",
    displayName: null,
    joinedByName: null,
    joinedByEmail: "john@example.com",
    visibility: ACCOUNT_VISIBILITY.family,
    internal: false,
    approvalStatus: ACCOUNT_APPROVAL.approved,
    approvedAt: "2026-05-01T00:00:00.000Z",
    disabledAt: null,
    disabledReason: null,
    disabledBy: null,
    hasInviteCode: false,
    inviteCodeUpdatedAt: null,
    wkUsername: "john",
    wkLevel: 12,
    unLevel: 8,
    unLevelFloor: 5,
    ugLevel: 6,
    ugLevelFloor: 3,
    ladderStream: "UN",
    unPlacedAt: null,
    unPlacementSource: null,
    srsTheme: null,
    ageBand: null,
    jlptStatus: null,
    xp: 1200,
    xpLevel: 6,
    xpRankName: "Journeyman",
    xpIntoLevel: 200,
    xpLevelSpan: 500,
    score: 42,
    pendingReviews: 3,
    lastSyncedAt: "2026-09-01T00:00:00.000Z",
    lastSyncStatus: "ok",
    lastSyncError: null,
    lastActivityAt: null,
    createdAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function xpType(overrides: Partial<AdminXpTypeOption> = {}): AdminXpTypeOption {
  return {
    id: "gameFinished",
    label: "Game finished",
    note: "For finishing a game.",
    amount: 5,
    dailyCap: 10,
    retired: false,
    earnedToday: 0,
    ...overrides,
  };
}

describe("standingLine", () => {
  it("says enabled when nothing has switched the account off", () => {
    expect(standingLine(account())).toBe(COPY.facts.enabled);
  });

  /* Who did it matters as much as when: the reason is on file, and the next
     admin reading it needs to know whom to ask. */
  it("names the admin who disabled it, when one is recorded", () => {
    const line = standingLine(
      account({ disabledAt: "2026-09-02T00:00:00.000Z", disabledBy: "john@example.com" }),
    );
    expect(line).toContain("Disabled");
    expect(line).toContain("john@example.com");
  });
});

describe("accountFacts", () => {
  it("never shows a WaniKani token, under any label", () => {
    const rendered = JSON.stringify(accountFacts(account()));
    expect(rendered).not.toContain("token");
    expect(rendered).not.toContain("Token");
  });

  it("reads domain values through their own display maps rather than raw columns", () => {
    const facts = accountFacts(account({ visibility: ACCOUNT_VISIBILITY.public }));
    const visibility = facts.find((fact) => fact.label === COPY.facts.visibility);
    expect(visibility?.value).toBe("Public");
  });

  /* Null in these columns means "predates the column" or "never said", and
     each has its own honest reading rather than a blank cell. */
  it("gives the unsaid columns their own words", () => {
    const facts = accountFacts(account());
    expect(facts.find((fact) => fact.label === COPY.facts.srsTheme)?.value).toBe(COPY.facts.defaultTheme);
    expect(facts.find((fact) => fact.label === COPY.facts.ageBand)?.value).toBe(COPY.facts.unsaidAgeBand);
    expect(facts.find((fact) => fact.label === COPY.facts.inviteCode)?.value).toBe(COPY.facts.inviteCodeUnset);
  });

  it("says a member is not connected rather than leaving WaniKani blank", () => {
    const facts = accountFacts(account({ wkUsername: null, wkLevel: null }));
    expect(facts.find((fact) => fact.label === COPY.facts.wanikani)?.value).toBe(COPY.facts.notConnected);
  });
});

describe("editDraftFrom", () => {
  it("turns null columns into empty boxes and resolves the stored visibility", () => {
    const draft = editDraftFrom(account({ visibility: null, displayName: null, ageBand: null }));
    expect(draft.displayName).toBe("");
    expect(draft.ageBand).toBe("");
    /* Null visibility reads as public: those accounts were already on the
       board, and the form must not offer to take them off it by accident. */
    expect(draft.visibility).toBe(ACCOUNT_VISIBILITY.public);
  });
});

describe("editPatchFrom", () => {
  const row = account({ displayName: "Johnny", ageBand: AGE_BANDS.adult });

  it("sends nothing when nothing was touched", () => {
    expect(editPatchFrom(editDraftFrom(row), row)).toEqual({});
  });

  it("sends only the fields that changed", () => {
    const draft = { ...editDraftFrom(row), nickname: "Jonathan" };
    expect(editPatchFrom(draft, row)).toEqual({ nickname: "Jonathan" });
  });

  /* An emptied box means "clear it", which is a null column: an empty string
     would render as a member with no name at all. */
  it("turns an emptied display name into an explicit null", () => {
    const draft = { ...editDraftFrom(row), displayName: "   " };
    expect(editPatchFrom(draft, row)).toEqual({ displayName: null });
  });

  it("trims before comparing, so whitespace alone is not an edit", () => {
    const draft = { ...editDraftFrom(row), nickname: "  John  " };
    expect(editPatchFrom(draft, row)).toEqual({});
  });

  /* The age band has no "unset" to send back: leaving it blank on an account
     that never said would be choosing the youngest band by implication. */
  it("never sends an empty age band", () => {
    const unsaid = account({ ageBand: null });
    const draft = { ...editDraftFrom(unsaid), ageBand: "" };
    expect(editPatchFrom(draft, unsaid)).toEqual({});
  });
});

describe("capLine", () => {
  it("says plainly when a kind has no cap", () => {
    expect(capLine(xpType({ dailyCap: null }))).toBe(COPY.xp.capNone);
  });

  it("shows the cap beside what has already been earned today", () => {
    expect(capLine(xpType({ dailyCap: 10, earnedToday: 5 }))).toContain("10");
    expect(capLine(xpType({ dailyCap: 10, earnedToday: 5 }))).toContain("5");
  });
});

describe("capWarning", () => {
  /*
   * The whole point of the admin path is that the cap does not trim the
   * award - but the award still lands on the day's row, and the cap is read
   * off that row. So an award past the cap spends the rest of the member's day
   * for that kind, and the admin is told before they click rather than the
   * member finding out afterwards.
   */
  it("warns when the award would take the day past a cap", () => {
    expect(capWarning(xpType({ dailyCap: 10, earnedToday: 5 }), 20)).toContain("Game finished");
  });

  it("stays quiet below the cap, and for a kind that has none", () => {
    expect(capWarning(xpType({ dailyCap: 10, earnedToday: 0 }), 10)).toBeNull();
    expect(capWarning(xpType({ dailyCap: null, earnedToday: 900 }), 5000)).toBeNull();
  });

  it("stays quiet while the amount box is empty or nonsense", () => {
    expect(capWarning(xpType(), Number.NaN)).toBeNull();
    expect(capWarning(xpType(), 0)).toBeNull();
    expect(capWarning(null, 50)).toBeNull();
  });
});

function activity(overrides: Partial<AdminActivitySummary> = {}): AdminActivitySummary {
  return {
    currentStreak: 12,
    longestStreak: 40,
    activeToday: true,
    lastActiveDay: "2026-09-04",
    daysSinceLastActive: 0,
    daysActive: 90,
    totalXp: 4200,
    averagePerActiveDay: 47,
    bestDay: { dayKey: "2026-08-01", amount: 260 },
    ...overrides,
  };
}

function rest(overrides: Partial<AdminRestStanding> = {}): AdminRestStanding {
  return {
    restDaysEarned: 12,
    restDaysGranted: 0,
    restDaysAllowed: 12,
    restDaysUsed: 3,
    restDaysLeft: 9,
    vacationWeeksAllowed: 2,
    vacationDaysEarned: 14,
    vacationDaysGranted: 0,
    vacationDaysAllowed: 14,
    vacationDaysUsed: 0,
    vacationDaysLeft: 14,
    onVacation: false,
    vacationStartedAt: null,
    vacationEndsAt: null,
    ...overrides,
  };
}

describe("lastActiveLine", () => {
  it("says today, yesterday, or how long it has been", () => {
    expect(lastActiveLine(activity({ daysSinceLastActive: 0 }))).toBe(COPY.activity.today);
    expect(lastActiveLine(activity({ daysSinceLastActive: 1 }))).toBe(COPY.activity.yesterday);
    expect(lastActiveLine(activity({ daysSinceLastActive: 14 }))).toBe(COPY.activity.daysAgo(14));
  });

  it("says never rather than nothing for a member who has not started", () => {
    expect(lastActiveLine(activity({ daysSinceLastActive: null, lastActiveDay: null }))).toBe(COPY.activity.never);
  });
});

describe("usedOfAllowedLine", () => {
  it("leaves the granted note off when nothing was granted", () => {
    expect(usedOfAllowedLine(3, 12, 0)).toBe(COPY.activity.usedOfAllowed(3, 12));
  });

  /* An admin needs to see that part of an allowance was handed over rather
     than earned, or a generous-looking number reads as the rules being wrong. */
  it("says how much of the allowance was granted", () => {
    expect(usedOfAllowedLine(3, 22, 10)).toContain("10");
  });
});

describe("vacationState", () => {
  it("is quiet about a member who is not away", () => {
    expect(vacationState(rest())).toMatchObject({ status: "home", endable: false, lines: [] });
  });

  it("leads with the return date, which is the fact being looked for", () => {
    const away = vacationState(
      rest({
        onVacation: true,
        vacationStartedAt: "2026-09-01T00:00:00.000Z",
        vacationEndsAt: "2026-09-15T00:00:00.000Z",
      }),
    );
    expect(away.status).toBe("away");
    expect(away.endable).toBe(true);
    expect(away.lines[0]).toContain("Back on");
  });

  /*
   * The state worth having a name for. Nothing runs on its own to close a
   * vacation - `endVacation` is called, not scheduled - so a span whose end
   * date has passed leaves the member home with an unshifted queue while every
   * other screen has gone back to normal. Collapsing it into "not away" would
   * hide the one case an admin has to act on.
   */
  it("flags a vacation whose end date has passed but which nobody ended", () => {
    const overdue = vacationState(
      rest({
        onVacation: false,
        vacationStartedAt: "2026-08-01T00:00:00.000Z",
        vacationEndsAt: "2026-08-15T00:00:00.000Z",
      }),
    );
    expect(overdue.status).toBe("overdue");
    expect(overdue.endable).toBe(true);
    expect(overdue.lines[0]).toBe(COPY.activity.awayOverdue);
  });
});

describe("activityFacts", () => {
  it("puts the streak, the last visit and both allowances on the grid", () => {
    const facts = activityFacts(account(), activity(), rest());
    const labels = facts.map((fact) => fact.label);
    expect(labels).toContain(COPY.activity.currentStreak);
    expect(labels).toContain(COPY.activity.lastActive);
    expect(labels).toContain(COPY.activity.restDays);
    expect(labels).toContain(COPY.activity.vacationDays);
  });

  it("says whether today already counts, so a streak at risk is visible", () => {
    const counted = activityFacts(account(), activity({ activeToday: true }), rest());
    const atRisk = activityFacts(account(), activity({ activeToday: false }), rest());
    const streakOf = (facts: ReturnType<typeof activityFacts>) =>
      facts.find((fact) => fact.label === COPY.activity.currentStreak)?.value ?? "";
    expect(streakOf(counted)).toContain(COPY.activity.streakToday);
    expect(streakOf(atRisk)).toContain(COPY.activity.streakAtRisk);
  });

  it("does not pretend a member with no history has a best day", () => {
    const facts = activityFacts(account(), activity({ bestDay: null }), rest());
    expect(facts.find((fact) => fact.label === COPY.activity.bestDay)?.value).toBe(COPY.facts.none);
  });
});
