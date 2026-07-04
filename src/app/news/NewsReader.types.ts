import type { DiscoveredLink } from "@/lib/news/newsDiscover";

export type Mode = "article" | "site";

export type DiscoverState = {
  baseUrl: string | null;
  links: DiscoveredLink[];
  cached: boolean;
  cachedAgeMs?: number;
  fetchedAt?: string;
};

export type NewsReaderProps = {
  devSampleUrls?: string[];
  userWkLevel?: number | null;
};

export type RouteChanges = {
  url?: string | null;
  site?: string | null;
};

export type FetchDiscoverOptions = {
  forceRefresh?: boolean;
  preserveArticle?: boolean;
  navigation?: "replace" | "push";
};
