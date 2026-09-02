import { describe, expect, it } from "vitest";

import { LIST_ITEM_KINDS } from "@/lib/domainConstants";

import { sortListCards } from "./sortListCards";
import type { ListCard } from "./StudyList.types";

const card = (name: string, keys: string[], updatedAt: string): ListCard => ({
  id: name,
  name,
  items: keys.map((key) => ({ kind: LIST_ITEM_KINDS.kanji, key })),
  count: keys.length,
  updatedAt,
  tag: null,
  href: null,
  visibility: null,
});

const cards = [
  card("Week 2", ["火", "水"], "2026-08-20T00:00:00Z"),
  card("Week 1", ["日", "月", "火"], "2026-08-10T00:00:00Z"),
  card("Tricky ones", ["水"], "2026-09-01T00:00:00Z"),
];

describe("searching and sorting the saved lists", () => {
  it("opens last changed first, as the page always did", () => {
    expect(sortListCards(cards, "updated", false, "").map((c) => c.name)).toEqual(["Tricky ones", "Week 2", "Week 1"]);
  });

  it("sorts by name and by size", () => {
    expect(sortListCards(cards, "name", false, "").map((c) => c.name)).toEqual(["Tricky ones", "Week 1", "Week 2"]);
    expect(sortListCards(cards, "size", false, "").map((c) => c.name)).toEqual(["Week 1", "Week 2", "Tricky ones"]);
  });

  it("reverses the same order rather than choosing another", () => {
    expect(sortListCards(cards, "name", true, "").map((c) => c.name)).toEqual(["Week 2", "Week 1", "Tricky ones"]);
  });

  it("finds a list by its name or by what it holds", () => {
    expect(sortListCards(cards, "updated", false, "week").map((c) => c.name)).toEqual(["Week 2", "Week 1"]);
    expect(sortListCards(cards, "updated", false, "水").map((c) => c.name)).toEqual(["Tricky ones", "Week 2"]);
  });
});
