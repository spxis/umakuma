"use client";

import { APP_VERSION } from "@/lib/appVersion";
import { codenameForVersion } from "@/lib/releaseCodenames";

/**
 * The current release's codename, worn as a header motto.
 *
 * It reads as a small saying — 「そよ風素麺」 — and only the tooltip admits
 * it is the version name. It changes when a release ships, which is the joke.
 */
export default function ReleaseMotto() {
  const codename = codenameForVersion(APP_VERSION);
  if (!codename) {
    return null;
  }

  return (
    <span
      lang="ja"
      title={`v${APP_VERSION} “${codename.romaji}” — ${codename.gloss}`}
      className="hidden shrink-0 select-none text-xs font-semibold tracking-widest text-foreground/35 lg:inline"
    >
      「{codename.ja}」
    </span>
  );
}
