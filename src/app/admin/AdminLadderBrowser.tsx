"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { japaneseTextProps } from "@/app/shared/japaneseText";
import { SUBJECT_TYPE_VALUES, type SubjectType } from "@/lib/domainConstants";
import { KANJI_GRADE_BAND_VALUES, type KanjiGradeBand } from "@/lib/kanjiCoverage";
import { LADDER_SOURCE_LABELS, LADDER_SOURCE_VALUES, type LadderRow, type LadderSource } from "@/lib/ladder/ladderCrosswalk";
import { LADDER_DEFAULT_PAGE_SIZE, type LadderFacets, type LadderLevelSummary } from "@/lib/ladder/ladderQuery";

import SegmentedControl from "@/app/shared/SegmentedControl";
import { usePersistedTab } from "@/lib/usePersistedTab";
import type { LadderLevelGroup } from "@/lib/ladder/ladderQuery";

import AdminLadderLevels from "./AdminLadderLevels";
import AdminLadderShape from "./AdminLadderShape";
import AdminPaginationControls from "./AdminPaginationControls";
import AdminPanelHeader from "./AdminPanelHeader";
import {
  ADMIN_LADDER_COPY as copy,
  LADDER_BAND_LABELS,
  LADDER_KIND_BADGE,
  LADDER_KIND_LABELS,
  LADDER_SOURCE_BADGE,
} from "./AdminLadder.constants";

/** Table or levels: the same rows read two ways, remembered per member. */
const LADDER_VIEWS = ["rows", "levels"] as const;
type LadderView = (typeof LADDER_VIEWS)[number];
const VIEW_STORAGE_KEY = "wr:admin:ladder-view";

type LevelsPayload = { groups: LadderLevelGroup[]; page: number; pageCount: number; levels: LadderLevelSummary[] };

type Payload = {
  rows: LadderRow[];
  total: number;
  page: number;
  pageSize: number;
  facets: LadderFacets;
  levels: LadderLevelSummary[];
  /** How many levels the ladder has, so the level view can page over them. */
  ladderLevels: number;
};

const CHIP = "inline-flex h-7 items-center rounded-full border px-2.5 text-[11px] font-bold transition";
const ACTIVE = "border-accent bg-accent text-white";
const IDLE = "border-line bg-surface text-foreground/70 hover:bg-surface-muted";

/**
 * The ladder beside every other scale.
 *
 * This is the table the backlog said the ladder had to earn: our level, then
 * WaniKani's, the JLPT band and the school year, on one line for all nine
 * thousand items. Deciding whether level 14 is too heavy, or whether a kanji
 * sits too far from the words that use it, was until now a question you could
 * only answer by reading JSON.
 */
export default function AdminLadderBrowser({
  sessionAuthorized,
  checkingSession,
}: {
  sessionAuthorized: boolean;
  checkingSession: boolean;
}) {
  const [page, setPage] = useState(1);
  const [view, setView] = usePersistedTab<LadderView>(VIEW_STORAGE_KEY, LADDER_VIEWS, "rows");
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<SubjectType | null>(null);
  const [source, setSource] = useState<LadderSource | null>(null);
  const [band, setBand] = useState<KanjiGradeBand | null>(null);
  const [level, setLevel] = useState<number | null>(null);
  const [missingOnly, setMissingOnly] = useState(false);

  /* Changing view starts at page one: the two views page over different
     things — fifty rows against ten levels — so a page number does not carry. */
  function chooseView(next: LadderView) {
    setView(next);
    setPage(1);
  }

  /* The list is in memory on the server, but a keystroke is still a request. */
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(rawSearch);
      setPage(1);
    }, 260);
    return () => clearTimeout(timer);
  }, [rawSearch]);

  /*
   * Every filter resets to page one where it is set, rather than in an effect
   * watching them all: changing a filter and paging are one intent, and an
   * effect that writes state during render is a lint error and a double render.
   */
  function change<T>(apply: (value: T) => void): (value: T) => void {
    return (value: T) => {
      apply(value);
      setPage(1);
    };
  }

  const chooseKind = change(setKind);
  const chooseSource = change(setSource);
  const chooseBand = change(setBand);
  const chooseLevel = change(setLevel);
  const chooseMissing = change(setMissingOnly);

  const url = useMemo(() => {
    if (view === "levels") return `/api/admin/ladder/items?view=levels&page=${page}`;
    const params = new URLSearchParams({ page: String(page), pageSize: String(LADDER_DEFAULT_PAGE_SIZE) });
    if (search) params.set("search", search);
    if (kind) params.set("kind", kind);
    if (source) params.set("source", source);
    if (band) params.set("band", band);
    if (level !== null) {
      params.set("ukLevelMin", String(level));
      params.set("ukLevelMax", String(level));
    }
    if (missingOnly) params.set("missingFromWanikani", "1");
    return `/api/admin/ladder/items?${params.toString()}`;
  }, [view, page, search, kind, source, band, level, missingOnly]);

  const { data, error, isLoading } = useSWR<Payload & Partial<LevelsPayload>>(
    sessionAuthorized && !checkingSession ? url : null,
    async (target: string) => {
      const response = await fetch(target);
      const payload = (await response.json()) as Payload & Partial<LevelsPayload> & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? copy.loadFailed);
      return payload;
    },
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  if (checkingSession || (isLoading && !data)) return <Shell><Note>{copy.loading}</Note></Shell>;
  if (!sessionAuthorized) return <Shell><Note>{copy.needsAuth}</Note></Shell>;
  if (error || !data) return <Shell><Note tone="bad">{copy.loadFailed}</Note></Shell>;

  const pageCount =
    view === "levels" ? (data.pageCount ?? 1) : Math.max(1, Math.ceil(data.total / data.pageSize));
  const filtered = Boolean(search || kind || source || band || level !== null || missingOnly);

  return (
    <Shell>
      <AdminLadderShape levels={data.levels} selected={level} onSelect={chooseLevel} />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SegmentedControl
          value={view}
          onChange={chooseView}
          ariaLabel={copy.title}
          options={[
            { value: "rows", label: copy.view.rows },
            { value: "levels", label: copy.view.levels },
          ]}
        />

        {view === "levels" ? (
          <p className="text-[11px] font-semibold text-foreground/60">{copy.levels.hint}</p>
        ) : null}
      </div>

      {view === "rows" ? (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={rawSearch}
          onChange={(event) => setRawSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            if (rawSearch) setRawSearch("");
            else event.currentTarget.blur();
          }}
          placeholder={copy.search}
          className="h-8 min-w-[11rem] rounded-full border border-line bg-surface px-3 text-sm"
        />

        <button type="button" onClick={() => chooseKind(null)} className={`${CHIP} ${kind === null ? ACTIVE : IDLE}`}>
          {copy.allKinds}
        </button>
        {SUBJECT_TYPE_VALUES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => chooseKind(kind === value ? null : value)}
            className={`${CHIP} ${kind === value ? ACTIVE : IDLE}`}
          >
            {LADDER_KIND_LABELS[value]} {data.facets.kind[value]?.toLocaleString("en-CA") ?? 0}
          </button>
        ))}

        <select
          value={source ?? ""}
          onChange={(event) => chooseSource((event.target.value || null) as LadderSource | null)}
          className="h-8 rounded-full border border-line bg-surface px-2 text-[11px] font-bold"
        >
          <option value="">{copy.allSources}</option>
          {LADDER_SOURCE_VALUES.map((value) => (
            <option key={value} value={value}>
              {LADDER_SOURCE_LABELS[value]} ({data.facets.source[value] ?? 0})
            </option>
          ))}
        </select>

        <select
          value={band ?? ""}
          onChange={(event) => chooseBand((event.target.value || null) as KanjiGradeBand | null)}
          className="h-8 rounded-full border border-line bg-surface px-2 text-[11px] font-bold"
        >
          <option value="">{copy.allBands}</option>
          {KANJI_GRADE_BAND_VALUES.map((value) => (
            <option key={value} value={value}>
              {LADDER_BAND_LABELS[value]} ({data.facets.band[value] ?? 0})
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => chooseMissing(!missingOnly)}
          className={`${CHIP} ${missingOnly ? ACTIVE : IDLE}`}
        >
          {copy.missingOnly}
        </button>

        {filtered ? (
          <button
            type="button"
            onClick={() => {
              setRawSearch("");
              setSearch("");
              setKind(null);
              setSource(null);
              setBand(null);
              setLevel(null);
              setMissingOnly(false);
              setPage(1);
            }}
            className={`${CHIP} ${IDLE}`}
          >
            {copy.clear}
          </button>
        ) : null}
      </div>
      ) : null}

      {view === "levels" ? (
        <div className="mt-3">
          <AdminLadderLevels groups={data.groups ?? []} />
        </div>
      ) : null}

      {view === "rows" ? (
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">
            <tr className="border-b border-line">
              <th className="py-2 pr-3">{copy.columns.glyph}</th>
              <th className="py-2 pr-3">{copy.columns.kind}</th>
              <th className="py-2 pr-3 text-right">{copy.columns.uk}</th>
              <th className="py-2 pr-3 text-right">{copy.columns.wk}</th>
              <th className="py-2 pr-3 text-right">{copy.columns.jlpt}</th>
              <th className="py-2 pr-3 text-right">{copy.columns.grade}</th>
              <th className="py-2 pr-3 text-right">{copy.columns.frequency}</th>
              <th className="py-2 pr-3">{copy.columns.source}</th>
              <th className="py-2">{copy.columns.meaning}</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.key} className="border-b border-line/60">
                <td className="py-1.5 pr-3">
                  <span {...japaneseTextProps("text-base font-black text-foreground")}>{row.characters}</span>
                </td>
                <td className="py-1.5 pr-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${LADDER_KIND_BADGE[row.kind]}`}>
                    {LADDER_KIND_LABELS[row.kind]}
                  </span>
                </td>
                <td className="py-1.5 pr-3 text-right font-mono font-black tabular-nums text-foreground">
                  {copy.ukPrefix}
                  {row.ukLevel}
                </td>
                <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-foreground/70">
                  {row.wkLevel === null ? copy.notTaught : `${copy.wkPrefix}${row.wkLevel}`}
                </td>
                <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-foreground/70">
                  {row.nLevel === null ? copy.notTaught : `N${row.nLevel}`}
                </td>
                <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-foreground/70">
                  {row.schoolGrade ?? copy.notTaught}
                </td>
                <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-foreground/70">
                  {row.frequencyRank?.toLocaleString("en-CA") ?? copy.notTaught}
                </td>
                <td className="py-1.5 pr-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${LADDER_SOURCE_BADGE[row.source]}`}>
                    {LADDER_SOURCE_LABELS[row.source]}
                  </span>
                </td>
                <td className="py-1.5 text-foreground/80">{row.primaryMeaning ?? copy.notTaught}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.rows.length === 0 ? <Note>{copy.none}</Note> : null}
      </div>
      ) : null}

      <div className="mt-3">
        <AdminPaginationControls
          page={data.page}
          pageCount={pageCount}
          itemLabel={view === "levels" ? copy.view.levels.toLowerCase() : copy.items}
          total={view === "levels" ? (data.ladderLevels ?? pageCount) : data.total}
          onFirst={() => setPage(1)}
          onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          onNext={() => setPage((current) => Math.min(pageCount, current + 1))}
          onLast={() => setPage(pageCount)}
          onPageChange={(next) => setPage(Math.min(Math.max(1, next), pageCount))}
        />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface/90 p-5 shadow-sm">
      <AdminPanelHeader label={copy.label} title={copy.title} description={copy.description} />
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Note({ children, tone }: { children: React.ReactNode; tone?: "bad" }) {
  return <p className={`py-3 text-sm ${tone === "bad" ? "text-rose-600" : "text-foreground/70"}`}>{children}</p>;
}
