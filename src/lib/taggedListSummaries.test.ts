import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/*
 * The two lists every member has.
 *
 * Trouble and Favourites are lists in every sense a member cares about - named,
 * full of subjects, the thing you practise from - but they are tag rows rather
 * than `StudyList` rows, so the page whose whole job is showing a member their
 * lists was the one place they did not appear. They could only be reached
 * through a panel opened by a button somewhere else.
 */
describe("the built-in lists on the lists page", () => {
  it("fetches them alongside the saved ones", () => {
    const page = read("src/app/users/[nickname]/lists/page.tsx");
    expect(page).toContain("fetchTaggedListSummaries");
    expect(page).toContain("taggedLists={taggedLists}");
  });

  /*
   * Both, always, empty ones included - "you have no favourites yet" is an
   * answer to the question a member came here with, and a missing card is not.
   */
  it("returns both tags whether or not they hold anything", () => {
    const lib = read("src/lib/studySubjectTags.ts");
    expect(lib).toContain("STUDY_TAG_VALUES.map");
  });

  /*
   * A tagged sheet is addressed by its source rather than by the characters on
   * the card. The card previews a couple of dozen at most, and printing the
   * preview instead of the list would silently drop the rest.
   */
  it("sends a built-in list to the sheet by source, not by preview", () => {
    /* The source is the address now: `/practice/trouble`, not `?source=trouble`. */
    const cards = read("src/app/users/[nickname]/lists/StudyListCards.tsx");
    expect(cards).toContain("`${practicePath}/${card.tag}`");
  });

  /*
   * They cannot be deleted, because there is nothing to delete: untagging the
   * last item empties the list, it does not remove it. The card offers Open
   * instead, which is the panel the rest of the site already opens.
   */
  it("offers Open rather than Rename or Delete on a built-in list", () => {
    const card = read("src/app/users/[nickname]/lists/StudyListCard.tsx");

    const tagCheck = card.indexOf("card.tag ? (");
    const ownerCheck = card.indexOf("canEdit ? (");
    expect(card).toContain("openStudyTagLists");
    expect(tagCheck).toBeGreaterThan(-1);

    /*
     * Both editing actions sit on the non-tagged branch, so a permanent list
     * cannot reach either of them however the card is rendered.
     */
    for (const marker of ["onClick={startEditing}", "onClick={onDelete}"]) {
      const at = card.indexOf(marker);
      expect(at, `${marker} is missing`).toBeGreaterThan(-1);
      expect(at).toBeGreaterThan(ownerCheck);
    }
    expect(ownerCheck).toBeGreaterThan(tagCheck);
  });

  /* The subtitle stopped being true the moment two unbuilt lists appeared. */
  it("no longer tells the member every list here was hand-built", async () => {
    const { STUDY_LIST_COPY } = await import("@/app/shared/studyListCopy");
    expect(STUDY_LIST_COPY.subtitle).not.toContain("built by hand");
    expect(STUDY_LIST_COPY.subtitle).toContain("Trouble");
  });
});
