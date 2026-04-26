"use client";

import {
  bumpTextSize,
  textSizeLabel,
  type NewsReadingPrefs,
  type NewsTextSize,
} from "./newsReadingPrefs";

type Props = {
  prefs: NewsReadingPrefs;
  onChange: (next: NewsReadingPrefs) => void;
};

export default function NewsReadingControls({ prefs, onChange }: Props) {
  function setSize(size: NewsTextSize) {
    onChange({ ...prefs, textSize: size });
  }

  function toggleKanji() {
    onChange({ ...prefs, emphasizeKanji: !prefs.emphasizeKanji });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/80 bg-surface-muted px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/60">
          Text size
        </span>
        <div className="inline-flex items-center overflow-hidden rounded-full border border-line bg-surface">
          <button
            type="button"
            onClick={() => setSize(bumpTextSize(prefs.textSize, -1))}
            className="px-3 py-1 text-sm font-bold text-foreground/80 hover:bg-surface-muted"
            aria-label="Decrease text size"
          >
            A−
          </button>
          <span className="border-x border-line px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/70">
            {textSizeLabel(prefs.textSize)}
          </span>
          <button
            type="button"
            onClick={() => setSize(bumpTextSize(prefs.textSize, 1))}
            className="px-3 py-1 text-sm font-bold text-foreground/80 hover:bg-surface-muted"
            aria-label="Increase text size"
          >
            A+
          </button>
        </div>
      </div>

      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/75">
        <input
          type="checkbox"
          checked={prefs.emphasizeKanji}
          onChange={toggleKanji}
          className="h-4 w-4 accent-accent"
        />
        Enlarge kanji
      </label>
    </div>
  );
}
