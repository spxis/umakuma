import { describe, expect, it } from "vitest";

import { ARTICLES, findArticle, listArticles, readingMinutes } from "./articles";
import { WORDS_PER_MINUTE } from "./Articles.constants";

describe("the article list", () => {
  it("gives every article a body and a summary to be listed by", () => {
    for (const article of ARTICLES) {
      expect(article.title, `${article.slug} needs a title`).toBeTruthy();
      expect(article.summary, `${article.slug} needs a summary`).toBeTruthy();
      expect(article.Body, `${article.slug} needs a body`).toBeTypeOf("function");
      expect(article.words, `${article.slug} needs a length`).toBeGreaterThan(0);
    }
  });

  /* The slug is the URL and the lookup key, so a duplicate hides an article. */
  it("keeps every slug distinct and URL-shaped", () => {
    const slugs = ARTICLES.map((article) => article.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug, `${slug} should be lowercase and hyphenated`).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("dates each article by a Vancouver day, like everything else here", () => {
    for (const article of ARTICLES) {
      expect(article.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(article.publishedAt))).toBe(false);
    }
  });
});

describe("listArticles", () => {
  it("puts the newest first", () => {
    const dates = listArticles().map((article) => article.publishedAt);
    expect([...dates].sort((left, right) => right.localeCompare(left))).toEqual(dates);
  });
});

describe("findArticle", () => {
  it("finds one by slug", () => {
    const first = ARTICLES[0]!;
    expect(findArticle(first.slug)?.title).toBe(first.title);
  });

  it("returns nothing for a slug that does not exist, so the page can 404", () => {
    expect(findArticle("no-such-article")).toBeNull();
    expect(findArticle("")).toBeNull();
  });
});

describe("readingMinutes", () => {
  it("rounds to whole minutes", () => {
    expect(readingMinutes(WORDS_PER_MINUTE * 3)).toBe(3);
  });

  /* "0 min read" reads as broken rather than as short. */
  it("never says zero", () => {
    expect(readingMinutes(1)).toBe(1);
    expect(readingMinutes(0)).toBe(1);
  });
});
