import type { DiscoverCacheSession } from "./newsClientCache";

export type NewsDiscoverSessionsProps = {
  sessions: DiscoverCacheSession[];
  activeQueryUrl: string | null;
  loading: boolean;
  onOpen: (queryUrl: string) => void;
  onRefresh: (queryUrl: string) => void;
  onRemove: (queryUrl: string) => void;
  onClearAll: () => void;
};
