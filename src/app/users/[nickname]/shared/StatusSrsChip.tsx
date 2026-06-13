import type { LevelItem } from "../explorerTypes";
import type { ReactNode } from "react";
import { statusClass, statusShortLabel } from "../level-explorer/lib/levelExplorerDisplay";

type PillChipProps = {
  className?: string;
  children: ReactNode;
};

export function PillChip({ className = "", children }: PillChipProps) {
  return <span className={`subject-pill inline-flex min-h-6 items-center justify-center whitespace-nowrap ${className}`}>{children}</span>;
}

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
    <PillChip className={`${includeBorder ? "border-line " : ""}${statusClass(status)}`}>
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
