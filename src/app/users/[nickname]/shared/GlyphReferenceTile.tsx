"use client";

import type { SubjectType } from "@/lib/domainConstants";
import { relatedReferenceCardClass } from "../level-explorer/lib/levelExplorerDisplay";

type GlyphReferenceTileProps = {
  glyph: string;
  subtitle?: string | null;
  subjectType?: SubjectType;
  wkLevel?: number | null;
  size?: "normal" | "large";
  onClick?: () => void;
  className?: string;
};

function glyphClass(label: string, size: "normal" | "large"): string {
  if (size === "normal") return "text-xl";

  const length = Array.from(label).length;
  if (length <= 2) return "text-4xl";
  if (length <= 4) return "text-3xl";
  return "text-2xl";
}

function levelBadge(level: number) {
  return (
    <span className="pointer-events-none absolute right-1.5 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-transparent bg-transparent px-1.5 text-[9px] font-black leading-none tracking-[0.04em] text-foreground/65 opacity-50 transition-all duration-150 group-hover/glyph-tile:opacity-100 group-hover/glyph-tile:border-line/70 group-focus-within/glyph-tile:opacity-100 group-focus-within/glyph-tile:border-line/70 group-focus-visible/glyph-tile:opacity-100 group-focus-visible/glyph-tile:border-line/70">
      L{level}
    </span>
  );
}

export default function GlyphReferenceTile({
  glyph,
  subtitle,
  subjectType,
  wkLevel,
  size = "normal",
  onClick,
  className,
}: GlyphReferenceTileProps) {
  const isClickable = typeof onClick === "function";
  const subtitleText = typeof subtitle === "string" && subtitle.trim() ? subtitle : null;
  const baseClass = [
    relatedReferenceCardClass(subjectType, isClickable, size),
    "group/glyph-tile relative inline-flex min-h-[4.625rem] min-w-[5rem] flex-col items-center justify-center text-center",
    size === "large" ? "sm:min-h-[5.25rem] sm:min-w-[5.75rem]" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  if (isClickable) {
    return (
      <button type="button" onClick={onClick} className={baseClass}>
        {typeof wkLevel === "number" ? levelBadge(wkLevel) : null}
        <span className="inline-flex translate-y-[3px] flex-col items-center">
          <span className={`${glyphClass(glyph, size)} font-black leading-none`}>{glyph}</span>
          {subtitleText ? (
            <span className="mt-1 text-center text-sm font-semibold leading-none text-foreground/70">
              {subtitleText}
            </span>
          ) : null}
        </span>
      </button>
    );
  }

  return (
    <span className={baseClass}>
      {typeof wkLevel === "number" ? levelBadge(wkLevel) : null}
      <span className="inline-flex translate-y-[3px] flex-col items-center">
        <span className={`${glyphClass(glyph, size)} font-black leading-none`}>{glyph}</span>
        {subtitleText ? (
          <span className="mt-1 text-center text-sm font-semibold leading-none text-foreground/70">
            {subtitleText}
          </span>
        ) : null}
      </span>
    </span>
  );
}
