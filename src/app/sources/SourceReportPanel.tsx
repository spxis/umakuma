import { SOURCE_CREDITS, type SourceKey } from "@/lib/sourceCredits";
import { describeFreshness, formatCount, type SourceReport } from "@/lib/sourceReport";
import { formatDateShort } from "@/lib/timeFormat";

import MappedCountriesSection from "./MappedCountriesSection";
import { SOURCE_DESCRIPTIONS, SOURCES_COPY } from "./Sources.constants";

const LINK = "underline decoration-dotted underline-offset-2 hover:text-foreground";

function Heading({ children }: { children: string }) {
  return <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{children}</h2>;
}

/**
 * One source, in full: what it is, what we take, how much we hold, when it
 * came in, and the way out to it.
 *
 * The freshness is said in words and dated beside them, because "3 months
 * ago" is the thing a reader weighs and the date is the thing they check.
 */
export default function SourceReportPanel({ source, report }: { source: SourceKey; report: SourceReport }) {
  const credit = SOURCE_CREDITS[source];
  const description = SOURCE_DESCRIPTIONS[source];

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-black text-foreground">{credit.source}</h1>
          <a
            href={credit.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-8 items-center rounded-full border border-line bg-surface px-3 text-[11px] font-black uppercase tracking-[0.08em] text-foreground/70 transition hover:bg-surface-muted hover:text-foreground"
          >
            {SOURCES_COPY.visit} ↗
          </a>
        </div>
        <p className="text-sm font-semibold leading-relaxed text-foreground/80">{description.lede}</p>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-3 rounded-3xl border border-line bg-surface p-5">
          <Heading>{SOURCES_COPY.whatWeHold}</Heading>
          <dl className="space-y-2">
            {report.counts.map((count) => (
              <div key={count.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-sm font-semibold text-foreground/70">{count.label}</dt>
                <dd className="font-mono text-base font-black tabular-nums text-foreground">{formatCount(count.value)}</dd>
              </div>
            ))}
          </dl>
          <dl className="space-y-2 border-t border-line pt-3">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-sm font-semibold text-foreground/70">{SOURCES_COPY.lastImported}</dt>
              <dd className="text-right text-sm font-black text-foreground">
                {describeFreshness(report.lastImportedAt, report.generatedAtMs)}
                {report.lastImportedAt ? (
                  <span className="block font-mono text-[11px] font-semibold text-foreground/60">
                    {formatDateShort(report.lastImportedAt)}
                  </span>
                ) : null}
              </dd>
            </div>
            {report.version ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-sm font-semibold text-foreground/70">{SOURCES_COPY.upstreamVersion}</dt>
                <dd className="font-mono text-sm font-black text-foreground">{report.version}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="space-y-3 rounded-3xl border border-line bg-surface p-5">
          <Heading>{SOURCES_COPY.whatWeTake}</Heading>
          <ul className="list-disc space-y-1 pl-5 text-sm font-semibold text-foreground/80">
            {description.takes.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-line pt-3">
            <Heading>{SOURCES_COPY.terms}</Heading>
            <p className="text-sm font-semibold leading-relaxed text-foreground/80">
              {description.terms}
              {credit.licence ? (
                <>
                  {" "}
                  <a href={credit.licenceUrl} target="_blank" rel="noreferrer noopener" className={LINK}>
                    {credit.licence}
                  </a>
                </>
              ) : null}
            </p>
          </div>
        </div>
      </section>

      <MappedCountriesSection source={source} />
    </div>
  );
}
