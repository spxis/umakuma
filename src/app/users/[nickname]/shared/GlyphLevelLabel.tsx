type Props = {
  level: number | null | undefined;
  className?: string;
};

export default function GlyphLevelLabel({ level, className }: Props) {
  if (typeof level !== "number") {
    return null;
  }

  return (
    <span
      className={`pointer-events-none absolute right-2 top-2 z-10 text-[10px] font-black leading-none tracking-[0.04em] text-foreground/40 ${className ?? ""}`}
    >
      L{level}
    </span>
  );
}
