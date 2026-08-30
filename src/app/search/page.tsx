import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import umakumaLogo from "@/images/umakuma-banner1-transparent.png";
import {
  SEARCH_SOURCE_LABELS,
  SEARCH_SOURCE_VALUES,
  isSearchable,
  normalizeQuery,
  parseSources,
  type SearchSource,
} from "@/lib/globalSearch";
import { runGlobalSearch } from "@/lib/globalSearchServer";

import { SEARCH_EXAMPLES, SEARCH_PAGE_COPY } from "./searchCopy";
import SearchHitList from "./SearchHitList";

export const metadata: Metadata = {
  title: "Search — UmaKuma",
  description: "Search kanji, vocabulary and readings across WaniKani, JLPT and Japanese school grades.",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function sourceHref(query: string, source: SearchSource | null): string {
  const params = new URLSearchParams({ query });
  if (source) params.set("in", source);
  return `/search?${params.toString()}`;
}

export default async function GlobalSearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = normalizeQuery(firstValue(params.query) ?? firstValue(params.q));
  const activeSource = firstValue(params.in);
  const sources = parseSources(activeSource ?? null);
  const results = isSearchable(query) ? await runGlobalSearch(query, sources) : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center gap-4">
        <Link href="/" className="shrink-0">
          <Image src={umakumaLogo} alt="UmaKuma" width={56} height={56} className="h-14 w-14 object-contain" priority />
        </Link>
        <h1 className="text-2xl font-black text-foreground">{SEARCH_PAGE_COPY.heading}</h1>
      </header>

      <form action="/search" className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="query"
          defaultValue={query}
          autoFocus
          placeholder={SEARCH_PAGE_COPY.placeholder}
          className="h-11 min-w-0 flex-1 rounded-full border border-line bg-surface px-5 text-base text-foreground outline-none placeholder:text-foreground/40 focus-visible:ring-2 focus-visible:ring-accent/40"
        />
        {activeSource ? <input type="hidden" name="in" value={activeSource} /> : null}
        <button
          type="submit"
          className="inline-flex h-11 shrink-0 items-center rounded-full bg-accent px-6 text-sm font-black uppercase tracking-[0.08em] text-white transition hover:brightness-95"
        >
          {SEARCH_PAGE_COPY.submit}
        </button>
      </form>

      {results ? (
        <>
          <nav className="mt-4 flex flex-wrap items-center gap-1.5">
            {[null, ...SEARCH_SOURCE_VALUES].map((source) => {
              const active = source === (activeSource ?? null);
              const count = source ? results.countsBySource[source] : results.totalHits;
              return (
                <Link
                  key={source ?? "all"}
                  href={sourceHref(query, source)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition ${
                    active
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-surface text-foreground/75 hover:bg-surface-muted"
                  }`}
                >
                  {source ? SEARCH_SOURCE_LABELS[source] : SEARCH_PAGE_COPY.allSources}
                  <span className={active ? "text-white/70" : "text-foreground/45"}>({count})</span>
                </Link>
              );
            })}
          </nav>

          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/50">
            {results.totalHits} {results.totalHits === 1 ? SEARCH_PAGE_COPY.hit : SEARCH_PAGE_COPY.hits}
            {" · "}
            {SEARCH_PAGE_COPY.resultsFor} “{query}”
          </p>

          <div className="mt-3">
            <SearchHitList hits={results.hits} />
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-line bg-surface-muted p-5">
          <p className="text-sm font-semibold text-foreground/75">{SEARCH_PAGE_COPY.emptyPrompt}</p>
          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-foreground/50">
            {SEARCH_PAGE_COPY.examples}
            {SEARCH_EXAMPLES.map((example) => (
              <Link
                key={example}
                href={`/search?query=${encodeURIComponent(example)}`}
                className="rounded-full border border-line bg-surface px-3 py-1 normal-case tracking-normal text-foreground/75 transition hover:bg-surface-muted"
              >
                {example}
              </Link>
            ))}
          </p>
        </div>
      )}

      <p className="mt-8 text-center text-xs font-semibold text-foreground/40">
        <Link href="/" className="underline decoration-dotted underline-offset-2 hover:text-foreground/60">
          {SEARCH_PAGE_COPY.backHome}
        </Link>
      </p>
    </div>
  );
}
