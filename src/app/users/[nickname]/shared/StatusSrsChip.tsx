import type { LevelItem } from "../explorerTypes";
import type { ReactNode } from "react";
import { statusClass, statusShortLabel } from "../level-explorer/lib/levelExplorerDisplay";
import { ExplorerPill } from "./ExplorerPill";
import { NO_TRANSLATE_CLASS } from "@/app/shared/japaneseText";

type PillChipProps = {
  className?: string;
  children: ReactNode;
};

export function PillChip({ className = "", children }: PillChipProps) {
  return <ExplorerPill className={className}>{children}</ExplorerPill>;
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
      {/*
        * One string, and translation refused. Built from three children it was
        * three text nodes with the spacing between them up for grabs, and it
        * came back as "APPR- SRS4".
        */}
      <span translate="no" className={NO_TRANSLATE_CLASS}>{`${statusShortLabel(status)} - SRS ${srsStage}`}</span>
    </PillChip>
  );
}

type SrsOnlyChipProps = {
  srsStage: number;
};

export function SrsOnlyChip({ srsStage }: SrsOnlyChipProps) {
  return (
    <PillChip className="border-line bg-surface text-foreground">
      <span translate="no" className={NO_TRANSLATE_CLASS}>{`SRS ${srsStage}`}</span>
    </PillChip>
  );
}

type ReviewTimingChipProps = {
  label: string;
  className: string;
};

export function ReviewTimingChip({ label, className }: ReviewTimingChipProps) {
  return <PillChip className={className}>{label}</PillChip>;
}
