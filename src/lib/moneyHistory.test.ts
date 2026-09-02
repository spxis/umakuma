import { describe, expect, it } from "vitest";

import {
  AVERAGE_WINDOW_DAYS,
  EARLIEST_RATE_DAY,
  LOOKBACKS,
  averageRates,
  formatChange,
  lookbackWindow,
  lookbackWindows,
  toIsoDay,
} from "./moneyHistory";

const TODAY = "2026-09-02";
const byId = (id: string) => LOOKBACKS.find((lookback) => lookback.id === id)!;

describe("lookbackWindow", () => {
  it("ends a month-long window on the day it looks back to", () => {
    const window = lookbackWindow(TODAY, byId("y1"))!;
    expect(window.end).toBe("2025-09-02");
    expect(window.start).toBe("2025-08-04");
  });

  /* Years counted as years, so twenty years back is the same date, not five days off. */
  it("counts years as years rather than as 365 days", () => {
    expect(lookbackWindow(TODAY, byId("y20"))!.end).toBe("2006-09-02");
    expect(lookbackWindow(TODAY, byId("y5"))!.end).toBe("2021-09-02");
  });

  it("counts the short lookback in days", () => {
    expect(lookbackWindow(TODAY, byId("d180"))!.end).toBe("2026-03-06");
  });

  it("averages the same number of days at every point", () => {
    for (const lookback of LOOKBACKS) {
      const { start, end } = lookbackWindow(TODAY, lookback)!;
      const days = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000;
      expect(days + 1, lookback.id).toBe(AVERAGE_WINDOW_DAYS);
    }
  });

  /*
   * The ECB's rates begin with the euro itself. A window reaching past that is
   * not a thin answer, it is no answer.
   */
  it("refuses a window that reaches past the first published rates", () => {
    expect(lookbackWindow("2018-01-01", byId("y20"))).toBeNull();
    expect(lookbackWindow(EARLIEST_RATE_DAY, byId("d180"))).toBeNull();
  });
});

describe("lookbackWindows", () => {
  it("offers all five points once the data goes back far enough", () => {
    expect(lookbackWindows(TODAY).map((window) => window.lookback.id)).toEqual([
      "d180",
      "y1",
      "y5",
      "y10",
      "y20",
    ]);
  });

  it("drops only the points the data cannot reach", () => {
    expect(lookbackWindows("2015-06-01").map((window) => window.lookback.id)).toEqual([
      "d180",
      "y1",
      "y5",
      "y10",
    ]);
  });
});

describe("averageRates", () => {
  it("averages each currency across the days it was published", () => {
    const table = averageRates("EUR", "2025-09-02", {
      "2025-08-29": { JPY: 180, CAD: 1.6 },
      "2025-09-01": { JPY: 190, CAD: 1.8 },
    })!;

    expect(table.rates.JPY).toBeCloseTo(185, 10);
    expect(table.rates.CAD).toBeCloseTo(1.7, 10);
    expect(table.date).toBe("2025-09-02");
    expect(table.base).toBe("EUR");
  });

  /*
   * The published set has changed over twenty years, so a currency present on
   * only some days still has a real average for the days it was there.
   */
  it("averages a currency over the days it has, not the days in the window", () => {
    const table = averageRates("EUR", "2006-09-02", {
      "2006-08-30": { JPY: 140 },
      "2006-08-31": { JPY: 150, CAD: 1.4 },
    })!;

    expect(table.rates.JPY).toBeCloseTo(145, 10);
    expect(table.rates.CAD).toBeCloseTo(1.4, 10);
  });

  it("answers nothing for a window that published nothing", () => {
    expect(averageRates("EUR", "2026-01-01", {})).toBeNull();
    expect(averageRates("EUR", "2026-01-01", { "2026-01-01": {} })).toBeNull();
  });
});

describe("formatChange", () => {
  /* From then to now, which is the direction the row reads. */
  it("measures from then to now", () => {
    expect(formatChange(4269, 2986)).toBe("+43%");
    expect(formatChange(2986, 4269)).toBe("−30%");
  });

  it("keeps a decimal place while the move is small", () => {
    expect(formatChange(104, 100)).toBe("+4.0%");
    expect(formatChange(96.5, 100)).toBe("−3.5%");
  });

  /* +0.0% reads like a rounding error being reported as news. */
  it("says a hair's movement is no movement", () => {
    expect(formatChange(100.02, 100)).toBe("0%");
  });

  it("answers nothing when there is nothing to measure against", () => {
    expect(formatChange(100, 0)).toBeNull();
    expect(formatChange(Number.NaN, 100)).toBeNull();
  });
});

describe("toIsoDay", () => {
  it("writes the day the API writes, in UTC", () => {
    expect(toIsoDay(new Date("2026-09-02T23:30:00Z"))).toBe("2026-09-02");
  });
});
