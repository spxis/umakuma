import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import CodenameText from "@/app/shared/CodenameText";
import umakumaLogo from "@/images/umakuma-banner1-transparent.png";
import { loadFeatureTimeline, publicReleaseEntries, publicSummaryFor } from "@/lib/featureTimeline";
import { codenameForVersion } from "@/lib/releaseCodenames";

import { RELEASES_PAGE_COPY } from "./releasesCopy";
import { groupReleasesByMonth, releaseAnchor } from "./releasesView";

export const metadata: Metadata = {
  title: "UmaKuma Updates",
  description: "What shipped in UmaKuma, newest first.",
};

export default function PublicReleasesPage() {
  const releases = publicReleaseEntries(loadFeatureTimeline());
  const months = groupReleasesByMonth(releases);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center gap-4">
        <Link href="/" className="shrink-0">
          <Image src={umakumaLogo} alt="UmaKuma" width={56} height={56} className="h-14 w-14 object-contain" priority />
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-foreground">{RELEASES_PAGE_COPY.heading}</h1>
          <p className="text-xs uppercase tracking-[0.08em] text-foreground/60">{RELEASES_PAGE_COPY.subtitle}</p>
        </div>
      </header>

      <p className="mb-6 rounded-2xl border border-line bg-surface-muted px-4 py-3 text-sm font-semibold text-foreground/70">
        {RELEASES_PAGE_COPY.intro}
      </p>

      {months.map((month) => (
        <section key={month.key} className="mb-6">
          <h2 className="mb-2 flex items-baseline justify-between gap-3 border-b border-line pb-1 text-[11px] font-black uppercase tracking-[0.14em] text-foreground/55">
            <span>{month.label}</span>
            <span className="font-bold tracking-normal text-foreground/40">
              {month.entries.length} {month.entries.length === 1 ? RELEASES_PAGE_COPY.release : RELEASES_PAGE_COPY.releases}
            </span>
          </h2>

          <ul className="space-y-2">
            {month.entries.map((entry) => {
              const codename = entry.version ? codenameForVersion(entry.version) : null;
              return (
                <li key={entry.id} id={releaseAnchor(entry)}>
                  <details className="group rounded-2xl border border-line bg-surface px-4 py-3 transition open:bg-surface-muted/40">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                      {entry.version ? (
                        <span className="subject-pill border-line bg-surface-muted font-black tabular-nums text-foreground">
                          v{entry.version}
                        </span>
                      ) : null}
                      <span className="min-w-0 flex-1 truncate text-sm font-black text-foreground">{entry.name}</span>
                      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">
                        {entry.date}
                      </span>
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-foreground/35 transition group-open:rotate-90"
                      >
                        ›
                      </span>
                    </summary>

                    <div className="mt-3 border-t border-line/70 pt-3">
                      <p className="text-sm font-semibold text-foreground/80">{publicSummaryFor(entry)}</p>

                      {entry.details ? (
                        <p className="mt-2 text-sm text-foreground/70">{entry.details}</p>
                      ) : null}

                      <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">
                        <div className="flex items-center gap-1.5">
                          <dt>{RELEASES_PAGE_COPY.area}</dt>
                          <dd className="text-foreground/70">{entry.area}</dd>
                        </div>
                        {codename ? (
                          <div className="flex min-w-0 items-center gap-1.5">
                            <dt>{RELEASES_PAGE_COPY.codename}</dt>
                            <dd className="min-w-0 truncate normal-case tracking-normal text-foreground/70">
                              <CodenameText codename={codename} />
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="mt-8 text-center text-xs font-semibold text-foreground/40">
        <Link href="/" className="underline decoration-dotted underline-offset-2 hover:text-foreground/60">
          {RELEASES_PAGE_COPY.backHome}
        </Link>
      </p>
    </div>
  );
}
