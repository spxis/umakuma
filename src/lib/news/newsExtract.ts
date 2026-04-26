import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

import type { NewsArticle, NewsArticleBlock } from "./newsTypes";
import { getCachedArticle, newsCacheKey, setCachedArticle } from "./newsCache";
import { fetchNewsHtml, type NewsHttpError } from "./newsHttp";

const MIN_TEXT_LENGTH = 400;

export type NewsExtractError =
  | { kind: "invalid_url" }
  | { kind: "blocked_host" }
  | { kind: "not_article" }
  | NewsHttpError;

export type NewsExtractResult =
  | { ok: true; article: NewsArticle }
  | { ok: false; error: NewsExtractError };

export async function extractArticle(rawUrl: string): Promise<NewsExtractResult> {
  const parsed = parseAllowedUrl(rawUrl);
  if (!parsed) {
    return { ok: false, error: { kind: "invalid_url" } };
  }
  if (isBlockedHost(parsed.hostname)) {
    return { ok: false, error: { kind: "blocked_host" } };
  }

  const cacheKey = newsCacheKey(parsed.toString());
  const cached = getCachedArticle(cacheKey);
  if (cached) {
    return { ok: true, article: cached };
  }

  const fetched = await fetchNewsHtml(parsed.toString());
  if (!fetched.ok) {
    return { ok: false, error: fetched.error };
  }

  const dom = new JSDOM(fetched.html, { url: fetched.finalUrl });
  const reader = new Readability(dom.window.document);
  const parsedArticle = reader.parse();

  if (!parsedArticle || !parsedArticle.content) {
    return { ok: false, error: { kind: "not_article" } };
  }

  const blocks = htmlToBlocks(parsedArticle.content, fetched.finalUrl);
  const textLength = blocks.reduce((sum, block) => sum + block.text.length, 0);

  if (textLength < MIN_TEXT_LENGTH || blocks.length === 0) {
    return { ok: false, error: { kind: "not_article" } };
  }

  const article: NewsArticle = {
    url: rawUrl,
    finalUrl: fetched.finalUrl,
    title: parsedArticle.title?.trim() || dom.window.document.title || "Untitled",
    byline: parsedArticle.byline?.trim() || null,
    siteName: parsedArticle.siteName?.trim() || null,
    lang: parsedArticle.lang || dom.window.document.documentElement.lang || null,
    excerpt: parsedArticle.excerpt?.trim() || null,
    blocks,
    textLength,
    fetchedAt: new Date().toISOString(),
    cached: false,
  };

  setCachedArticle(cacheKey, article);
  return { ok: true, article };
}

function parseAllowedUrl(input: string): URL | null {
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function isBlockedHost(hostname: string): boolean {
  const lowered = hostname.toLowerCase();
  if (lowered === "localhost" || lowered.endsWith(".local")) {
    return true;
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(lowered)) {
    return true;
  }
  return false;
}

function htmlToBlocks(html: string, baseUrl: string): NewsArticleBlock[] {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { url: baseUrl });
  const body = dom.window.document.body;
  const out: NewsArticleBlock[] = [];

  const walk = (node: Node): void => {
    if (node.nodeType !== dom.window.Node.ELEMENT_NODE) {
      return;
    }
    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (tag === "p" || tag === "li" || tag === "blockquote") {
      const text = normalizeWhitespace(el.textContent ?? "");
      if (text.length > 0) {
        out.push({ kind: "paragraph", text });
      }
      return;
    }

    if (/^h[1-6]$/.test(tag)) {
      const text = normalizeWhitespace(el.textContent ?? "");
      if (text.length > 0) {
        out.push({ kind: "heading", level: Number(tag.substring(1)), text });
      }
      return;
    }

    el.childNodes.forEach((child) => walk(child));
  };

  body.childNodes.forEach((child) => walk(child));
  return out;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
