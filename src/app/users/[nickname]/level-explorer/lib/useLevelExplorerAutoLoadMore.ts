import { useEffect, useRef, useState } from "react";
import type { LevelItem } from "../../explorerTypes";

const PAGE_SIZE = 40;

// Infinite-scroll style pagination: reveals more items as the sentinel div scrolls into view,
// while always keeping the selected item's page visible.
export function useLevelExplorerAutoLoadMore(filteredItems: LevelItem[], selectedItem: LevelItem | null) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const selectedItemIndex = selectedItem ? filteredItems.findIndex((item) => item.subjectId === selectedItem.subjectId) : -1;
  const effectiveVisibleCount = Math.min(
    filteredItems.length,
    Math.max(PAGE_SIZE, visibleCount, selectedItemIndex + 1),
  );

  useEffect(() => {
    if (!sentinelRef.current) {
      return;
    }
    if (effectiveVisibleCount >= filteredItems.length) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) {
          return;
        }
        setVisibleCount((prev) => Math.min(filteredItems.length, prev + PAGE_SIZE));
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [effectiveVisibleCount, filteredItems.length]);

  const visibleItems = filteredItems.slice(0, effectiveVisibleCount);
  return { sentinelRef, visibleItems };
}
