"use client";

import { APP_VERSION } from "@/lib/appVersion";
import { codenameForVersion } from "@/lib/releaseCodenames";

import CodenameText from "./CodenameText";

/**
 * The current release's codename, worn as a header motto. It reads as a small
 * saying; the tooltip carries the kanji and the meaning, and it changes when
 * a release ships, which is the joke.
 */
export default function ReleaseMotto() {
  const codename = codenameForVersion(APP_VERSION);
  if (!codename) {
    return null;
  }

  return <CodenameText codename={codename} layout="stacked" className="hidden shrink-0 lg:flex" />;
}
