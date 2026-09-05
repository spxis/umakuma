import type { ImportVerdict } from "@/lib/xp/simImport";
import type { SimTableRow } from "@/lib/xp/simTable";

import { ADMIN_BALANCE_COPY as copy } from "./AdminBalance.constants";

const HEAD = "px-2 py-1.5 text-left text-[10px] font-black uppercase tracking-[0.06em] text-foreground/60 whitespace-nowrap";
const CELL = "px-2 py-1.5 text-[12px] font-semibold text-foreground/80 whitespace-nowrap tabular-nums";
const NAME = "px-2 py-1.5 text-[12px] font-black text-foreground min-w-52";

/** Anything at or above this is taking on work it cannot service. */
const LOAD_WARNING = 1.15;

function loadTone(ratio: number): string {
  return ratio >= LOAD_WARNING ? "text-rose-700" : "text-foreground/80";
}

/**
 * Everybody, one row each, every column John asked for.
 *
 * Wide on purpose and scrolled rather than wrapped: the value of the table is
 * reading two people against each other on the same line, and a column that
 * folds onto a second row stops being comparable.
 */
export function AdminBalanceSimulatorTable({ rows }: { rows: SimTableRow[] }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-line">
      <table className="w-full border-collapse">
        <thead className="bg-surface-muted">
          <tr>
            <th className={HEAD}>{copy.columns.person}</th>
            <th className={HEAD}>{copy.columns.sittings}</th>
            <th className={HEAD}>{copy.columns.rank}</th>
            <th className={HEAD}>{copy.columns.level}</th>
            <th className={HEAD}>{copy.columns.daysStudied}</th>
            <th className={HEAD}>{copy.columns.reviews}</th>
            <th className={HEAD}>{copy.columns.wrong}</th>
            <th className={HEAD}>{copy.columns.wrongShare}</th>
            <th className={HEAD}>{copy.columns.lessons}</th>
            <th className={HEAD}>{copy.columns.games}</th>
            <th className={HEAD}>{copy.columns.xp}</th>
            <th className={HEAD}>{copy.columns.xpReviews}</th>
            <th className={HEAD}>{copy.columns.xpLessons}</th>
            <th className={HEAD}>{copy.columns.xpGames}</th>
            <th className={HEAD}>{copy.columns.xpLevels}</th>
            <th className={HEAD}>{copy.columns.xpStreaks}</th>
            <th className={HEAD}>{copy.columns.xpQuality}</th>
            <th className={HEAD} title={copy.inFlightHint}>{copy.columns.inFlight}</th>
            <th className={HEAD} title={copy.backlogHint}>{copy.columns.backlog}</th>
            <th className={HEAD} title={copy.loadHint}>{copy.columns.load}</th>
            <th className={HEAD}>{copy.columns.streak}</th>
            <th className={HEAD}>{copy.columns.rest}</th>
            <th className={HEAD}>{copy.columns.holiday}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-line/70 even:bg-surface-muted/40">
              <td className={NAME} title={row.story}>{row.label}</td>
              <td className={CELL}>{row.sittings}</td>
              <td className={CELL}>{copy.rankOf(row.xpRank, row.rankName)}</td>
              <td className={CELL}>{row.curriculumLevel}</td>
              <td className={CELL}>{copy.number(row.daysStudied)}</td>
              <td className={CELL}>{copy.number(row.reviewsAnswered)}</td>
              <td className={CELL}>{copy.number(row.wrongAnswers)}</td>
              <td className={CELL}>{copy.percent(row.wrongShare)}</td>
              <td className={CELL}>{copy.number(row.lessonsStarted)}</td>
              <td className={CELL}>{copy.number(row.gamesPlayed)}</td>
              <td className={`${CELL} font-black text-foreground`}>{copy.number(row.xp)}</td>
              <td className={CELL}>{copy.number(row.xpFromReviews)}</td>
              <td className={CELL}>{copy.number(row.xpFromLessons)}</td>
              <td className={CELL}>{copy.number(row.xpFromGames)}</td>
              <td className={CELL}>{copy.number(row.xpFromLevels)}</td>
              <td className={CELL}>{copy.number(row.xpFromStreaks)}</td>
              <td className={CELL}>{copy.number(row.xpFromQuality)}</td>
              <td className={CELL}>{copy.number(row.itemsInFlight)}</td>
              <td className={CELL}>{copy.number(row.backlog)}</td>
              <td className={`${CELL} ${loadTone(row.reviewLoadRatio)}`}>{row.reviewLoadRatio.toFixed(2)}</td>
              <td className={CELL}>{copy.number(row.longestStreak)}</td>
              <td className={CELL}>{copy.restOf(row.restDaysSpent, row.restDaysAllowed)}</td>
              <td className={CELL}>
                {row.startLevel > 1 || row.restDaysAllowed === 0
                  ? copy.holidayNone
                  : row.streakSurvivedHoliday
                    ? copy.holidayKept
                    : copy.holidayLost}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** What an import is worth, beside what it would cost to earn here. */
export function AdminBalanceImportTable({ verdicts }: { verdicts: ImportVerdict[] }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-line">
      <table className="w-full border-collapse">
        <thead className="bg-surface-muted">
          <tr>
            <th className={HEAD}>{copy.importLevel}</th>
            <th className={HEAD}>{copy.importEarned}</th>
            <th className={HEAD}>{copy.importEarnedDays}</th>
            <th className={HEAD}>{copy.importFlat}</th>
            <th className={HEAD}>{copy.importFloor}</th>
          </tr>
        </thead>
        <tbody>
          {verdicts.map((verdict) => (
            <tr key={verdict.level} className="border-t border-line/70 even:bg-surface-muted/40">
              <td className={`${CELL} font-black text-foreground`}>{verdict.level}</td>
              <td className={CELL}>
                {verdict.earnedXp === null
                  ? copy.holidayNone
                  : `${copy.number(verdict.earnedXp)} · ${copy.rankOf(verdict.earnedRank ?? 1, "")}`}
              </td>
              <td className={CELL}>{copy.days(verdict.earnedDays)}</td>
              <td className={CELL}>
                {copy.number(verdict.flatXp)} · {copy.rankOf(verdict.flatRank, "")}
              </td>
              <td className={CELL}>
                {copy.rankOf(verdict.entitlementFloorRank, "")} —{" "}
                <span className="text-foreground/70">
                  {copy.importFloorDetail(verdict.gamesPerDay, verdict.restDays, verdict.vacationWeeks)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
