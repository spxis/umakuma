"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";

import GameCategoryPill from "@/app/game/GameCategoryPill";
import {
  GAME_COPY,
  GAME_KIND_ACCENT,
  GAME_KIND_EMOJI,
  GAME_KIND_LABELS,
  GAME_LEVEL_PILL_CLASS,
  gameDifficultyLabel,
} from "@/app/game/GameMode.constants";
import SurfacePagination from "@/app/shared/SurfacePagination";
import {
  GAME_HISTORY_PAGE_SIZES,
  GAME_HISTORY_SORTS,
  GAME_HISTORY_SORT_DIRS,
  type GameHistoryPage,
  type GameHistoryRow,
  type GameHistorySort,
  type GameHistorySortDir,
} from "@/lib/gameHistoryQuery";
import { formatGameDuration, gameKindRules } from "@/lib/gameMode";
import { formatGameScore } from "@/lib/gameScoring";
import { GAME_XP_OUTCOMES, gameXpOutcome } from "@/lib/gameXpOutcome";
import { wkLevelBadge } from "@/lib/levelBadge";
import { formatDateTimeShort } from "@/lib/timeFormat";

import { GAME_HISTORY_COPY as copy } from "./gameHistoryCopy";

const CHIP = "inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-bold transition";
const CHIP_ON = "border-accent bg-accent text-white";
const CHIP_OFF = "border-line bg-surface text-foreground/70 hover:bg-surface-muted";
const HEAD = "pb-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60";

/**
 * A member's own games, browsable.
 *
 * Paged from `/api/accounts/[id]/game/history` with the same controls as the
 * XP history, so a member learns one way of reading their own records rather
 * than three.
 *
 * The reason it exists is the XP column. `xpAwarded` and `xpSkipped` have been
 * recorded on every run since 1.47.0 and were readable in exactly one place -
 * the results panel, for as long as a player stayed on it. The question they
 * were added to answer, "why did four games pay ten XP", is a question asked
 * later, about games already finished.
 */
export default function GameHistoryTable({ accountId }: { accountId: string }) {
  const [kind, setKind] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(GAME_HISTORY_PAGE_SIZES[0]);
  const [sortBy, setSortBy] = useState<GameHistorySort>(GAME_HISTORY_SORTS.played);
  const [sortDir, setSortDir] = useState<GameHistorySortDir>(GAME_HISTORY_SORT_DIRS.desc);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sortBy,
      sortDir,
    });
    if (kind) params.set("kind", kind);
    return `/api/accounts/${encodeURIComponent(accountId)}/game/history?${params.toString()}`;
  }, [accountId, kind, page, pageSize, sortBy, sortDir]);

  const { data, error, isLoading } = useSWR<GameHistoryPage & { error?: string }>(
    query,
    async (url: string) => {
      const response = await fetch(url, { cache: "no-store" });
      const payload = (await response.json()) as GameHistoryPage & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? copy.failed);
      return payload;
    },
    { revalidateOnFocus: true },
  );

  /* Any change to what is being asked for goes back to page one: staying on
     page 7 of a filter that now has two pages shows an empty table and reads
     as a bug rather than as the end of the list. */
  function reset<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setPage(1);
    };
  }

  function sortOn(column: GameHistorySort) {
    if (sortBy === column) {
      setSortDir(
        sortDir === GAME_HISTORY_SORT_DIRS.desc
          ? GAME_HISTORY_SORT_DIRS.asc
          : GAME_HISTORY_SORT_DIRS.desc,
      );
      return;
    }
    setSortBy(column);
    setSortDir(GAME_HISTORY_SORT_DIRS.desc);
    setPage(1);
  }

  const rows = data?.rows ?? [];
  const arrow = (column: GameHistorySort) =>
    sortBy === column ? (sortDir === GAME_HISTORY_SORT_DIRS.desc ? " ↓" : " ↑") : "";

  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <p className="text-xs font-semibold text-foreground/60">{copy.grain}</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => reset(setKind)(null)}
          aria-pressed={kind === null}
          className={`${CHIP} ${kind === null ? CHIP_ON : CHIP_OFF}`}
        >
          {copy.allKinds}
        </button>
        {(data?.facets ?? []).map((facet) => (
          <button
            key={facet.kind}
            type="button"
            onClick={() => reset(setKind)(facet.kind)}
            aria-pressed={kind === facet.kind}
            title={copy.kindCount(facet.count, facet.xp)}
            className={`${CHIP} ${kind === facet.kind ? CHIP_ON : CHIP_OFF}`}
          >
            <span aria-hidden="true" className="mr-1">
              {GAME_KIND_EMOJI[facet.kind]}
            </span>
            {GAME_KIND_LABELS[facet.kind]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground/60">
          {data
            ? copy.summary(rows.length, data.pagination.total, data.filteredXp)
            : isLoading
              ? copy.loading
              : ""}
        </p>
        <div className="flex gap-1">
          {GAME_HISTORY_PAGE_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => reset(setPageSize)(size)}
              aria-pressed={pageSize === size}
              className={`${CHIP} ${pageSize === size ? CHIP_ON : CHIP_OFF}`}
            >
              {copy.perPage(size)}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm font-semibold text-rose-600">{copy.failed}</p> : null}

      {!error && data && rows.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface-muted/40 p-6 text-center">
          <p className="text-sm font-black text-foreground">
            {kind ? copy.emptyFiltered : copy.empty}
          </p>
          <p className="mt-1 text-xs font-semibold text-foreground/60">{copy.emptyHint}</p>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-0 text-sm sm:min-w-[38rem]">
            <thead>
              <tr>
                <th className={HEAD} scope="col">
                  <button
                    type="button"
                    onClick={() => sortOn(GAME_HISTORY_SORTS.played)}
                    title={copy.sortHint}
                    className="font-black uppercase tracking-[0.08em] hover:text-foreground"
                  >
                    {copy.columns.played}
                    <span aria-hidden="true">{arrow(GAME_HISTORY_SORTS.played)}</span>
                  </button>
                </th>
                <th className={HEAD} scope="col">
                  {copy.columns.game}
                </th>
                <th className={`${HEAD} hidden sm:table-cell`} scope="col">
                  {copy.columns.result}
                </th>
                <th className={`${HEAD} hidden sm:table-cell`} scope="col">
                  <button
                    type="button"
                    onClick={() => sortOn(GAME_HISTORY_SORTS.score)}
                    title={copy.sortHint}
                    className="font-black uppercase tracking-[0.08em] hover:text-foreground"
                  >
                    {copy.columns.score}
                    <span aria-hidden="true">{arrow(GAME_HISTORY_SORTS.score)}</span>
                  </button>
                </th>
                <th className={HEAD} scope="col">
                  <button
                    type="button"
                    onClick={() => sortOn(GAME_HISTORY_SORTS.xp)}
                    title={copy.sortHint}
                    className="font-black uppercase tracking-[0.08em] hover:text-foreground"
                  >
                    {copy.columns.xp}
                    <span aria-hidden="true">{arrow(GAME_HISTORY_SORTS.xp)}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {rows.map((row) => (
                <GameHistoryRowCells key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <SurfacePagination
        page={data?.pagination.page ?? page}
        pageCount={data?.pagination.totalPages ?? 1}
        slot="bottom"
        placement="bottom"
        onPageChange={setPage}
      />
    </section>
  );
}

/**
 * One run.
 *
 * The pills are the hub's own - same labels, same emoji, same accent - so a
 * game is recognisable in a member's record as the thing they picked in the
 * lobby.
 */
function GameHistoryRowCells({ row }: { row: GameHistoryRow }) {
  /*
   * The same three cases the results panel draws, from the same rule: a run
   * with nothing paid and no reason recorded predates the recording, and
   * calling that "no XP" would be a guess about a game we did not measure.
   */
  const outcome = gameXpOutcome(row);
  const reason = row.xpSkipped ? GAME_COPY.xpSkipReasons[row.xpSkipped] : null;

  return (
    <tr>
      <td className="py-2 align-top text-xs font-semibold tabular-nums text-foreground/70">
        {formatDateTimeShort(row.completedAt, "—")}
      </td>
      <td className="py-2 align-top">
        <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-foreground/60">
          <span className={`subject-pill border-line bg-surface-muted ${GAME_KIND_ACCENT[row.kind].text}`}>
            <span aria-hidden="true">{GAME_KIND_EMOJI[row.kind]}</span> {GAME_KIND_LABELS[row.kind]}
          </span>
          {gameKindRules(row.kind).usesLevel ? (
            <span className={GAME_LEVEL_PILL_CLASS}>{wkLevelBadge(row.level) ?? "All"}</span>
          ) : null}
          <GameCategoryPill kind={row.kind} category={row.category} />
          <span>{gameDifficultyLabel(row.kind, row.choiceCount, row.ultraMode, row.direction)}</span>
        </span>
        {/*
          * The phone gets the two columns that give way, folded under the
          * game's own pills. XP is the one thing that never gives way: it is
          * the question the page was built to answer, and at 393px the table
          * would otherwise scroll it off to the right where nobody looks.
          */}
        <span className="mt-1 block text-[11px] font-semibold text-foreground/60 sm:hidden">
          {copy.result(row.correctCount, row.questionCount)} · {formatGameDuration(row.durationMs)} ·{" "}
          {formatGameScore(row.score)}
        </span>
      </td>
      <td className="hidden py-2 align-top text-xs font-semibold tabular-nums text-foreground/70 sm:table-cell">
        <span title={copy.resultLabel(row.correctCount, row.questionCount)}>
          {copy.result(row.correctCount, row.questionCount)}
        </span>
        <span className="block text-foreground/60">{formatGameDuration(row.durationMs)}</span>
      </td>
      <td className="hidden py-2 align-top font-black tabular-nums text-foreground sm:table-cell">
        {formatGameScore(row.score)}
      </td>
      <td className="py-2 align-top tabular-nums">
        {outcome === GAME_XP_OUTCOMES.unrecorded ? (
          <span className="font-semibold text-foreground/60" title={copy.xpUnrecordedTitle}>
            {copy.xpUnrecorded}
          </span>
        ) : (
          <>
            <span
              className={
                outcome === GAME_XP_OUTCOMES.paid
                  ? "font-black text-foreground"
                  : "font-bold text-foreground/60"
              }
            >
              {outcome === GAME_XP_OUTCOMES.paid
                ? GAME_COPY.xpEarned(row.xpAwarded)
                : GAME_COPY.xpNone}
            </span>
            {reason ? (
              <span className="mt-0.5 block max-w-[16rem] text-[11px] font-semibold text-foreground/60">
                {reason}
              </span>
            ) : null}
          </>
        )}
      </td>
    </tr>
  );
}
