import type { LevelItem } from "../explorerTypes";
import { statusClass, statusShortLabel } from "../level-explorer/lib/levelExplorerDisplay";

type StatusSrsChipProps = {
  status: LevelItem["status"];
  srsStage: number;
  includeBorder?: boolean;
};

export default function StatusSrsChip({
  status,
  srsStage,
  includeBorder = false,
}: StatusSrsChipProps) {
  return (
    <span className={`subject-pill whitespace-nowrap ${includeBorder ? "border-line " : ""}${statusClass(status)}`}>
      {statusShortLabel(status)} - SRS {srsStage}
    </span>
  );
}

type SrsOnlyChipProps = {
  srsStage: number;
};

export function SrsOnlyChip({ srsStage }: SrsOnlyChipProps) {
  return <span className="subject-pill border-line bg-surface text-foreground whitespace-nowrap">SRS {srsStage}</span>;
}
