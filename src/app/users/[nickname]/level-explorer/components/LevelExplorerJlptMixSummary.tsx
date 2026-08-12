import { formatNumber } from "../lib/levelExplorerDisplay";
import { LEVEL_EXPLORER_JLPT_FILTER_LABELS, LEVEL_EXPLORER_JLPT_MIX_LEVELS } from "./LevelExplorer.constants";
import type { LevelJlptCounts } from "../lib/levelExplorerSelectors";

type Props = {
  jlptCounts: LevelJlptCounts;
  className?: string;
};

export default function LevelExplorerJlptMixSummary({ jlptCounts, className }: Props) {
  return (
    <div className={className}>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/70">JLPT mix (kanji in selected levels)</p>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {LEVEL_EXPLORER_JLPT_MIX_LEVELS.map((level) => {
          const label = LEVEL_EXPLORER_JLPT_FILTER_LABELS[level];
          const count = jlptCounts[level];
          return (
            <div key={level} className="rounded-xl border border-line bg-surface-muted p-2 text-center">
              <p className="text-[10px] font-bold uppercase text-foreground/70">{label}</p>
              <p className="text-2xl font-black text-foreground">{formatNumber(count)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
