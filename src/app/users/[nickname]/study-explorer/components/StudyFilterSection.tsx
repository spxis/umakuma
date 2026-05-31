import type { ReactNode } from "react";

type Props = {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  ariaLabel: string;
  children: ReactNode;
};

export default function StudyFilterSection({
  title,
  isOpen,
  onToggle,
  ariaLabel,
  children,
}: Props) {
  return (
    <div className="inline-flex max-w-full items-start gap-1 rounded-xl border border-line bg-surface px-1.5 py-1">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={!isOpen}
        className="inline-flex h-7 items-center px-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/70"
        title={isOpen ? `Compact ${title}` : `Expand ${title}`}
      >
        {title}
      </button>
      <div
        className="flex min-w-0 flex-1 flex-wrap items-center gap-1"
        role="tablist"
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </div>
  );
}
