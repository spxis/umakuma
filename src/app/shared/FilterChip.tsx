import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { noTranslateClass } from "@/app/shared/japaneseText";

/**
 * A filter chip: a label, and the count of what choosing it would leave.
 *
 * One component for every row of filters on the site. There were four ways
 * to draw the same thing: the explorers printed `ALL (2,211)`, the stroke
 * pages `17 49`, the UmaKuma explorer `Radicals 3`, the source filters
 * `COMMON 44` - each a copy of the chip beside it with the count set a
 * different way. John: "how did this pass your QA? these all seem to be
 * one-offs and not using common components." The questions to ask of every
 * displayed thing: is it a component, is that component used everywhere the
 * same thing is shown, and can two variants be one if parameterised well.
 *
 * Not one component for everything: a chip that carries a milestone or no
 * count at all is a different thing and keeps its own shape. This is the
 * chip for a label with a count - a button or a link, one base, a tone the
 * surface may colour. A link with nowhere to go - a filter that would leave
 * nothing - is drawn as a dead end and is not a link, the rule the parts
 * grid follows. `filterChipSweep.test.ts` fails on a count drawn any other
 * way.
 */
export const FILTER_CHIP_CLASS =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] transition";

/** The plain tone: filled with the accent when on, outlined when off. */
export function filterChipTone(on: boolean): string {
  return on ? "border-accent bg-accent text-white" : "border-line bg-surface text-foreground hover:bg-surface-muted";
}

/**
 * The tone for a chip that stands for several of its neighbours.
 *
 * A range - "21-30", "1-7" - is not one of the values being chosen between, it
 * is a fold in the row, and it reads wrong in the plain tone: a member scanning
 * for the level they want sees it as another level. Amber says "press this and
 * the row changes shape" rather than "press this and the list changes".
 */
export function filterChipGroupTone(on: boolean): string {
  return on
    ? "border-amber-400 bg-amber-100 text-amber-900"
    : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200";
}

const DEAD_END_CLASS = "cursor-not-allowed opacity-40";

/** The label with its count. Numbers are formatted here, and only here. */
export function FilterChipLabel({ label, count }: { label: ReactNode; count: ReactNode }) {
  const shown = typeof count === "number" ? count.toLocaleString("en-US") : count;
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span>{label}</span>
      {/* A count is data. Translating it can only respace the brackets. */}
      <span translate="no" className={noTranslateClass("text-[10px] font-medium tracking-normal text-current/60")}>
        ({shown})
      </span>
    </span>
  );
}

function body(label: ReactNode, count: ReactNode | undefined) {
  return count === undefined ? label : <FilterChipLabel label={label} count={count} />;
}

type ButtonProps = Omit<ComponentProps<"button">, "children"> & {
  label: ReactNode;
  count?: ReactNode;
  toneClassName: string;
};

export function FilterChipButton({ label, count, toneClassName, className, ...buttonProps }: ButtonProps) {
  return (
    <button {...buttonProps} className={`${FILTER_CHIP_CLASS} ${toneClassName}${className ? ` ${className}` : ""}`}>
      {body(label, count)}
    </button>
  );
}

export default FilterChipButton;

export function FilterChipLink({
  href,
  on,
  label,
  count,
  toneClassName,
  title,
  className,
}: {
  /** Null for a filter that would leave nothing: drawn, dimmed, and not a link. */
  href: string | null;
  on: boolean;
  label: ReactNode;
  count?: ReactNode;
  /** Overrides the plain tone, for a surface with an accent of its own. */
  toneClassName?: string;
  title?: string;
  className?: string;
}) {
  const tone = toneClassName ?? filterChipTone(on);
  const classes = `${FILTER_CHIP_CLASS} ${tone}${className ? ` ${className}` : ""}`;
  if (href === null) {
    return (
      <span title={title} className={`${classes} ${DEAD_END_CLASS}`}>
        {body(label, count)}
      </span>
    );
  }
  return (
    <Link href={href} aria-current={on ? "page" : undefined} aria-pressed={on} title={title} className={classes}>
      {body(label, count)}
    </Link>
  );
}
