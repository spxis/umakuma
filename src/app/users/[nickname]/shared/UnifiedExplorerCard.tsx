"use client";

import type { ReactNode } from "react";
import { useGlyphFontPreference } from "@/lib/glyphFontPreference";
import { noTranslateClass } from "@/app/shared/japaneseText";

type Props = {
  onClick: (meta?: { shiftKey: boolean }) => void;
  activateOn?: "card" | "glyph-box";
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
  /**
   * Cards for browsing, rows for scanning a long level at a glance.
   *
   * Both explorers draw through this component, so the row layout lives here
   * once rather than being rebuilt per surface - which is how the grade grid
   * ended up with its own and the other two with none.
   */
  density?: "grid" | "list";
};

export default function UnifiedExplorerCard({
  onClick,
  activateOn = "card",
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
  density = "grid",
}: Props) {
  const rows = density === "list";
  const { fontFamily } = useGlyphFontPreference();
  const rootCursorClass = activateOn === "card" ? "cursor-pointer" : "cursor-default";
  const glyphCursorClass = activateOn === "glyph-box" ? "cursor-pointer" : "";
  const getInteractiveAncestor = (target: EventTarget | null): HTMLElement | null => {
    if (!(target instanceof HTMLElement)) {
      return null;
    }

    return target.closest(
      "button, input, select, textarea, a, [role='button'], [role='checkbox'], [role='switch']",
    );
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(event) => {
        const interactiveAncestor = getInteractiveAncestor(event.target);
        if (interactiveAncestor && interactiveAncestor !== event.currentTarget) {
          return;
        }

        if (activateOn === "glyph-box" && event.detail > 0) {
          const target = event.target as HTMLElement | null;
          if (!target?.closest('[data-explorer-glyph-hitbox="true"]')) {
            return;
          }
        }
        onClick({ shiftKey: event.shiftKey });
      }}
      onKeyDown={(event) => {
        const interactiveAncestor = getInteractiveAncestor(event.target);
        if (interactiveAncestor && interactiveAncestor !== event.currentTarget) {
          return;
        }

        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        onClick({ shiftKey: event.shiftKey });
      }}
      data-explorer-card-subject-id={dataSubjectId} // Added data-explorer-card-subject-id attribute
      className={`group/explorer-card focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${rootCursorClass} ${className}`}
    >
      {rows ? (
        /* One line: index, glyph, what it means, then the chips at the end. */
        <div className="flex min-w-0 items-center gap-3">
          <span translate="no" className={noTranslateClass("w-8 shrink-0 text-[10px] font-semibold text-foreground/45")}>{indexLabel}</span>
          <div
            data-explorer-glyph-hitbox="true"
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${glyphCursorClass} ${glyphClassName}`}
          >
            {glyphOverlay}
            <p
              lang="ja"
              translate="no"
              style={{ fontFamily }}
              className={noTranslateClass("text-xl font-black leading-none")}
            >
              {glyphText}
            </p>
          </div>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground/75">{glyphSubtitle ?? ""}</span>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">{topRight}</div>
          <div className="flex shrink-0 items-center gap-2">
            {statusChip}
            {middleChip ?? null}
            {rightChip}
          </div>
        </div>
      ) : (
        <>
          <div className="flex min-h-[2.35rem] items-start justify-between gap-2">
            <span translate="no" className={noTranslateClass("text-[10px] font-semibold text-foreground/45")}>{indexLabel}</span>
            <div className="flex min-h-[2.2rem] flex-wrap content-start items-start justify-end gap-1">{topRight}</div>
          </div>

          <div
            data-explorer-glyph-hitbox="true"
            className={`relative mt-2 flex h-[8rem] flex-col justify-center rounded-xl border px-3 py-2 ${glyphCursorClass} ${glyphClassName}`}
          >
            {glyphOverlay}
            <p
              lang="ja"
              translate="no"
              style={{ fontFamily }}
              className={noTranslateClass(`${glyphTextClassName} text-center font-black leading-none`)}
            >
              {glyphText}
            </p>
            <p className="mt-1 min-h-[1.35rem] truncate whitespace-nowrap text-center text-base font-semibold text-foreground/70">{glyphSubtitle ?? ""}</p>
          </div>

          <div className="mt-3 grid grid-cols-3 items-center gap-2">
            <span className="inline-flex items-center justify-self-start leading-none">{statusChip}</span>
            <span className="inline-flex items-center justify-self-center leading-none">{middleChip ?? <span />}</span>
            <span className="inline-flex items-center justify-self-end leading-none">{rightChip}</span>
          </div>
        </>
      )}
    </div>
  );
}
