"use client";

import Link from "next/link";

import { APP_VERSION, APP_VERSION_DATE, APP_VERSION_RELEASE } from "@/lib/appVersion";
import { codenameForRelease } from "@/lib/releaseCodenames";
import { RELEASES_HREF } from "@/lib/releaseLink";
import { SOURCES_HREF } from "@/lib/sourceCredits";
import CodenameText from "./shared/CodenameText";

// Formatted locally rather than with the timeline's helper: importing
// featureTimeline here would ship the whole timeline JSON - the unreleased
// roadmap included - in the public client bundle.
const RELEASE_DATE_LABEL = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(`${APP_VERSION_DATE}T00:00:00Z`));

const CODENAME = codenameForRelease(APP_VERSION_RELEASE);

type Props = {
  /** Concise mode chips (DEV, ADV) for globally enabled flags; empty when none. */
  modeChips?: string[];
};

export default function AppFooter({ modeChips = [] }: Props) {
  const releasesHref = RELEASES_HREF;

  return (
    <footer className="relative z-20 mt-8 border-t border-line/70 bg-surface/70 backdrop-blur-sm" data-print="hide">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-foreground/85">UmaKuma. Built for steady daily progress.</p>
        <p className="flex flex-wrap items-center gap-2 text-xs font-semibold tabular-nums text-foreground/60">
          {modeChips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black tracking-wide text-amber-600"
            >
              {chip}
            </span>
          ))}
          <Link href={SOURCES_HREF} className="underline decoration-dotted underline-offset-2 transition hover:text-foreground/70">
            Sources
          </Link>
          <span>
          {releasesHref ? (
            <Link href={releasesHref} className="underline decoration-dotted underline-offset-2 transition hover:text-foreground/70">
              v{APP_VERSION}
            </Link>
          ) : (
            <>v{APP_VERSION}</>
          )}
          {CODENAME ? (
            <>
              {" · "}
              <CodenameText codename={CODENAME} />
            </>
          ) : null}
          {" · "}
          {RELEASE_DATE_LABEL}
          </span>
        </p>
      </div>
    </footer>
  );
}
