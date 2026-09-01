import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { checkRateLimit } from "./apiRateLimit";
import { SIGNUP_RATE_LIMIT } from "./signupSettings";

/**
 * `/api/signup` had no limit on it.
 *
 * Lower than it first looked: the route needs a Google session before it does
 * anything, and an address that already has an account gets that account back
 * rather than a second one - so the ceiling was always one account per address,
 * not one per request. What was unbounded was the *work*. Every call reads the
 * signup settings, looks the account up, and scans every existing slug to pick
 * a free one, and a signed-in caller could repeat that as fast as they liked.
 */

/* Each test takes its own key, because the limiter's store is module state. */
let counter = 0;
const freshKey = () => `signup:test-${(counter += 1)}@example.com`;

describe("the signup limit", () => {
  it("lets an ordinary signup through", () => {
    expect(checkRateLimit(freshKey(), SIGNUP_RATE_LIMIT).allowed).toBe(true);
  });

  /* A form submitted twice, a retry and a reload all have to survive it. */
  it("leaves room for a few repeats", () => {
    const key = freshKey();
    for (let attempt = 1; attempt <= SIGNUP_RATE_LIMIT.maxRequests; attempt += 1) {
      expect(checkRateLimit(key, SIGNUP_RATE_LIMIT).allowed, `attempt ${attempt}`).toBe(true);
    }
  });

  it("stops the one after that", () => {
    const key = freshKey();
    for (let attempt = 0; attempt < SIGNUP_RATE_LIMIT.maxRequests; attempt += 1) {
      checkRateLimit(key, SIGNUP_RATE_LIMIT);
    }

    const blocked = checkRateLimit(key, SIGNUP_RATE_LIMIT);
    expect(blocked.allowed).toBe(false);
    expect(blocked.resetSeconds).toBeGreaterThan(0);
  });

  /*
   * The key is the signed-in address, not the caller's IP. A household shares
   * one IP - this one does - so an IP budget would have the second person in a
   * family locked out by the first.
   */
  it("gives each address its own budget", () => {
    const one = freshKey();
    const two = freshKey();
    for (let attempt = 0; attempt <= SIGNUP_RATE_LIMIT.maxRequests; attempt += 1) {
      checkRateLimit(one, SIGNUP_RATE_LIMIT);
    }

    expect(checkRateLimit(one, SIGNUP_RATE_LIMIT).allowed).toBe(false);
    expect(checkRateLimit(two, SIGNUP_RATE_LIMIT).allowed).toBe(true);
  });

  it("is generous enough to be a guard rather than a gate", () => {
    expect(SIGNUP_RATE_LIMIT.maxRequests).toBeGreaterThanOrEqual(3);
    expect(SIGNUP_RATE_LIMIT.windowMs).toBeGreaterThanOrEqual(60 * 1000);
  });
});

describe("the route applies it", () => {
  const source = readFileSync(join(process.cwd(), "src/app/api/signup/route.ts"), "utf8");
  /* The call, not the import - which sits above everything and proves nothing. */
  const callAt = source.indexOf("checkRateLimit(`");

  it("keys on the address rather than the IP", () => {
    expect(source).toContain("checkRateLimit(`signup:${email}`");
    expect(source, "an IP key would share one budget across a household").not.toContain(
      "getClientIp",
    );
  });

  /*
   * Order is the whole point. Below the check are the settings read, the
   * account lookup and the slug scan; a limit applied after any of them would
   * bound the answer without bounding the work.
   */
  it("checks before it does any work", () => {
    expect(callAt).toBeGreaterThan(0);
    for (const work of ["loadSignupSettings()", "prisma.account.findFirst", "prisma.account.findMany"]) {
      expect(source.indexOf(work), `${work} must come after the limit`).toBeGreaterThan(callAt);
    }
  });

  /* An unauthenticated caller is turned away before it, and costs nothing. */
  it("still answers a signed-out caller first", () => {
    expect(source.indexOf("Sign in first.")).toBeLessThan(callAt);
  });
});
