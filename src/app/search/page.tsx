import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";

import {
  SEARCH_PAGE_SIZE,
  SEARCH_SOURCE_LABELS,
  SEARCH_SOURCE_VALUES,
  isSearchSource,
  isSearchable,
  normalizeQuery,
  parseSources,
  type SearchSource,
} from "@/lib/globalSearch";
import { runGlobalSearch } from "@/lib/globalSearchServer";

import { SEARCH_EXAMPLES, SEARCH_PAGE_COPY } from "./searchCopy";
import RecentSearches from "@/app/shared/RecentSearches";
import SearchHitList from "./SearchHitList";
import SearchPageForm from "./SearchPageForm";
import { noTranslateClass } from "@/app/shared/japaneseText";

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
  const requestedSource = firstValue(params.in);
  const activeSource = requestedSource && isSearchSource(requestedSource) ? requestedSource : null;
  const sources = parseSources(activeSource);
  /*
   * The first stretch only. A common character matches over a hundred rows
   * across the three catalogues, and rendering all of them made the page a
   * scroll marathon that nobody ever reached the end of; the rest arrives as
   * the reader gets near it.
   */
  const results = isSearchable(query)
    ? await runGlobalSearch(query, sources, { limit: SEARCH_PAGE_SIZE })
    : null;

  /*
   * Results link into the viewer's own explorers, so an anonymous search stays
   * a lookup instead of offering links that bounce off the sign-in wall.
   */
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });
  const viewerUsername = viewerMenuInfo?.wkUsername ?? null;

  return (
    <div className={`relative overflow-hidden ${PAGE_SHELL_PADDING}`}>
      <div className="noise-overlay pointer-events-none absolute inset-0" />
      <main className="relative w-full space-y-3">
        {/*
         * Search keeps the site around it. A result is a step in the middle of
         * a session - the next move is usually an explorer or the study queue -
         * and the old page dropped the navigation entirely, so every search
         * ended at a dead end with only the back button out.
         */}
        <AppTopMenuRow
          viewerMenuInfo={viewerMenuInfo}
          showAdminActions={isAdminEmail(viewerEmail)}
          className="mb-2"
        />

        <div className={`${PAGE_WIDTH.reading} space-y-4 pb-8`}>
          <h1 className="text-2xl font-black text-foreground">{SEARCH_PAGE_COPY.heading}</h1>

          <SearchPageForm
            initialQuery={query}
            activeSource={activeSource}
            viewerUsername={viewerUsername}
          />

          {results ? (
            <>
              <nav className="flex flex-wrap items-center gap-1.5">
                {[null, ...SEARCH_SOURCE_VALUES].map((source) => {
                  const active = source === activeSource;
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
                      <span translate="no" className={noTranslateClass(active ? "text-white/70" : "text-foreground/60")}>({count})</span>
                    </Link>
                  );
                })}
              </nav>

              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60">
                {results.totalHits} {results.totalHits === 1 ? SEARCH_PAGE_COPY.hit : SEARCH_PAGE_COPY.hits}
                {" · "}
                {SEARCH_PAGE_COPY.resultsFor} “{query}”
              </p>

              <SearchHitList
                hits={results.hits}
                viewerUsername={viewerUsername}
                query={query}
                activeSource={activeSource}
                totalHits={results.totalHits}
                footer={results.hits.length > 0 ? <RecentSearches currentQuery={query} /> : null}
              />
            </>
          ) : (
            <div className="rounded-2xl border border-line bg-surface-muted p-5">
              <p className="text-sm font-semibold text-foreground/75">{SEARCH_PAGE_COPY.emptyPrompt}</p>
              <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-foreground/60">
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

          {/*
            * With no results list to close out - no search yet, or a search
            * that matched nothing - the remembered searches carry the same
            * card on their own, which is the list the page would have had.
            */}
          {results && results.hits.length > 0 ? null : (
            <RecentSearches currentQuery={query} variant="card" />
          )}
        </div>
      </main>
    </div>
  );
}
