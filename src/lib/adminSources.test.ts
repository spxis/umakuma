import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { isRefreshable, SOURCE_OPERATIONS, SOURCE_ORIGINS } from "./adminSources";
import { SOURCE_KEY_VALUES, SOURCE_KEYS } from "./sourceCredits";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("how each source is brought up to date", () => {
  it("says where every source lives", () => {
    for (const key of SOURCE_KEY_VALUES) {
      const operation = SOURCE_OPERATIONS[key];
      expect(operation, `${key} has no operation`).toBeTruthy();
      expect(Object.values(SOURCE_ORIGINS)).toContain(operation.origin);
    }
  });

  /*
   * A row draws a button or a command, so a source offering both would draw
   * two remedies for one problem, and a source offering neither would draw a
   * dead end.
   */
  it("gives every source exactly one remedy", () => {
    for (const key of SOURCE_KEY_VALUES) {
      const { endpoint, command } = SOURCE_OPERATIONS[key];
      expect(Boolean(endpoint) !== Boolean(command), `${key} must have one of endpoint or command`).toBe(true);
    }
  });

  /*
   * The point of the split. A file-backed source cannot be refreshed from a
   * web request - Vercel's filesystem is read-only and JMdict alone is a 63MB
   * download - so a button on one would fail every time it was pressed.
   */
  it("offers a button only where a request can honour it", () => {
    for (const key of SOURCE_KEY_VALUES) {
      if (SOURCE_OPERATIONS[key].origin === SOURCE_ORIGINS.file) {
        expect(isRefreshable(key), `${key} is a file and must not offer a refresh button`).toBe(false);
      }
    }
    expect(isRefreshable(SOURCE_KEYS.wanikani)).toBe(true);
    expect(isRefreshable(SOURCE_KEYS.kanjiapi)).toBe(true);
    /* A quarter of a million rows from a multi-hundred-megabyte export. */
    expect(isRefreshable(SOURCE_KEYS.tatoeba)).toBe(false);
  });

  /* A named command that no longer exists is worse than no command at all. */
  it("names only commands package.json actually defines", () => {
    const scripts = JSON.parse(read("package.json")).scripts as Record<string, string>;
    for (const key of SOURCE_KEY_VALUES) {
      const command = SOURCE_OPERATIONS[key].command;
      if (!command) continue;
      const script = command.replace(/^pnpm /, "");
      expect(scripts[script], `${key} names "${command}", which package.json does not define`).toBeTruthy();
    }
  });

  /* And an endpoint that does not exist would fail on the first press. */
  it("points only at admin routes that exist and guard themselves", () => {
    for (const key of SOURCE_KEY_VALUES) {
      const endpoint = SOURCE_OPERATIONS[key].endpoint;
      if (!endpoint) continue;
      const file = `src/app${endpoint}/route.ts`;
      const source = read(file);
      expect(source, `${file} must check who is asking`).toContain("isAuthorizedAdmin");
      expect(source, `${file} must accept a POST`).toContain("export async function POST");
    }
  });

  it("reads every source fresh in the console, never the public cache", () => {
    const route = read("src/app/api/admin/sources/route.ts");
    expect(route).toContain("loadSourceReport");
    expect(route, "the admin asks after a sync; a cached count answers the wrong question").not.toContain(
      "loadCachedSourceReport",
    );
    expect(route).toContain("isAuthorizedAdmin");
    expect(route, "one unreadable source must not take the console down").toContain("allSettled");
  });
});
