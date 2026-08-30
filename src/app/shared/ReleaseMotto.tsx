"use client";

import Link from "next/link";

import { APP_VERSION } from "@/lib/appVersion";
import { codenameForVersion } from "@/lib/releaseCodenames";
import { releasesHrefForViewer } from "@/lib/releaseLink";

import CodenameText from "./CodenameText";

type Props = {
  /** Admins get the motto as a link to the release timeline. */
  isAdmin?: boolean;
};

/**
 * The current release's codename, worn as a header motto. It reads as a small
 * saying, and it changes when a release ships, which is the joke.
 *
 * For an admin it doubles as the way into the release timeline: the motto names
 * the running release, so clicking it to see what shipped is the obvious move.
 */
export default function ReleaseMotto({ isAdmin = false }: Props) {
  const codename = codenameForVersion(APP_VERSION);
  if (!codename) {
    return null;
  }

  const className = "hidden shrink-0 lg:flex";
  const releasesHref = releasesHrefForViewer(isAdmin);
  if (!releasesHref) {
    return <CodenameText codename={codename} layout="stacked" className={className} />;
  }

  return (
    <Link href={releasesHref} className="hidden shrink-0 rounded-md transition hover:opacity-70 lg:block">
      <CodenameText codename={codename} layout="stacked" />
    </Link>
  );
}
