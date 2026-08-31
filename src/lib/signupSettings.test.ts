import { describe, expect, it } from "vitest";

import { ACCOUNT_VISIBILITY } from "./accountVisibility";
import {
  SIGNUP_MODES,
  SIGNUP_SETTING_KEYS,
  allowsSelfSignup,
  isValidSettingValue,
  requiresApproval,
  resolveSignupSettings,
} from "./signupSettings";

describe("resolveSignupSettings", () => {
  /*
   * The door starts shut. Open signup lets strangers create rows on a site a
   * family uses daily, so it has to be switched on deliberately rather than
   * arriving with a deploy.
   */
  it("keeps signup closed when nothing has been configured", () => {
    const settings = resolveSignupSettings([]);
    expect(settings.mode).toBe(SIGNUP_MODES.inviteOnly);
    expect(allowsSelfSignup(settings)).toBe(false);
  });

  it("starts a new member private and asks them both questions", () => {
    const settings = resolveSignupSettings([]);
    expect(settings.defaultVisibility).toBe(ACCOUNT_VISIBILITY.private);
    expect(settings.askVisibility).toBe(true);
    expect(settings.askDisplayName).toBe(true);
  });

  it("reads what the admin chose", () => {
    const settings = resolveSignupSettings([
      { key: SIGNUP_SETTING_KEYS.mode, value: SIGNUP_MODES.openPending },
      { key: SIGNUP_SETTING_KEYS.defaultVisibility, value: ACCOUNT_VISIBILITY.family },
      { key: SIGNUP_SETTING_KEYS.askVisibility, value: "false" },
    ]);

    expect(settings.mode).toBe(SIGNUP_MODES.openPending);
    expect(settings.defaultVisibility).toBe(ACCOUNT_VISIBILITY.family);
    expect(settings.askVisibility).toBe(false);
    // Untouched settings keep their default rather than becoming undefined.
    expect(settings.askDisplayName).toBe(true);
  });

  /*
   * One bad row must not take the others down: these settings are read on
   * pages every visitor loads, so a stale or hand-edited value should degrade
   * to the safe default rather than throw.
   */
  it("falls back per field when a stored value is not recognized", () => {
    const settings = resolveSignupSettings([
      { key: SIGNUP_SETTING_KEYS.mode, value: "everyone-welcome" },
      { key: SIGNUP_SETTING_KEYS.defaultVisibility, value: ACCOUNT_VISIBILITY.public },
    ]);

    expect(settings.mode).toBe(SIGNUP_MODES.inviteOnly);
    expect(settings.defaultVisibility).toBe(ACCOUNT_VISIBILITY.public);
  });

  it("ignores rows for settings that no longer exist", () => {
    expect(() => resolveSignupSettings([{ key: "signup_ask_favourite_colour", value: "true" }])).not.toThrow();
  });
});

describe("requiresApproval", () => {
  it("holds a new account only in the approval mode", () => {
    expect(requiresApproval(resolveSignupSettings([{ key: SIGNUP_SETTING_KEYS.mode, value: SIGNUP_MODES.openPending }]))).toBe(true);
    expect(requiresApproval(resolveSignupSettings([{ key: SIGNUP_SETTING_KEYS.mode, value: SIGNUP_MODES.openImmediate }]))).toBe(false);
  });
});

describe("isValidSettingValue", () => {
  it("accepts what each setting actually allows", () => {
    expect(isValidSettingValue(SIGNUP_SETTING_KEYS.mode, SIGNUP_MODES.openPending)).toBe(true);
    expect(isValidSettingValue(SIGNUP_SETTING_KEYS.defaultVisibility, ACCOUNT_VISIBILITY.private)).toBe(true);
    expect(isValidSettingValue(SIGNUP_SETTING_KEYS.askVisibility, "true")).toBe(true);
  });

  it("refuses a value from the wrong setting", () => {
    expect(isValidSettingValue(SIGNUP_SETTING_KEYS.mode, ACCOUNT_VISIBILITY.private)).toBe(false);
    expect(isValidSettingValue(SIGNUP_SETTING_KEYS.askVisibility, "yes")).toBe(false);
  });
});
