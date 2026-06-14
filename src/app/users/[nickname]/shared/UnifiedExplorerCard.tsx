"use client";

import type { ReactNode } from "react";
import { useGlyphFontPreference } from "@/lib/glyphFontPreference";

type Props = {
  onClick: (meta?: { shiftKey: boolean }) => void;
  className: string;
  indexLabel: ReactNode;
  topRight: ReactNode;
  glyphClassName: string;
  dataSubjectId?: number; // Added optional dataSubjectId
  glyphText: string;
  glyphTextClassName: string;
  glyphSubtitle?: ReactNode;
  glyphOverlay?: ReactNode;
  statusChip: ReactNode;
  middleChip?: ReactNode;
  rightChip: ReactNode;
};

export default function UnifiedExplorerCard({
  onClick,
  className,
  indexLabel,
  topRight,
  glyphClassName,
  dataSubjectId, // Destructured dataSubjectId
  glyphText,
  glyphTextClassName,
  glyphSubtitle,
  glyphOverlay,
  statusChip,
  middleChip,
  rightChip,
}: Props) {
  const { fontFamily } = useGlyphFontPreference();

  return (
    <button
      type="button"
      onClick={(event) => onClick({ shiftKey: event.shiftKey })}
      data-explorer-card-subject-id={dataSubjectId} // Added data-explorer-card-subject-id attribute
      className={`group/explorer-card ${className} focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70`}
    >
      <div className="flex min-h-[2.35rem] items-start justify-between gap-2">
        <span className="text-[10px] font-semibold text-foreground/45">{indexLabel}</span>
        <div className="flex min-h-[2.2rem] flex-wrap content-start items-start justify-end gap-1">{topRight}</div>
      </div>

      <div className={`relative mt-2 flex h-[8rem] flex-col justify-center rounded-xl border px-3 py-2 ${glyphClassName}`}>
        {glyphOverlay}
        <p style={{ fontFamily }} className={`${glyphTextClassName} text-center font-black leading-none`}>{glyphText}</p>
        <p className="mt-1 min-h-[1.35rem] truncate whitespace-nowrap text-center text-base font-semibold text-foreground/70">{glyphSubtitle ?? ""}</p>
      </div>

      <div className="mt-3 grid grid-cols-3 items-center gap-2">
        <span className="inline-flex items-center justify-self-start leading-none">{statusChip}</span>
        <span className="inline-flex items-center justify-self-center leading-none">{middleChip ?? <span />}</span>
        <span className="inline-flex items-center justify-self-end leading-none">{rightChip}</span>
      </div>
    </button>
  );
}
