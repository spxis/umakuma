"use client";

import { APP_VERSION, APP_VERSION_DATE } from "@/lib/appVersion";
import { codenameForVersion } from "@/lib/releaseCodenames";
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

const CODENAME = codenameForVersion(APP_VERSION);

type Props = {
  /** Concise mode chips (DEV, ADV) for globally enabled flags; empty when none. */
  modeChips?: string[];
};

export default function AppFooter({ modeChips = [] }: Props) {
  return (
    <footer className="relative z-20 mt-8 border-t border-line/70 bg-surface/70 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-foreground/85">UmaKuma. Built for steady daily progress.</p>
        <p className="flex flex-wrap items-center gap-2 text-xs font-semibold tabular-nums text-foreground/40">
          {modeChips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black tracking-wide text-amber-600"
            >
              {chip}
            </span>
          ))}
          <span>
          v{APP_VERSION}
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
