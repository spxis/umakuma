import { japaneseTextProps } from "@/app/shared/japaneseText";
import SubjectGlyph from "@/app/shared/SubjectGlyph";
import { SOURCE_CREDITS, type SourceKey } from "@/lib/sourceCredits";
import { describeFreshness, formatCount, type SourceReport } from "@/lib/sourceReport";
import type { ShowcaseRow } from "@/lib/sourceShowcase";
import { formatDateShort } from "@/lib/timeFormat";

import MappedCountriesSection from "./MappedCountriesSection";
import { SOURCE_DESCRIPTIONS, SOURCES_COPY } from "./Sources.constants";

const LINK = "underline decoration-dotted underline-offset-2 hover:text-foreground";

function Heading({ children }: { children: string }) {
  return <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{children}</h2>;
}

/**
 * Whether a specimen is Japanese, so only the Japanese ones are declared so.
 *
 * The rows are a mix - 曜 and 犬が好きです。 sit beside Tennessee and Prince
 * Edward Island - and marking the lot `lang="ja"` would tell a screen reader
 * to read the provinces in Japanese. Kana and CJK; nothing else needs it.
 */
const JAPANESE = /[\u3040-\u30ff\u3400-\u9fff]/;

/** Longer than this and a specimen is a sentence, which reads at prose size. */
const GLYPH_SPECIMEN_MAX = 4;

/**
 * The specimen itself, at the size its own kind needs.
 *
 * A row holds anything from 龠 to a whole sentence. Drawn at prose size the
 * radical is a smudge - 17 strokes in a 14px box - and that is the one thing
 * the card exists to show; drawn at glyph size the sentence is a wall. So a
 * short Japanese run is a glyph and takes the shared row size, and everything
 * longer, or in English, is prose.
 */
function Specimen({ text }: { text: string }) {
  if (!JAPANESE.test(text)) return <span className="text-base font-black text-foreground">{text}</span>;
  if (Array.from(text).length <= GLYPH_SPECIMEN_MAX) {
    return <SubjectGlyph glyph={text} tone="text-foreground" laneClassName="shrink-0" />;
  }
  return <span {...japaneseTextProps("text-base font-black leading-relaxed text-foreground")}>{text}</span>;
}

/**
 * A handful of real rows from the source.
 *
 * It sits above the counts on purpose. "6,204 words with a frequency band" is
 * a number a reader takes on trust; 新聞 in the top 500 is the same claim with
 * its evidence attached, and it is the thing worth seeing first.
 */
function ShowcaseCard({ rows }: { rows: ShowcaseRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-3 rounded-3xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Heading>{SOURCES_COPY.aFewRows}</Heading>
        <p className="text-[11px] font-semibold text-foreground/60">{SOURCES_COPY.rowsChosen}</p>
      </div>
      <ul className="space-y-4">
        {rows.map((row) => (
          <li key={row.specimen} className="space-y-1 border-l-2 border-line pl-3">
            <p className="flex items-baseline gap-2">
              <Specimen text={row.specimen} />
            </p>
            <p className="text-sm font-semibold text-foreground/70">{row.detail}</p>
            {row.note ? (
              <p className="text-[13px] font-semibold leading-relaxed text-foreground/70">{row.note}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * One source, in full: what it is, what we take, how much we hold, when it
 * came in, and the way out to it.
 *
 * The freshness is said in words and dated beside them, because "3 months
 * ago" is the thing a reader weighs and the date is the thing they check.
 */
export default function SourceReportPanel({
  source,
  report,
  showcase,
}: {
  source: SourceKey;
  report: SourceReport;
  showcase: ShowcaseRow[];
}) {
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

      <ShowcaseCard rows={showcase} />

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
