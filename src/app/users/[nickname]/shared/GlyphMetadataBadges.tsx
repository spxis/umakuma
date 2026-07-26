type Props = {
  level?: number | null;
  successRate?: number | null;
  hoverGroup?: "glyph-tile" | "explorer-card";
};

const baseClass =
  "pointer-events-none absolute top-1 z-10 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-transparent bg-transparent px-1.5 text-[9px] font-black leading-none tracking-[0.04em] text-foreground/65 opacity-50 transition-all duration-150";

function hoverClass(group: NonNullable<Props["hoverGroup"]>): string {
  return group === "glyph-tile"
    ? "group-hover/glyph-tile:border-line/70 group-hover/glyph-tile:opacity-100 group-focus-within/glyph-tile:border-line/70 group-focus-within/glyph-tile:opacity-100 group-focus-visible/glyph-tile:border-line/70 group-focus-visible/glyph-tile:opacity-100"
    : "group-hover/explorer-card:border-line/70 group-hover/explorer-card:opacity-100 group-focus-within/explorer-card:border-line/70 group-focus-within/explorer-card:opacity-100 group-focus-visible/explorer-card:border-line/70 group-focus-visible/explorer-card:opacity-100";
}

export default function GlyphMetadataBadges({
  level,
  successRate,
  hoverGroup = "explorer-card",
}: Props) {
  const interactionClass = hoverClass(hoverGroup);
  const validRate =
    typeof successRate === "number" && Number.isFinite(successRate)
      ? Math.max(0, Math.min(100, Math.round(successRate)))
      : null;

  return (
    <>
      {validRate !== null ? (
        <span className={`${baseClass} left-1.5 ${interactionClass}`}>{validRate}%</span>
      ) : null}
      {typeof level === "number" ? (
        <span className={`${baseClass} right-1.5 ${interactionClass}`}>L{level}</span>
      ) : null}
    </>
  );
}
