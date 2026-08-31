/** Copy for the display preferences, kept in one map for the locale layer. */
export const DISPLAY_PREFERENCES_COPY = {
  heading: "Display",
  theme: "Theme",
  themeLight: "Light",
  themeDark: "Dark",
  jpFont: "Japanese font",
  jpFontSans: "Sans",
  /* Mincho keeps the tapered strokes a textbook shows; Gothic renders one weight. */
  jpFontSerif: "Serif",
  hint: "Remembered on this device, so a phone and a laptop can differ.",
} as const;
