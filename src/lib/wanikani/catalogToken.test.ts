import { describe, expect, it } from "vitest";

import { holdsToken, pickTokenAccount, type TokenAccount } from "./catalogToken";

const account = (over: Partial<TokenAccount>): TokenAccount => ({
  nickname: null,
  joinedByEmail: null,
  wkUsername: null,
  tokenEncrypted: null,
  tokenIv: null,
  tokenTag: null,
  ...over,
});

const connected = (over: Partial<TokenAccount>): TokenAccount =>
  account({ tokenEncrypted: "x", tokenIv: "y", tokenTag: "z", ...over });

describe("whose token the catalogue is read with", () => {
  it("takes the account asked for by name", () => {
    const john = connected({ nickname: "johnmorrisdotca" });
    const choice = pickTokenAccount([connected({ nickname: "testkuma" }), john], "john");
    expect(choice?.account).toBe(john);
    expect(choice?.named).toBe(true);
  });

  /*
   * The bug this exists for: a member matching the name who has never
   * connected used to answer for everybody behind them, and the backfill
   * stopped with "ensure a matching account exists" while a usable token sat
   * two rows down.
   */
  it("looks past a name match that holds no token", () => {
    const usable = connected({ nickname: "testkuma" });
    const choice = pickTokenAccount([account({ nickname: "johnny-no-token" }), usable], "john");
    expect(choice?.account).toBe(usable);
    expect(choice?.named).toBe(false);
  });

  /* Any working token reads the same subjects, so a name nobody has is not fatal. */
  it("falls back to the first connected account when the name matches nobody", () => {
    const first = connected({ nickname: "testkuma" });
    const choice = pickTokenAccount([first, connected({ nickname: "other" })], "nobody");
    expect(choice?.account).toBe(first);
    expect(choice?.named).toBe(false);
  });

  it("has nothing to offer when no account is connected", () => {
    expect(pickTokenAccount([account({ nickname: "john" })], "john")).toBeNull();
    expect(pickTokenAccount([], "john")).toBeNull();
  });

  /* A half-written token cannot be decrypted, so it is not a token. */
  it("counts a token only when all three parts are there", () => {
    expect(holdsToken(connected({}))).toBe(true);
    expect(holdsToken(account({ tokenEncrypted: "x", tokenIv: "y" }))).toBe(false);
    expect(holdsToken(account({ tokenEncrypted: "x", tokenTag: "z" }))).toBe(false);
  });
});
