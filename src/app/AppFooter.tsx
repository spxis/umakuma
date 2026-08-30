"use client";

import { APP_VERSION, APP_VERSION_DATE } from "@/lib/appVersion";
import { codenameForVersion } from "@/lib/releaseCodenames";

// Formatted locally rather than with the timeline's helper: importing
// featureTimeline here would ship the whole timeline JSON - the unreleased
// roadmap included - in the public client bundle.
const RELEASE_DATE_LABEL = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(`${APP_VERSION_DATE}T00:00:00Z`));

const CODENAME = codenameForVersion(APP_VERSION);

export default function AppFooter() {
  return (
    <footer className="relative z-20 mt-8 border-t border-line/70 bg-surface/70 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-foreground/85">UmaKuma. Built for steady daily progress.</p>
        <p className="text-xs font-semibold tabular-nums text-foreground/40">
          v{APP_VERSION}
          {CODENAME ? (
            <>
              {" · "}
              <span lang="ja">{CODENAME.ja}</span>
              {" · "}
              {CODENAME.gloss}
            </>
          ) : null}
          {" · "}
          {RELEASE_DATE_LABEL}
        </p>
      </div>
    </footer>
  );
}
