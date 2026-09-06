/** Copy for the display preferences, kept in one map for the locale layer. */
export const DISPLAY_PREFERENCES_COPY = {
  heading: "Display",
  /*
   * "Light or dark", not "Theme". A theme is what a member's SRS stages are
   * called - it has a strip in the header, a page of its own and a browser of
   * ninety - and this page used the same word two cards apart for the choice
   * between a white background and a black one. The word belongs to the
   * bigger idea; this one says what it actually does.
   */
  theme: "Light or dark",
  themeLight: "Light",
  themeDark: "Dark",
  jpFont: "Japanese font",
  jpFontSans: "Sans",
  /* Mincho keeps the tapered strokes a textbook shows; Gothic renders one weight. */
  jpFontSerif: "Serif",
  hint: "Remembered on this device, so a phone and a laptop can differ.",
} as const;
