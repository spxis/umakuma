import { describe, expect, it } from "vitest";

import { STUDY_TAGS } from "@/lib/domainConstants";

import { parseStudyTagFilter, resolveStudyTagFilter, studyTagFilterLabel } from "./studyTagFilterState";

describe("parseStudyTagFilter", () => {
  it("accepts the three known values", () => {
    expect(parseStudyTagFilter("all")).toBe("all");
    expect(parseStudyTagFilter(STUDY_TAGS.trouble)).toBe(STUDY_TAGS.trouble);
    expect(parseStudyTagFilter(STUDY_TAGS.favorite)).toBe(STUDY_TAGS.favorite);
  });

  it("rejects anything else", () => {
    expect(parseStudyTagFilter("burned")).toBeNull();
    expect(parseStudyTagFilter("")).toBeNull();
    expect(parseStudyTagFilter(null)).toBeNull();
  });
});

describe("resolveStudyTagFilter", () => {
  it("prefers the URL over the stored value", () => {
    const params = new URLSearchParams(`tag=${STUDY_TAGS.favorite}`);
    expect(resolveStudyTagFilter(params, STUDY_TAGS.trouble)).toBe(STUDY_TAGS.favorite);
  });

  it("defaults to all when neither source says anything", () => {
    expect(resolveStudyTagFilter(new URLSearchParams(), null)).toBe("all");
  });

  /*
   * The stored value outliving the URL is what made this filter hard to escape:
   * dropping ?tag=trouble by hand still resolved to trouble, and the URL effect
   * then wrote the parameter back. The behaviour is intentional (the choice
   * should survive a reload), so the escape hatch is the visible chip rather
   * than a change here.
   */
  it("falls back to the stored value when the URL is bare", () => {
    expect(resolveStudyTagFilter(new URLSearchParams(), STUDY_TAGS.trouble)).toBe(STUDY_TAGS.trouble);
  });

  it("ignores a stored value it cannot parse", () => {
    expect(resolveStudyTagFilter(new URLSearchParams(), "nonsense")).toBe("all");
  });
});

describe("studyTagFilterLabel", () => {
  it("labels an active filter so the narrowed queue is explained", () => {
    expect(studyTagFilterLabel(STUDY_TAGS.trouble)).toBe("Trouble only");
    expect(studyTagFilterLabel(STUDY_TAGS.favorite)).toBe("Favourites only");
  });

  it("returns nothing to render when the whole queue is shown", () => {
    expect(studyTagFilterLabel("all")).toBeNull();
  });
});
