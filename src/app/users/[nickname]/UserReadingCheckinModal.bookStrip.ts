import { useEffect, useRef } from "react";

type UseBookStripAutoScrollInput = {
  open: boolean;
  showReading: boolean;
  selectedBookTitle: string;
  booksKey: string;
};

export function useBookStripAutoScroll({
  open,
  showReading,
  selectedBookTitle,
  booksKey,
}: UseBookStripAutoScrollInput) {
  const cardByTitleRef = useRef(new Map<string, HTMLDivElement | null>());

  useEffect(() => {
    if (!open || !showReading) {
      return;
    }

    const targetTitle = selectedBookTitle.trim();
    if (!targetTitle) {
      return;
    }

    const node = cardByTitleRef.current.get(targetTitle);
    if (!node) {
      return;
    }

    node.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [booksKey, open, selectedBookTitle, showReading]);

  return (title: string) => (node: HTMLDivElement | null) => {
    cardByTitleRef.current.set(title, node);
  };
}
