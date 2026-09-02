import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";

import { isSearchable, normalizeQuery } from "@/lib/globalSearch";
import { runSearchColumns } from "@/lib/globalSearchServer";
import {
  NO_FILTERS,
  hasAnyFilter,
  onlySourceHref,
  parseSearchFilters,
  searchResultsHref,
} from "@/lib/searchFilters";

import { searchAnswers } from "@/lib/searchAnswers";

import { SEARCH_EXAMPLES, SEARCH_PAGE_COPY } from "./searchCopy";
import RecentItems from "@/app/shared/RecentItems";
import SearchAnswers from "./SearchAnswers";
import SearchColumns from "./SearchColumns";
import { COLUMN_FULL, COLUMN_PREVIEW, SEARCH_LIST_CARD } from "./Search.constants";
import SearchFilterRow from "./SearchFilterRow";
import SearchPageForm from "./SearchPageForm";

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

export default async function GlobalSearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = normalizeQuery(firstValue(params.query) ?? firstValue(params.q));

  /*
   * The filters live in the address, so a narrowed search can be sent to
   * somebody and the back button walks them like any other navigation.
   */
  const filters = parseSearchFilters(
    new URLSearchParams(
      Object.entries(params).flatMap(([key, value]) => {
        const single = firstValue(value);
        return single === undefined ? [] : [[key, single] as [string, string]];
      }),
    ),
  );

  /*
   * A column at a time, not a window of the flat ranking. A common character
   * matches over a hundred rows across the catalogues, and rendering all of
   * them made the page a scroll marathon nobody reached the end of; each
   * column shows its first stretch and links to that catalogue on its own.
   *
   * Following that link is what the second case is for: asking for one
   * catalogue means asking for all of it, or the link would arrive at the same
   * dozen rows it was offered to escape.
   */
  const perColumn = filters.sources.length === 1 ? COLUMN_FULL : COLUMN_PREVIEW;
  const results = isSearchable(query) ? await runSearchColumns(query, filters, perColumn) : null;

  /*
   * Worked out rather than looked up, and so not filtered: the kind and source
   * chips narrow which catalogues answered, and an era year came from none of
   * them. Turning WaniKani off must not take the date away with it.
   */
  const answers = searchAnswers(query);

  /*
   * Read for the header, not for the results. Every result leads to a public
   * page for the subject itself, so who is asking no longer changes where a
   * row goes - which is the point: the address a member copies out of a search
   * is the address that works for whoever they send it to.
   */
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

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

        {/*
          * Wide, because the results are columns now. A reading column fits one
          * of them; four catalogues answering at once earn the room, the way
          * the explorers and their filter rows do.
          */}
        <div className={`${PAGE_WIDTH.wide} mx-auto max-w-400 space-y-4 pb-8`}>
          <h1 className="text-2xl font-black text-foreground">{SEARCH_PAGE_COPY.heading}</h1>

          <SearchPageForm initialQuery={query} filters={filters} viewerAccountId={viewerMenuInfo?.accountId ?? null} />

          {/*
            * Above the filters and above the count, because it answers the
            * question that was typed. It sits outside the results branch on
            * purpose: "Reiwa 6" is a date the catalogues hold nothing for, and
            * the answer has to survive the page saying nothing matched.
            */}
          <SearchAnswers answers={answers} />

          {results ? (
            <>
              <SearchFilterRow
                query={query}
                filters={filters}
                countsByKind={results.countsByKind}
                countsBySource={results.countsBySource}
              />

              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60">
                {results.totalHits} {results.totalHits === 1 ? SEARCH_PAGE_COPY.hit : SEARCH_PAGE_COPY.hits}
                {" · "}
                {SEARCH_PAGE_COPY.resultsFor} “{query}”
              </p>

              {results.columns.length > 0 ? (
                <>
                  <SearchColumns
                    viewerAccountId={viewerMenuInfo?.accountId ?? null}
                    columns={results.columns.map((column) => ({
                      ...column,
                      moreHref: onlySourceHref(query, filters, column.source),
                    }))}
                  />
                  <div className={SEARCH_LIST_CARD}>
                    <RecentItems currentQuery={query} />
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-line bg-surface-muted p-5">
                  <p className="text-sm font-bold text-foreground/75">{SEARCH_PAGE_COPY.noResults}</p>
                  <p className="mt-1 text-xs font-semibold text-foreground/60">
                    {hasAnyFilter(filters) ? SEARCH_PAGE_COPY.noResultsFiltered : SEARCH_PAGE_COPY.noResultsHint}
                  </p>
                  {hasAnyFilter(filters) ? (
                    <Link
                      href={searchResultsHref(query, NO_FILTERS)}
                      className="mt-3 inline-flex text-xs font-bold uppercase tracking-[0.08em] text-accent underline decoration-dotted underline-offset-2"
                    >
                      {SEARCH_PAGE_COPY.clearFilters}
                    </Link>
                  ) : null}
                </div>
              )}
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
          {results && results.columns.length > 0 ? null : (
            <RecentItems currentQuery={query} variant="card" />
          )}
        </div>
      </main>
    </div>
  );
}
