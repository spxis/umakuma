import { describe, expect, it } from "vitest";

import { xpWeekBefore, xpWeekOf } from "./xpWeek";

describe("which week a day belongs to", () => {
  it("runs Monday to Sunday", () => {
    const week = xpWeekOf("2026-09-06");

    expect(week.startDayKey).toBe("2026-08-31");
    expect(week.endDayKey).toBe("2026-09-06");
  });

  it("puts a Monday at the start of its own week, not the end of the last", () => {
    const week = xpWeekOf("2026-08-31");

    expect(week.startDayKey).toBe("2026-08-31");
  });

  /*
   * The ISO rule: week 1 is the week containing the year's first Thursday, so
   * early January can belong to the previous year's last week. Computing from
   * this week's Thursday is what makes those cases fall out rather than need
   * special-casing.
   */
  it("gives early January to the previous year where ISO does", () => {
    /* 2027-01-01 is a Friday, in the week whose Thursday is 2026-12-31. */
    const week = xpWeekOf("2027-01-01");

    expect(week.year).toBe(2026);
    expect(week.week).toBe(53);
  });

  it("gives late December to the next year where ISO does", () => {
    /* 2024-12-30 is a Monday, in the week whose Thursday is 2025-01-02. */
    const week = xpWeekOf("2024-12-30");

    expect(week.year).toBe(2025);
    expect(week.week).toBe(1);
  });

  it("numbers a mid-year week the way SPX did", () => {
    /* SPX's captured board read "Week 23 of 2003" on Thursday 5 June 2003. */
    const week = xpWeekOf("2003-06-05");

    expect(week.year).toBe(2003);
    expect(week.week).toBe(23);
  });

  it("counts every week of a long year", () => {
    expect(xpWeekOf("2020-12-31").week).toBe(53);
  });
});

describe("stepping back a week", () => {
  it("returns the week before, whichever day you start on", () => {
    const week = xpWeekBefore("2026-09-06", 1);

    expect(week.startDayKey).toBe("2026-08-24");
    expect(week.endDayKey).toBe("2026-08-30");
  });

  it("steps across a year boundary without losing the numbering", () => {
    const week = xpWeekBefore("2027-01-01", 1);

    expect(week.endDayKey).toBe("2026-12-27");
    expect(week.week).toBe(52);
  });

  it("returns this week for no offset at all", () => {
    expect(xpWeekBefore("2026-09-06", 0)).toEqual(xpWeekOf("2026-09-06"));
  });
});
