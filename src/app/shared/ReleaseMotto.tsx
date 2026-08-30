"use client";

import { APP_VERSION } from "@/lib/appVersion";
import { codenameForVersion } from "@/lib/releaseCodenames";

/**
 * The current release's codename, worn as a header motto.
 *
 * The kana reading shows so learners can read it; hovering reveals the kanji
 * writing, the version and the meaning. The romaji sits underneath as the
 * codename's Latin form. It reads as a small saying — only the tooltip admits
 * it is the version, and it changes when a release ships, which is the joke.
 */
export default function ReleaseMotto() {
  const codename = codenameForVersion(APP_VERSION);
  if (!codename) {
    return null;
  }

  return (
    <span
      title={`${codename.ja} — v${APP_VERSION} “${codename.romaji}”: ${codename.gloss}`}
      className="hidden shrink-0 select-none flex-col items-end lg:flex"
    >
      <span lang="ja" className="text-xs font-semibold tracking-widest text-foreground/35">
        「{codename.reading}」
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/25">
        {codename.romaji}
      </span>
    </span>
  );
}
