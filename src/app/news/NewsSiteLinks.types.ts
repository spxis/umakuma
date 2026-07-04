import type { DiscoveredLink } from "@/lib/news/newsDiscover";

export type NewsSiteLinksProps = {
  baseUrl: string | null;
  links: DiscoveredLink[];
  cached: boolean;
  cachedAgeMs?: number;
  fetchedAt?: string;
  loading: boolean;
  error: string | null;
  onSelect: (url: string) => void;
  onDismiss: () => void;
};
