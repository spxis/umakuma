import type { NewsHistoryEntry } from "./newsHistory";

export type NewsHistoryPanelProps = {
  entries: NewsHistoryEntry[];
  activeUrl: string | null;
  onSelect: (url: string) => void;
  onRemove: (url: string) => void;
  onClear: () => void;
};
