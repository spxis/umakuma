"use client";

import { useEffect, useRef, useState } from "react";
import FilterChipLabel from "./shared/FilterChipLabel";
import { formatReviewCountLabel, queueModeSegmentClass } from "./explorerTabsView";
import type { StudyTagFilter } from "./study-explorer/lib/studyExplorerTypes";
import { QUEUE_TYPES, type QueueType } from "@/lib/domainConstants";

const HOVER_CLOSE_DELAY_MS = 220;

type Props = {
  queueMode: QueueType;
  queueTagFilter: StudyTagFilter;
  includeTrouble: boolean;
  studyCounts: { reviews?: number; reviewsTotal?: number; lessons?: number } | null;
  onSetQueueMode: (mode: QueueType) => void;
  onSetQueueTagFilter: (filter: StudyTagFilter) => void;
  onSetIncludeTrouble: (next: boolean) => void;
};

export default function ExplorerTabsStudyQueueMenu({
  queueMode,
  queueTagFilter,
  includeTrouble,
  studyCounts,
  onSetQueueMode,
  onSetQueueTagFilter,
  onSetIncludeTrouble,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoverCloseTimerRef = useRef<number | null>(null);
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const isPinnedOpenForReview = queueMode === QUEUE_TYPES.review && isPinnedOpen;
  const isMenuOpen = queueMode === QUEUE_TYPES.review && (isHoverOpen || isPinnedOpenForReview);

  const cancelHoverCloseTimer = () => {
    if (hoverCloseTimerRef.current === null) {
      return;
    }
    window.clearTimeout(hoverCloseTimerRef.current);
    hoverCloseTimerRef.current = null;
  };

  const openHoverMenu = () => {
    cancelHoverCloseTimer();
    if (queueMode === QUEUE_TYPES.review) {
      setIsHoverOpen(true);
    }
  };

  const closeHoverMenuSoon = () => {
    cancelHoverCloseTimer();
    hoverCloseTimerRef.current = window.setTimeout(() => {
      setIsHoverOpen(false);
      hoverCloseTimerRef.current = null;
    }, HOVER_CLOSE_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      cancelHoverCloseTimer();
    };
  }, []);

  useEffect(() => {
    if (!isPinnedOpenForReview) {
      return;
    }

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target || !containerRef.current?.contains(target)) {
        setIsPinnedOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPinnedOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("touchstart", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isPinnedOpenForReview]);

  const handleReviewClick = () => {
    onSetQueueMode(QUEUE_TYPES.review);
    setIsHoverOpen(true);
    setIsPinnedOpen((prev) => (queueMode === QUEUE_TYPES.review ? !prev : true));
  };

  const handleLessonsClick = () => {
    onSetQueueMode(QUEUE_TYPES.lesson);
    setIsHoverOpen(false);
    setIsPinnedOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-flex min-w-0 flex-[2_1_0%] md:flex-none"
      onMouseEnter={openHoverMenu}
      onMouseLeave={closeHoverMenuSoon}
    >
      <div className="inline-flex min-w-0 flex-1 items-center rounded-full border border-line bg-surface p-1" role="tablist" aria-label="Study queue mode">
        <button
          type="button"
          role="tab"
          aria-selected={queueMode === QUEUE_TYPES.review}
          aria-expanded={isMenuOpen}
          onClick={handleReviewClick}
          className={queueModeSegmentClass(QUEUE_TYPES.review, queueMode)}
        >
          <FilterChipLabel label="Reviews" count={formatReviewCountLabel(studyCounts)} />
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={queueMode === QUEUE_TYPES.lesson}
          onClick={handleLessonsClick}
          className={queueModeSegmentClass(QUEUE_TYPES.lesson, queueMode)}
        >
          <FilterChipLabel label="Lessons" count={typeof studyCounts?.lessons === "number" ? studyCounts.lessons : "..."} />
        </button>
      </div>

      {isMenuOpen ? (
        <div
          className="absolute left-0 top-full z-[80] mt-2 w-[min(100vw-2rem,26rem)] rounded-2xl border border-line bg-surface p-2 shadow-[0_14px_30px_rgba(8,16,36,0.2)]"
          onMouseEnter={openHoverMenu}
          onMouseLeave={closeHoverMenuSoon}
        >
          <div className="inline-flex w-full items-center rounded-full border border-line bg-surface p-1" role="tablist" aria-label="Study tag filter">
            <button type="button" role="tab" aria-selected={queueTagFilter === "all"} onClick={() => onSetQueueTagFilter("all")} className={queueModeSegmentClass(QUEUE_TYPES.review, queueTagFilter === "all" ? QUEUE_TYPES.review : QUEUE_TYPES.lesson)}>All</button>
            <button type="button" role="tab" aria-selected={queueTagFilter === "trouble"} onClick={() => onSetQueueTagFilter("trouble")} className={queueModeSegmentClass(QUEUE_TYPES.review, queueTagFilter === "trouble" ? QUEUE_TYPES.review : QUEUE_TYPES.lesson)}>Trouble</button>
            <button type="button" role="tab" aria-selected={queueTagFilter === "favorite"} onClick={() => onSetQueueTagFilter("favorite")} className={queueModeSegmentClass(QUEUE_TYPES.review, queueTagFilter === "favorite" ? QUEUE_TYPES.review : QUEUE_TYPES.lesson)}>Favorites</button>
          </div>
          <button
            type="button"
            onClick={() => onSetIncludeTrouble(!includeTrouble)}
            className={`mt-2 inline-flex h-9 w-full items-center justify-center whitespace-nowrap rounded-full border px-2.5 text-[10px] font-bold uppercase tracking-[0.06em] transition sm:h-10 sm:px-4 sm:text-xs sm:tracking-widest ${
              includeTrouble
                ? "border-amber-500 bg-amber-500 text-white"
                : "border-line bg-surface text-foreground hover:bg-surface-muted"
            }`}
          >
            <span className="sm:hidden">Trouble mix {includeTrouble ? "On" : "Off"}</span>
            <span className="hidden sm:inline">Trouble mix {includeTrouble ? "On" : "Off"}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
