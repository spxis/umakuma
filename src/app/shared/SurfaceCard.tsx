import type { ElementType, ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** `muted` sits on the page; `plain` sits on top of a muted surface. */
  tone?: "plain" | "muted";
  padding?: "sm" | "md";
  className?: string;
};

const TONES = {
  plain: "bg-surface",
  muted: "bg-surface-muted",
} as const;

const PADDING = { sm: "p-3", md: "p-4" } as const;

/** The bordered rounded panel used for detail tiles and grouped facts. */
export default function SurfaceCard({
  children,
  tone = "muted",
  padding = "sm",
  className = "",
  as: Tag = "div",
}: Props & { as?: ElementType }) {
  return (
    <Tag className={`rounded-xl border border-line ${TONES[tone]} ${PADDING[padding]} ${className}`.trim()}>
      {children}
    </Tag>
  );
}
