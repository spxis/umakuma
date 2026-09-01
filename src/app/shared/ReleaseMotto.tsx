"use client";

import Link from "next/link";

import { APP_VERSION } from "@/lib/appVersion";
import { codenameForVersion } from "@/lib/releaseCodenames";
import { RELEASES_HREF } from "@/lib/releaseLink";

import CodenameText from "./CodenameText";

/**
 * The current release's codename, worn as a header motto. It reads as a small
 * saying, and it changes when a release ships, which is the joke.
 *
 * It doubles as the way into the release timeline: the motto names the running
 * release, so clicking it to see what shipped is the obvious move.
 *
 * It shrinks. It used to be `shrink-0`, which on admin - ten tabs in the row
 * beside it - meant the motto simply ran off the right edge and was cut in
 * half. A motto that will not give up space guarantees an overflow on the one
 * page with the most to fit.
 */
export default function ReleaseMotto({ className = "" }: { className?: string }) {
  const codename = codenameForVersion(APP_VERSION);
  if (!codename) {
    return null;
  }

  return (
    <Link
      href={RELEASES_HREF}
      className={`hidden min-w-0 rounded-md transition hover:opacity-70 lg:block ${className}`.trim()}
    >
      <CodenameText codename={codename} layout="stacked" />
    </Link>
  );
}
