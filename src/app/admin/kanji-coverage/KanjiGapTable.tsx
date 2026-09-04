import {
  KANJI_GRADE_BAND_LABELS,
  type KanjiCoverageEntry,
} from "@/lib/kanjiCoverage";

import { KANJI_BAND_CLASSES, KANJI_COVERAGE_COPY } from "./KanjiCoverage.constants";
import { noTranslateClass } from "@/app/shared/japaneseText";
import { wkLevelBadge } from "@/lib/levelBadge";

type Props = {
  entries: KanjiCoverageEntry[];
  showBand?: boolean;
};

export default function KanjiGapTable({ entries, showBand = true }: Props) {
  if (entries.length === 0) {
    return <p className="py-6 text-sm text-foreground/60">{KANJI_COVERAGE_COPY.empty}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs font-black uppercase tracking-wide text-foreground/60">
            <th scope="col" className="py-2 pr-3">Kanji</th>
            <th scope="col" className="py-2 pr-3">Meaning</th>
            <th scope="col" className="py-2 pr-3">JLPT</th>
            {showBand ? <th scope="col" className="py-2 pr-3">Band</th> : null}
            <th scope="col" className="py-2 pr-3">Grade</th>
            <th scope="col" className="py-2 pr-3">Freq</th>
            <th scope="col" className="py-2">WK</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.kanji} className="border-b border-line/50 last:border-b-0">
              <td translate="no" className={noTranslateClass("py-2 pr-3 text-2xl leading-none")}>{entry.kanji}</td>
              <td className="py-2 pr-3 text-foreground/70">
                {entry.primaryMeaning ?? KANJI_COVERAGE_COPY.noMeaning}
              </td>
              <td className="py-2 pr-3 tabular-nums text-foreground/70">
                {entry.nLevel === null ? "-" : `N${entry.nLevel}`}
              </td>
              {showBand ? (
                <td className="py-2 pr-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${KANJI_BAND_CLASSES[entry.band]}`}
                  >
                    {KANJI_GRADE_BAND_LABELS[entry.band]}
                  </span>
                </td>
              ) : null}
              <td className="py-2 pr-3 tabular-nums text-foreground/60">
                {entry.schoolGrade ?? "-"}
              </td>
              <td className="py-2 pr-3 tabular-nums text-foreground/60">
                {entry.frequencyRank ?? KANJI_COVERAGE_COPY.noFrequency}
              </td>
              <td className="py-2 tabular-nums text-foreground/60">
                {wkLevelBadge(entry.wkLevel) ?? "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
