"use client";

import { useId } from "react";

import { STUDY_TAG_LIST_COPY } from "./studyTagListsUi";

/**
 * The search box every list surface uses.
 *
 * One field, so the viewer, a list's page and a live list's page all behave
 * the same: a clear button while there is something to clear, and the list's
 * own items offered as the reader types. They had drifted - the viewer had
 * both, the two pages had neither - which is exactly the sort of difference
 * that makes a set of pages feel like different products.
 */
export default function ListSearchField({
  value,
  onChange,
  options = [],
  label = STUDY_TAG_LIST_COPY.searchPlaceholder,
  className = "",
}: {
  value: string;
  onChange: (next: string) => void;
  /** What the list holds, offered as the reader types. */
  options?: readonly { value: string; label?: string }[];
  label?: string;
  className?: string;
}) {
  const listId = useId();

  return (
    <span className={`relative min-w-0 flex-1 ${className}`.trim()}>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        list={options.length > 0 ? listId : undefined}
        placeholder={label}
        aria-label={label}
        className="h-9 w-full rounded-full border border-line bg-surface pl-4 pr-9 text-sm font-semibold text-foreground [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={STUDY_TAG_LIST_COPY.clearSearch}
          className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-sm font-black text-foreground/60 hover:bg-surface-muted"
        >
          ×
        </button>
      ) : null}
      {options.length > 0 ? (
        <datalist id={listId}>
          {options.slice(0, 300).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label ?? ""}
            </option>
          ))}
        </datalist>
      ) : null}
    </span>
  );
}
