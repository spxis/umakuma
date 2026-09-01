import Link from "next/link";

import { SEARCH_SOURCE_LABELS, SEARCH_SOURCE_VALUES, type SearchSource } from "@/lib/globalSearch";
import { SEARCH_KIND_LABELS, SEARCH_KIND_VALUES, type KindCounts } from "@/lib/searchKinds";
import {
  isKept,
  searchResultsHref,
  toggleKindHref,
  toggleSourceHref,
  type SearchFilters,
} from "@/lib/searchFilters";

import { SEARCH_PAGE_COPY } from "./searchCopy";
import { SOURCE_TONES } from "./Search.constants";

/**
 * What the results are showing, and what to turn off.
 *
 * Two rows because the results have two axes and neither answers the other's
 * question: a catalogue decides which column a row sits in, and the kind
 * decides whether the row is worth reading. Somebody with no interest in
 * radicals wants them gone from every column at once, which no column control
 * can do.
 *
 * Chips carry their counts, so the row also says what was found before any of
 * it is read - and a chip that is off still shows how much it is hiding, which
 * is the difference between "there are none" and "you turned them off".
 *
 * They are links, not toggles held in state. The filters are then in the
 * address: shareable, survive a reload, and walked by the back button like any
 * other navigation.
 */
export default function SearchFilterRow({
  query,
  filters,
  countsByKind,
  countsBySource,
}: {
  query: string;
  filters: SearchFilters;
  countsByKind: KindCounts;
  countsBySource: Record<SearchSource, number>;
}) {
  const kinds = SEARCH_KIND_VALUES.filter((kind) => countsByKind[kind] > 0);
  const sources = SEARCH_SOURCE_VALUES.filter((source) => countsBySource[source] > 0);

  /* One thing found in one place is not a choice; a filter row over it is clutter. */
  if (kinds.length < 2 && sources.length < 2) return null;

  return (
    <div className="space-y-1.5 rounded-2xl border border-line bg-surface-muted/60 p-2.5">
      {kinds.length > 1 ? (
        <FilterLine label={SEARCH_PAGE_COPY.filterKinds}>
          <AllChip
            href={searchResultsHref(query, { ...filters, kinds: [] })}
            on={filters.kinds.length === 0}
          />
          {kinds.map((kind) => (
            <Chip
              key={kind}
              href={toggleKindHref(query, filters, kind)}
              label={SEARCH_KIND_LABELS[kind]}
              count={countsByKind[kind]}
              on={isKept(filters.kinds, kind)}
            />
          ))}
        </FilterLine>
      ) : null}

      {sources.length > 1 ? (
        <FilterLine label={SEARCH_PAGE_COPY.filterSources}>
          <AllChip
            href={searchResultsHref(query, { ...filters, sources: [] })}
            on={filters.sources.length === 0}
          />
          {sources.map((source) => (
            <Chip
              key={source}
              href={toggleSourceHref(query, filters, source)}
              label={SEARCH_SOURCE_LABELS[source]}
              count={countsBySource[source]}
              on={isKept(filters.sources, source)}
              tone={SOURCE_TONES[source]}
            />
          ))}
        </FilterLine>
      ) : null}
    </div>
  );
}

function FilterLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-16 shrink-0 text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">
        {label}
      </span>
      {children}
    </div>
  );
}

/**
 * The chip's two states.
 *
 * On is filled and off is outlined and faded, rather than off being simply
 * absent: the reader has to be able to see what they turned off, or a filtered
 * page and an empty catalogue look the same.
 */
function Chip({
  href,
  label,
  count,
  on,
  tone,
}: {
  href: string;
  label: string;
  count: number;
  on: boolean;
  /** The source's own accent, so the chips and the column headings match. */
  tone?: string;
}) {
  const base =
    "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold transition";
  const look = on
    ? tone
      ? `${tone} shadow-sm`
      : "border-accent bg-accent text-white"
    : "border-line bg-surface text-foreground/60 hover:bg-surface-muted";

  return (
    <Link href={href} aria-pressed={on} className={`${base} ${look}`}>
      {label}
      <span translate="no" className={on && !tone ? "text-white/70" : "text-foreground/60"}>
        {count}
      </span>
    </Link>
  );
}

function AllChip({ href, on }: { href: string; on: boolean }) {
  return (
    <Link
      href={href}
      aria-pressed={on}
      className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[11px] font-bold transition ${
        on
          ? "border-foreground/25 bg-surface text-foreground"
          : "border-line bg-surface text-foreground/60 hover:bg-surface-muted"
      }`}
    >
      {SEARCH_PAGE_COPY.allSources}
    </Link>
  );
}
