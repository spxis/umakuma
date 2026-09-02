import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const ROUTE = "src/app/api/study/[accountId]/lists/route.ts";
const CARD = "src/app/users/[nickname]/lists/StudyListCard.tsx";

/**
 * Renaming a saved list.
 *
 * A member makes these lists, so they get to change their minds about what one
 * is called. The page offered create and delete, which meant a typo in "Week 1"
 * could only be fixed by deleting the list and picking every character again.
 */
describe("renaming a list", () => {
  it("has a verb of its own", () => {
    expect(read(ROUTE)).toContain("export async function PATCH");
  });

  /*
   * Not folded into POST. Saving under an existing name updates that list's
   * characters - that is deliberate, it is how rebuilding this week's set
   * works - so a rename expressed as a save would overwrite the contents of
   * whatever list already held the new name.
   */
  it("does not reuse the save route, which would overwrite the target", () => {
    const route = read(ROUTE);
    const patch = route.slice(route.indexOf("export async function PATCH"));
    expect(patch).not.toContain("upsert");
  });

  /*
   * PATCH carries the character editor too now, so "it never mentions
   * characters" is no longer the way to say a rename leaves the contents
   * alone. What says it instead is that the update is assembled field by
   * field: a body with only a name puts only a name in `data`, so a rename
   * cannot empty a list and an edit cannot rename one.
   */
  it("writes only the fields it was sent", () => {
    const route = read(ROUTE);
    const patch = route.slice(route.indexOf("export async function PATCH"));

    expect(patch).toMatch(/if \(parsed\.data\.name !== undefined\)/);
    expect(patch).toMatch(/parsed\.data\.items === undefined/);
    /* Whatever was gathered, and nothing assumed alongside it. */
    expect(patch).toMatch(/updateMany\(\{[\s\S]*?data,\s*\}\)/);
  });

  /*
   * The account is part of the write, not a check made before it. An id
   * belonging to somebody else has to match nothing rather than be looked up
   * and then trusted.
   */
  it("scopes the write to the account", () => {
    const route = read(ROUTE);
    const patch = route.slice(route.indexOf("export async function PATCH"));
    expect(patch).toContain("canAccessAccount");
    expect(patch).toMatch(/updateMany\(\{\s*where: \{ id: parsed\.data\.id, accountId \}/);
  });

  /*
   * `@@unique([accountId, name])` is what makes two lists with one name
   * impossible. Renaming onto a taken name has no sensible merge, so it must
   * come back as something the member can act on.
   */
  it("answers a taken name with a 409, not a 500", () => {
    const route = read(ROUTE);
    const patch = route.slice(route.indexOf("export async function PATCH"));
    expect(patch).toContain("isDuplicateListNameError");
    expect(patch).toContain("status: 409");
  });

  /* A rename that only added spaces is still a rename the member can undo. */
  it("normalizes the new name the same way saving does", () => {
    const route = read(ROUTE);
    expect(route.match(/normalizeListName\(/g)?.length).toBeGreaterThanOrEqual(2);
  });

  /*
   * Deleting is optimistic because it almost never fails; renaming is not,
   * because colliding with a name you already use is ordinary. The editor has
   * to stay open holding what was typed, or the member loses it to a flash of
   * the old name.
   */
  it("keeps the editor open when the server refuses", () => {
    const card = read(CARD);
    const save = card.slice(card.indexOf("async function save()"));
    const refusal = save.indexOf("if (!response.ok)");
    const accepted = save.indexOf("onRenamed(");
    expect(refusal).toBeGreaterThan(-1);
    expect(accepted).toBeGreaterThan(refusal);

    // The refusal branch reports and leaves; closing happens only after success.
    const branch = save.slice(refusal, accepted);
    expect(branch).toContain("setError(body?.error");
    expect(branch).toContain("return;");
    expect(branch, "the editor must not close on a refusal").not.toContain('setMode("none")');
  });

  /* Escape gets out of it, the way every other inline editor here does. */
  it("can be abandoned from the keyboard", () => {
    expect(read(CARD)).toContain('event.key === "Escape"');
  });

  /* The member's typing is capped where the database caps it, not after. */
  it("caps the field at the stored length", () => {
    expect(read(CARD)).toContain("maxLength={STUDY_LIST_LIMITS.nameLength}");
  });
});
