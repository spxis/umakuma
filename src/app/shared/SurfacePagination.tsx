import Link from "next/link";

import { PAGINATION_COPY, type PaginationPlacement, type PaginationSlot } from "./paginationPlacement";

/**
 * One pager for every paged surface, placed where the surface needs it.
 *
 * The practice sheet is what forced the option. A grade is eighty kanji at
 * twelve to a sheet, and the only way to reach page four was to scroll past
 * three sheets of empty tracing squares - the pager sat at the foot because
 * that is where pagers conventionally sit, which is a reasonable default and a
 * bad rule. A long page wants it at both ends; a short one wants it once.
 *
 * So placement is the caller's decision, not the component's. A surface renders
 * both slots and names a placement; each slot draws itself only when the
 * placement includes it. That keeps the choice in one prop rather than in two
 * conditionals the caller has to keep agreeing with each other.
 */

type SurfacePaginationProps = {
  page: number;
  pageCount: number;
  /** Which slot this instance occupies. Render one of each and set the placement. */
  slot: PaginationSlot;
  placement: PaginationPlacement;
  /**
   * Where a page number leads. Href-driven surfaces stay linkable and work
   * without JavaScript; a client surface passes `onPageChange` instead.
   */
  hrefFor?: (page: number) => string;
  onPageChange?: (page: number) => void;
  /** Optional context - "Characters 13-24 of 80" - shown beside the controls. */
  summary?: string;
  className?: string;
};

export function shouldShowPagination(placement: PaginationPlacement, slot: PaginationSlot): boolean {
  if (placement === "none") return false;
  if (placement === "both") return true;
  return placement === slot;
}

const STEP_CLASS =
  "inline-flex h-8 items-center rounded-full border border-line px-3 text-xs font-bold uppercase tracking-[0.08em] transition";
const ENABLED_CLASS = "text-foreground/70 hover:bg-surface-muted";
const DISABLED_CLASS = "cursor-not-allowed border-line/60 text-foreground/30";

function Step({
  label,
  to,
  disabled,
  hrefFor,
  onPageChange,
}: {
  label: string;
  to: number;
  disabled: boolean;
  hrefFor?: (page: number) => string;
  onPageChange?: (page: number) => void;
}) {
  if (disabled) {
    return (
      <span aria-disabled="true" className={`${STEP_CLASS} ${DISABLED_CLASS}`}>
        {label}
      </span>
    );
  }

  if (hrefFor) {
    return (
      <Link href={hrefFor(to)} className={`${STEP_CLASS} ${ENABLED_CLASS}`}>
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => onPageChange?.(to)} className={`${STEP_CLASS} ${ENABLED_CLASS}`}>
      {label}
    </button>
  );
}

export default function SurfacePagination({
  page,
  pageCount,
  slot,
  placement,
  hrefFor,
  onPageChange,
  summary,
  className,
}: SurfacePaginationProps) {
  // A single page needs no pager at all, whatever the placement says.
  if (!shouldShowPagination(placement, slot) || pageCount <= 1) return null;

  const first = page <= 1;
  const last = page >= pageCount;
  const spacing = slot === "top" ? "mb-4" : "mt-4";

  return (
    <nav
      aria-label={PAGINATION_COPY.label}
      className={`${spacing} flex flex-wrap items-center justify-between gap-2 print:hidden ${className ?? ""}`.trim()}
    >
      <p className="text-xs text-foreground/55">
        {summary ?? `${PAGINATION_COPY.page} ${page} ${PAGINATION_COPY.of} ${pageCount}`}
      </p>
      <div className="flex items-center gap-2">
        <Step
          label={PAGINATION_COPY.previous}
          to={page - 1}
          disabled={first}
          hrefFor={hrefFor}
          onPageChange={onPageChange}
        />
        <Step
          label={PAGINATION_COPY.next}
          to={page + 1}
          disabled={last}
          hrefFor={hrefFor}
          onPageChange={onPageChange}
        />
      </div>
    </nav>
  );
}
