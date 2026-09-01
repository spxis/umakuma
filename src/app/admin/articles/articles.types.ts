import type { ComponentType } from "react";

/**
 * One written article.
 *
 * Articles are components rather than markdown files: the site has no markdown
 * renderer and adding one to read four internal notes is a dependency for
 * nothing, while a component gets the site's own type, spacing and colours for
 * free and cannot drift from them. The cost is that an article is code, which
 * is the right cost when the person writing them is also writing the code.
 */
export type Article = {
  /** The URL segment, and the id everything else keys on. */
  slug: string;
  title: string;
  /** One sentence, shown on the index under the title. */
  summary: string;
  /** Vancouver day, `YYYY-MM-DD`, like every other date in the app. */
  publishedAt: string;
  /** Roughly how long the prose runs, so the index can say. */
  words: number;
  Body: ComponentType;
};
