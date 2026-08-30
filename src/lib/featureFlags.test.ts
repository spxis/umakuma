import { describe, expect, it } from "vitest";

import {
  FEATURE_FLAG_DEFINITIONS,
  FEATURE_FLAG_VALUES,
  FEATURE_FLAGS,
  isFeatureFlagKey,
  resolveFlagStates,
} from "./featureFlags";

describe("the registry", () => {
  it("defines every flag it declares", () => {
    for (const key of FEATURE_FLAG_VALUES) {
      const definition = FEATURE_FLAG_DEFINITIONS[key];
      expect(definition.key).toBe(key);
      expect(definition.label.length).toBeGreaterThan(0);
      expect(definition.description.length).toBeGreaterThan(0);
    }
  });

  it("keeps the open-signup door shut by default", () => {
    expect(FEATURE_FLAG_DEFINITIONS[FEATURE_FLAGS.openSignup].defaultEnabled).toBe(false);
  });

  it("recognizes only declared keys", () => {
    expect(isFeatureFlagKey(FEATURE_FLAGS.openSignup)).toBe(true);
    expect(isFeatureFlagKey("nonsense")).toBe(false);
    expect(isFeatureFlagKey("")).toBe(false);
  });
});

describe("resolveFlagStates", () => {
  it("reads the default when no row exists", () => {
    const [state] = resolveFlagStates([]);

    expect(state.enabled).toBe(state.defaultEnabled);
    expect(state.stored).toBe(false);
    expect(state.updatedAt).toBeNull();
  });

  it("lets a stored row override the default", () => {
    const states = resolveFlagStates([
      { key: FEATURE_FLAGS.openSignup, enabled: true, updatedAt: new Date("2026-08-30T12:00:00Z") },
    ]);
    const state = states.find((entry) => entry.key === FEATURE_FLAGS.openSignup)!;

    expect(state.enabled).toBe(true);
    expect(state.stored).toBe(true);
    expect(state.updatedAt).toBe("2026-08-30T12:00:00.000Z");
  });

  it("honours a stored row that matches the default, so a deliberate off is not shown as unset", () => {
    const states = resolveFlagStates([
      { key: FEATURE_FLAGS.openSignup, enabled: false, updatedAt: new Date() },
    ]);
    const state = states.find((entry) => entry.key === FEATURE_FLAGS.openSignup)!;

    expect(state.enabled).toBe(false);
    expect(state.stored).toBe(true);
  });

  it("drops rows for flags the code no longer defines", () => {
    const states = resolveFlagStates([{ key: "retired_flag", enabled: true, updatedAt: null }]);

    expect(states.map((state) => state.key)).toEqual([...FEATURE_FLAG_VALUES]);
    expect(states.some((state) => state.key === "retired_flag")).toBe(false);
  });

  it("returns every declared flag exactly once", () => {
    const states = resolveFlagStates([]);
    expect(states.map((state) => state.key).sort()).toEqual([...FEATURE_FLAG_VALUES].sort());
  });

  it("accepts an ISO string updatedAt as well as a Date", () => {
    const states = resolveFlagStates([
      { key: FEATURE_FLAGS.openSignup, enabled: true, updatedAt: "2026-08-30T12:00:00.000Z" },
    ]);
    expect(states[0].updatedAt).toBe("2026-08-30T12:00:00.000Z");
  });
});
