"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ReadingChallengeBookRecord } from "@/lib/readingSignoff";

import UserReadingBookCoverImage from "./UserReadingBookCoverImage";

type UserReadingBookTitleSelectProps = {
  options: ReadingChallengeBookRecord[];
  value: string;
  onChange: (nextTitle: string) => void;
  ariaLabel: string;
  placeholder?: string;
};

type BookTitleOption = {
  key: string;
  title: string;
  isbn?: string;
  thumbnailUrl: string | null;
};

export default function UserReadingBookTitleSelect({
  options,
  value,
  onChange,
  ariaLabel,
  placeholder = "Select book",
}: UserReadingBookTitleSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const titleOptions = useMemo(() => {
    const mapped: BookTitleOption[] = options.map((option) => ({
      key: option.id,
      title: option.title,
      isbn: option.isbn,
      thumbnailUrl: option.thumbnailUrl,
    }));

    const hasCurrent = mapped.some((option) => option.title === value);
    if (!hasCurrent && value.trim().length > 0) {
      mapped.unshift({
        key: "__custom__",
        title: value,
        thumbnailUrl: null,
      });
    }

    return mapped;
  }, [options, value]);

  const selectedOption = titleOptions.find((option) => option.title === value) ?? null;

  useEffect(() => {
    if (!open) {
      return;
    }

    function onMouseDown(event: MouseEvent) {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }

      setOpen(false);
    }

    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded border border-line bg-surface px-2 py-1 text-xs text-left"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (titleOptions.length === 0) {
            return;
          }
          setOpen((previous) => !previous);
        }}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedOption ? (
            <UserReadingBookCoverImage
              isbn={selectedOption.isbn}
              title={selectedOption.title}
              thumbnailUrl={selectedOption.thumbnailUrl}
              width={16}
              height={22}
              size="small"
              className="h-5.5 w-4 shrink-0 rounded object-cover"
            />
          ) : null}
          <span className="truncate">{selectedOption?.title || placeholder}</span>
        </span>
        <span className="text-[10px] text-foreground/65" aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-20 max-h-64 overflow-y-auto rounded border border-line bg-surface shadow-lg"
          role="listbox"
          aria-label={ariaLabel}
        >
          {titleOptions.map((option) => {
            const selected = option.title === value;
            return (
              <button
                key={option.key}
                type="button"
                className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs ${
                  selected ? "bg-brand/15" : "hover:bg-surface-muted"
                }`}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.title);
                  setOpen(false);
                }}
              >
                <UserReadingBookCoverImage
                  isbn={option.isbn}
                  title={option.title}
                  thumbnailUrl={option.thumbnailUrl}
                  width={16}
                  height={22}
                  size="small"
                  className="h-5.5 w-4 shrink-0 rounded object-cover"
                />
                <span className="truncate">{option.title}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}