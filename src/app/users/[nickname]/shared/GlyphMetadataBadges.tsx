"use client";

import { NO_TRANSLATE_CLASS } from "@/app/shared/japaneseText";

import { useIsRowDensity } from "./explorerCardDensity";
import { wkLevelBadge } from "@/lib/levelBadge";

type Props = {
  level?: number | null;
  successRate?: number | null;
  hoverGroup?: "glyph-tile" | "explorer-card";
};

/**
 * The level and success rate in the glyph box's top corners.
 *
 * These used to be transparent, borderless labels at half opacity that only
 * grew a border on hover, so the same level read as a pill in the lists and as
 * faint text on a card. They are pills everywhere now; hover still deepens them
 * rather than being what makes them legible.
 */
const baseClass =
  "subject-pill pointer-events-none absolute top-1.5 z-10 border-line bg-surface/85 text-foreground/70 transition-all duration-150";

function hoverClass(group: NonNullable<Props["hoverGroup"]>): string {
  return group === "glyph-tile"
    ? "group-hover/glyph-tile:text-foreground group-focus-within/glyph-tile:text-foreground"
    : "group-hover/explorer-card:text-foreground group-focus-within/explorer-card:text-foreground";
}

export default function GlyphMetadataBadges({
  level,
  successRate,
  hoverGroup = "explorer-card",
}: Props) {
  const interactionClass = hoverClass(hoverGroup);
  const inRow = useIsRowDensity();
  const validRate =
    typeof successRate === "number" && Number.isFinite(successRate)
      ? Math.max(0, Math.min(100, Math.round(successRate)))
      : null;

  /*
   * In a row these are two more chips in the line, so they drop the absolute
   * placement that puts them in the card's corners. Kept in the same order -
   * rate then level - so the eye reads the same pair either way.
   */
  const chipClass = inRow
    ? `subject-pill pointer-events-none border-line bg-surface/85 text-foreground/70 ${interactionClass}`
    : `${baseClass} ${interactionClass}`;

  return (
    <>
      {validRate !== null ? (
        <span
          translate="no"
          className={`${NO_TRANSLATE_CLASS} ${chipClass} ${inRow ? "" : "left-1.5"}`}
        >{`${validRate}%`}</span>
      ) : null}
      {typeof level === "number" ? (
        <span
          translate="no"
          className={`${NO_TRANSLATE_CLASS} ${chipClass} ${inRow ? "" : "right-1.5"}`}
        >{wkLevelBadge(level)}</span>
      ) : null}
    </>
  );
}
