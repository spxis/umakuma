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
  studyMode: boolean;
  reviewedVisible: boolean;
  studyCounts: { reviews?: number; reviewsTotal?: number; lessons?: number } | null;
  onSetQueueMode: (mode: QueueType) => void;
  onSetQueueTagFilter: (filter: StudyTagFilter) => void;
  onSetIncludeTrouble: (enabled: boolean) => void;
  onSetReviewedVisible: (visible: boolean) => void;
};

export default function ExplorerTabsStudyQueueMenu({
  queueMode,
  queueTagFilter,
  includeTrouble,
  studyMode,
  reviewedVisible,
  studyCounts,
  onSetQueueMode,
  onSetQueueTagFilter,
  onSetIncludeTrouble,
  onSetReviewedVisible,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoverCloseTimerRef = useRef<number | null>(null);
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const isPinnedOpenForReview = queueMode === QUEUE_TYPES.review && isPinnedOpen;
  const isMenuOpen = queueMode === QUEUE_TYPES.review && (isHoverOpen || isPinnedOpenForReview);

  const overlayOptionClass = (active: boolean): string => {
    return active
      ? "w-full rounded-lg px-3 py-2 text-left transition bg-accent/12 text-accent"
      : "w-full rounded-lg px-3 py-2 text-left transition text-foreground hover:bg-surface-muted";
  };

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
          className="absolute left-0 top-full z-80 mt-2 w-[min(100vw-2rem,26rem)] rounded-xl border border-line bg-surface p-2 shadow-[0_18px_42px_rgba(8,16,36,0.16)]"
          onMouseEnter={openHoverMenu}
          onMouseLeave={closeHoverMenuSoon}
        >
          <div role="tablist" aria-label="Review filter" className="space-y-1">
            <button
              type="button"
              role="tab"
              aria-selected={queueTagFilter === "all"}
              onMouseEnter={() => onSetQueueTagFilter("all")}
              onClick={() => onSetQueueTagFilter("all")}
              className={overlayOptionClass(queueTagFilter === "all")}
            >
              <p className="text-xs font-black uppercase tracking-[0.08em]">Due reviews</p>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={queueTagFilter === "trouble"}
              onMouseEnter={() => onSetQueueTagFilter("trouble")}
              onClick={() => onSetQueueTagFilter("trouble")}
              className={overlayOptionClass(queueTagFilter === "trouble")}
            >
              <p className="text-xs font-black uppercase tracking-[0.08em]">Trouble</p>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={queueTagFilter === "favorite"}
              onMouseEnter={() => onSetQueueTagFilter("favorite")}
              onClick={() => onSetQueueTagFilter("favorite")}
              className={overlayOptionClass(queueTagFilter === "favorite")}
            >
              <p className="text-xs font-black uppercase tracking-[0.08em]">Favorites</p>
            </button>
          </div>
          <div className="mt-1 space-y-1 border-t border-line pt-1" role="tablist" aria-label="Review queue mix">
            <button
              type="button"
              role="tab"
              aria-selected={!includeTrouble}
              onMouseEnter={() => onSetIncludeTrouble(false)}
              onClick={() => onSetIncludeTrouble(false)}
              className={overlayOptionClass(!includeTrouble)}
            >
              <p className="text-xs font-black uppercase tracking-[0.08em]">Due only</p>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={includeTrouble}
              onMouseEnter={() => onSetIncludeTrouble(true)}
              onClick={() => onSetIncludeTrouble(true)}
              className={overlayOptionClass(includeTrouble)}
            >
              <p className="text-xs font-black uppercase tracking-[0.08em]">Due + trouble</p>
            </button>
          </div>
          {!studyMode ? (
            <div className="mt-1 space-y-1 border-t border-line pt-1" role="tablist" aria-label="Reviewed visibility filter">
              <button
                type="button"
                role="tab"
                aria-selected={!reviewedVisible}
                onMouseEnter={() => onSetReviewedVisible(false)}
                onClick={() => onSetReviewedVisible(false)}
                className={overlayOptionClass(!reviewedVisible)}
              >
                <p className="text-xs font-black uppercase tracking-[0.08em]">Reviewed OFF</p>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={reviewedVisible}
                onMouseEnter={() => onSetReviewedVisible(true)}
                onClick={() => onSetReviewedVisible(true)}
                className={overlayOptionClass(reviewedVisible)}
              >
                <p className="text-xs font-black uppercase tracking-[0.08em]">Reviewed ON</p>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
