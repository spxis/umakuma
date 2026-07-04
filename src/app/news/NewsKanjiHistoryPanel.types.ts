import type { NewsKanjiHistoryEntry } from "./newsKanjiHistory";

export type NewsKanjiHistoryPanelProps = {
  entries: NewsKanjiHistoryEntry[];
  onSelect: (run: string) => void;
  onRemove: (run: string) => void;
  onClear: () => void;
};
