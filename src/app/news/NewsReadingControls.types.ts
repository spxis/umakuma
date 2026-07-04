import type {
  NewsReadingPrefs,
} from "./newsReadingPrefs";

export type NewsReadingControlsProps = {
  prefs: NewsReadingPrefs;
  onChange: (next: NewsReadingPrefs) => void;
  userWkLevel?: number | null;
};
