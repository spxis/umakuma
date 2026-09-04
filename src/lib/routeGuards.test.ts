import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const API_ROOT = join(process.cwd(), "src/app/api");

/**
 * The site is for members. Everything is closed unless it is named here.
 *
 * This was the other way round, and it cost us: a route was public unless
 * somebody remembered to guard it, and two never did. `/api/accounts/[id]/jlpt`
 * and `/api/accounts/[id]/levels/[level]` both took an account id from the path
 * and read that member's encrypted WaniKani token - one of them decrypted it
 * and called WaniKani - with no check on who was asking. A stranger holding an
 * id got that member's own progress back, and could ask as often as they liked.
 *
 * Being open is now a decision somebody has to write down, with a reason. A new
 * route that forgets to check fails here rather than in production, and adding
 * one to this list is a deliberate act a reviewer can see in the diff.
 */
const PUBLIC_ROUTES: Record<string, string> = {
  "auth/[...nextauth]/route.ts":
    "NextAuth's own callback endpoints. Signing in cannot require being signed in.",
  "invite/session/route.ts":
    "Where an invite code is exchanged for a session. Rate limited, 12 attempts per 10 minutes per IP.",
  "search/route.ts":
    "The shared catalogue, no personal data, no database. Rate limited and cached at the edge.",
  "sentences/route.ts":
    "Tatoeba example sentences for one character. They belong to Tatoeba rather than to any member, and every surface showing a kanji can ask - but unlike the static catalogues this one does reach the database, so it is rate limited for that reason.",
  "radicals/route.ts":
    "The RADKFILE radical index, read from a file. No database, no member data - the same public catalogue the search route serves, and rate limited the same way.",
  "school-grades/route.ts": "Static school-grade catalogue. No database, cached publicly.",
  "school-grades/[grade]/route.ts": "Static school-grade catalogue. No database, cached publicly.",
  "school-grades/kanji/[character]/route.ts":
    "Static school-grade catalogue. No database, cached publicly.",
  "joyo-readings/[character]/route.ts": "Static jōyō readings. No database, cached publicly.",
  "stroke-order/[character]/route.ts": "Static KanjiVG stroke data. No database, cached publicly.",
  "uk-ladder/route.ts":
    "The UmaKuma curriculum itself - which of our hundred levels teaches each radical, kanji and word. It has one answer for everybody and no member appears in it, so somebody deciding whether to start here can read all hundred levels before making an account, the way they can already read the JLPT lists. It does reach the database, for WaniKani's words, but only through the ten-minute crosswalk cache rather than per request. A member's own progress over these items is a different route, and that one is guarded.",
  "reading-books/cover/route.ts":
    "Book covers for the public reading pages. Reads no member data, but does query the database and call two external APIs - rate limited for that reason.",
};

/** How a route says it has checked who is asking. */
const GUARDS = [
  "canAccessAccount",
  "loadStudyAccount",
  "isAuthorizedAdmin",
  "getServerSession",
  "x-admin-key",
];

function apiRoutes(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name === "route.ts") found.push(relative(API_ROOT, full).replace(/\\/g, "/"));
    }
  };
  walk(API_ROOT);
  return found.sort();
}

describe("every API route is closed unless it says otherwise", () => {
  const routes = apiRoutes();

  it("finds the routes at all", () => {
    expect(routes.length).toBeGreaterThan(20);
  });

  it.each(apiRoutes())("%s either checks the caller or is listed as public", (route) => {
    const source = readFileSync(join(API_ROOT, route), "utf8");
    const guarded = GUARDS.some((guard) => source.includes(guard));
    const declaredPublic = route in PUBLIC_ROUTES;

    if (guarded) {
      return;
    }

    expect(
      declaredPublic,
      `${route} checks nobody and is not in PUBLIC_ROUTES. Either guard it, or add it there with the reason it is safe to leave open.`,
    ).toBe(true);
  });

  /*
   * A route that was opened deliberately and later guarded should come off the
   * list, or the list stops describing what is actually public.
   */
  it.each(Object.keys(PUBLIC_ROUTES))("%s is still genuinely public", (route) => {
    expect(routes, `${route} is listed as public but no longer exists`).toContain(route);
  });

  /*
   * An open endpoint that reaches the database or an external API is how a
   * stranger turns our bill into their toy. Those must at least be throttled.
   */
  it.each(Object.keys(PUBLIC_ROUTES))("%s is rate limited if it costs anything", (route) => {
    const source = readFileSync(join(API_ROOT, route), "utf8");
    const costs = /prisma\.|await fetch\(|wanikaniFetch/.test(source);
    if (!costs || route.startsWith("auth/")) {
      return;
    }

    expect(
      /rateLimit|RateLimit|consumeInviteAttempt/.test(source),
      `${route} is public and does real work, so it needs a rate limit`,
    ).toBe(true);
  });
});
