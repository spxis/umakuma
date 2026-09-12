import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/*
 * Both views of a map set say the same words for a prefecture.
 *
 * The list view draws a SubjectPill, which prints the reading under あ and
 * the reading-and-English pair under Both. The shapes view built its caption
 * from the same `pillWords` but handed it the name as written, so under Both
 * a shape read 岐阜県 / Gifu beside a pill reading ぎふ / Gifu. John: "we are
 * missing the hiragana." Asserted over the source, because the shapes branch
 * only renders once a geo dataset has loaded and the wrong argument is a
 * one-word difference that a render test would need a fixture map to see.
 */
describe("a map set's shapes view", () => {
  const source = readFileSync(`${__dirname}/YourMapSets.tsx`, "utf8");

  it("captions a shape with the reading, like the pill beside it", () => {
    expect(source).toMatch(/pillWords\(mode, region\.reading \?\? null, region\.name\)/);
    expect(source).not.toMatch(/pillWords\(mode, region\.nameNative/);
  });

  /* The outline is the glyph: the written name sits under the shape, above
     the words line, in every mode but Off - which is the quiz, and hides it. */
  it("keeps the kanji under the shape in every mode but Off", () => {
    const shapes = source.slice(source.indexOf('view === "shapes"'), source.indexOf("/**", source.indexOf('view === "shapes"')));
    expect(shapes).toContain("{region.nameNative}");
    expect(shapes).toContain('region.nameNative && mode !== "off"');
    expect(shapes.indexOf("{region.nameNative}")).toBeLessThan(shapes.indexOf("{words}"));
  });

  it("marks the caption as Japanese whenever it carries the reading", () => {
    /* Only the English-only mode is not Japanese; あ and Both both are. */
    expect(source).toContain('lang={mode === "english" ? undefined : "ja"}');
  });
});
