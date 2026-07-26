import type { ReactNode } from "react";
import type { LevelItem } from "../explorerTypes";
import {
  jlptLevelPillClass,
  shortSubjectTypeLabel,
  subjectTypePillClass,
} from "../level-explorer/lib/levelExplorerDisplay";
import StatusSrsChip from "./StatusSrsChip";

type Props = {
  item: Pick<LevelItem, "subjectType" | "jlptLevel" | "jlptMeta" | "status" | "srsStage">;
  showStatus?: boolean;
  children?: ReactNode;
  className?: string;
};

export default function GlyphStatusChipRow({
  item,
  showStatus = true,
  children,
  className = "",
}: Props) {
  return (
    <div
      className={`absolute left-1/2 top-3 z-10 flex max-w-[calc(100%-1.25rem)] -translate-x-1/2 flex-nowrap items-center justify-center gap-1 overflow-x-auto px-1 sm:top-4 ${className}`}
    >
      <span className={subjectTypePillClass(item.subjectType)}>
        {shortSubjectTypeLabel(item.subjectType)}
      </span>
      {typeof item.jlptMeta?.schoolGrade === "number" ? (
        <span className="subject-pill border-line bg-surface text-foreground">
          G{item.jlptMeta.schoolGrade}
        </span>
      ) : null}
      {item.jlptLevel ? <span className={jlptLevelPillClass()}>N{item.jlptLevel}</span> : null}
      {showStatus ? <StatusSrsChip status={item.status} srsStage={item.srsStage} /> : null}
      {children}
    </div>
  );
}
