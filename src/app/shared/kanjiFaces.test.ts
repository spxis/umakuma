import { describe, expect, it } from "vitest";

import { KANJI_FACES } from "./kanjiFaces";

describe("the faces beside the stroke order", () => {
  it("are four, for a two-by-two grid", () => {
    expect(KANJI_FACES).toHaveLength(4);
  });

  it("include the textbook and brush faces a learner meets", () => {
    expect(KANJI_FACES.map((face) => face.id)).toEqual(["gothic", "mincho", "textbook", "brush"]);
  });

  it("each draw from a different family, or two cells would show the same shape", () => {
    expect(new Set(KANJI_FACES.map((face) => face.fontFamily)).size).toBe(4);
  });

  it("each have a name to say on hover", () => {
    for (const face of KANJI_FACES) expect(face.label.length).toBeGreaterThan(0);
  });
});
