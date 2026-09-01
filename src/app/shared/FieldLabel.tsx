import type { ElementType, ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** `sm` is the common caption; `xs` is the denser variant used inside cards. */
  size?: "sm" | "xs";
  tone?: "default" | "muted" | "strong";
  as?: ElementType;
  className?: string;
};

const SIZES = {
  sm: "text-xs tracking-[0.08em]",
  xs: "text-[10px] tracking-[0.1em]",
} as const;

const TONES = {
  default: "text-foreground/70",
  muted: "text-foreground/60",
  strong: "text-foreground/85",
} as const;

/**
 * The small uppercase caption used above values, in card headers and on stat
 * tiles. It had drifted into several near-identical spellings that differed
 * only in tracking and opacity; this settles one of each size.
 */
export default function FieldLabel({
  children,
  size = "sm",
  tone = "default",
  as: Tag = "p",
  className = "",
}: Props) {
  return (
    <Tag className={`font-bold uppercase ${SIZES[size]} ${TONES[tone]} ${className}`.trim()}>
      {children}
    </Tag>
  );
}
