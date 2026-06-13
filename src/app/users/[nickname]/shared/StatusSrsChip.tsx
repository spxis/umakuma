import type { LevelItem } from "../explorerTypes";
import type { ReactNode } from "react";
import { statusClass, statusShortLabel } from "../level-explorer/lib/levelExplorerDisplay";

type PillChipProps = {
  className?: string;
  children: ReactNode;
};

export function PillChip({ className = "", children }: PillChipProps) {
  return <span className={`subject-pill whitespace-nowrap ${className}`}>{children}</span>;
}

type StatusSrsChipProps = {
  status: LevelItem["status"];
  srsStage: number;
};

export default function StatusSrsChip({
  status,
  srsStage,
}: StatusSrsChipProps) {
  return (
    <PillChip className={statusClass(status)}>
      {statusShortLabel(status)} - SRS {srsStage}
    </PillChip>
  );
}

type SrsOnlyChipProps = {
  srsStage: number;
};

export function SrsOnlyChip({ srsStage }: SrsOnlyChipProps) {
  return <PillChip className="border-line bg-surface text-foreground">SRS {srsStage}</PillChip>;
}

type ReviewTimingChipProps = {
  label: string;
  className: string;
};

export function ReviewTimingChip({ label, className }: ReviewTimingChipProps) {
  return <PillChip className={className}>{label}</PillChip>;
}
