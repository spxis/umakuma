import type { ReactNode } from "react";

type Props = {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  sectionId: string;
  ariaLabel: string;
  children: ReactNode;
};

export default function StudyFilterSection({
  title,
  isOpen,
  onToggle,
  sectionId,
  ariaLabel,
  children,
}: Props) {
  return (
    <div className="inline-flex max-w-full flex-col gap-1 rounded-xl border border-line bg-surface px-1.5 py-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={sectionId}
        className="inline-flex h-7 w-fit items-center gap-1 px-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/70"
      >
        {title}
        <span className="sm:hidden">{isOpen ? "-" : "+"}</span>
      </button>
      <div
        id={sectionId}
        className={`${isOpen ? "flex" : "hidden sm:flex"} min-w-0 flex-1 flex-wrap items-center gap-1`}
        role="tablist"
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </div>
  );
}
