import { describe, expect, it } from "vitest";

import { SIM_PERSONAS, simPersonaById } from "@/lib/xp/simPersonas";

import { draftFromPersona, overridesFromDraft } from "./AdminBalanceSimulator.types";

const persona = () => simPersonaById("morning-and-night")!;

describe("the persona draft", () => {
  it("round-trips a persona through the fields unchanged", () => {
    for (const entry of SIM_PERSONAS) {
      const overrides = overridesFromDraft(draftFromPersona(entry), entry);
      expect(overrides.attendance).toBe(entry.attendance);
      expect(overrides.reviewsPerDay).toBe(entry.reviewsPerDay);
      expect(overrides.accuracy).toBe(entry.accuracy);
      expect(overrides.sessionHours).toEqual(entry.sessionHours);
      expect(overrides.startLevel).toBe(entry.startLevel);
      expect(overrides.sitsExams).toBe(entry.sitsExams);
    }
  });

  it("reads a comma-separated list of hours, and ignores what is not one", () => {
    const draft = { ...draftFromPersona(persona()), sessionHours: "7, 13 , 21, 99, nonsense" };
    expect(overridesFromDraft(draft, persona()).sessionHours).toEqual([7, 13, 21]);
  });

  it("keeps the persona's own sittings rather than leaving them empty", () => {
    const draft = { ...draftFromPersona(persona()), sessionHours: "  " };
    expect(overridesFromDraft(draft, persona()).sessionHours).toEqual(persona().sessionHours);
  });

  it("leaves an emptied or half-typed box alone rather than reading it as zero", () => {
    const draft = { ...draftFromPersona(persona()), accuracy: "", reviewsPerDay: "-" };
    const overrides = overridesFromDraft(draft, persona());
    /* `Number("")` is zero, so without care an emptied accuracy box asks for
       somebody who is wrong every single time. */
    expect("accuracy" in overrides).toBe(false);
    expect("reviewsPerDay" in overrides).toBe(false);
  });

  it("still lets a deliberate zero through", () => {
    const draft = { ...draftFromPersona(persona()), gamesPerDay: "0" };
    expect(overridesFromDraft(draft, persona()).gamesPerDay).toBe(0);
  });
});
