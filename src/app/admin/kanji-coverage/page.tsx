import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import { authOptions, isAdminEmail } from "@/lib/auth";
import {
  KANJI_GRADE_BAND_LABELS,
  KANJI_GRADE_BAND_VALUES,
  KANJI_SOURCES,
  missingFromWanikani,
  summarizeKanjiCoverage,
} from "@/lib/kanjiCoverage";
import { loadKanjiCoverage } from "@/lib/kanjiCoverageServer";

import { KANJI_COVERAGE_COPY } from "./KanjiCoverage.constants";
import KanjiGapTable from "./KanjiGapTable";

export const dynamic = "force-dynamic";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3">
      <div className="text-2xl font-black text-foreground tabular-nums">
        {value.toLocaleString("en-CA")}
      </div>
      <div className="text-xs font-semibold uppercase tracking-wide text-foreground/50">{label}</div>
    </div>
  );
}

export default async function AdminKanjiCoveragePage() {
  const session = await getServerSession(authOptions);

  if (!isAdminEmail(session?.user?.email ?? null)) {
    notFound();
  }

  const entries = await loadKanjiCoverage();
  const totals = summarizeKanjiCoverage(entries);
  const gap = missingFromWanikani(entries);
  const wanikaniOnly = entries
    .filter((entry) => entry.source === KANJI_SOURCES.wanikaniOnly)
    .sort((left, right) => (left.wkLevel ?? 0) - (right.wkLevel ?? 0));

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-black text-foreground sm:text-3xl">
        {KANJI_COVERAGE_COPY.title}
      </h1>
      <p className="mt-2 text-sm text-foreground/70">{KANJI_COVERAGE_COPY.subtitle}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={totals.total} label={KANJI_COVERAGE_COPY.totalLabel} />
        <Stat value={totals.bySource.both} label={KANJI_COVERAGE_COPY.bothLabel} />
        <Stat value={totals.bySource.jlptOnly} label={KANJI_COVERAGE_COPY.gapLabel} />
        <Stat value={totals.bySource.wanikaniOnly} label={KANJI_COVERAGE_COPY.reverseLabel} />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-black text-foreground">{KANJI_COVERAGE_COPY.bandHeading}</h2>
        <p className="mb-4 mt-1 text-xs text-foreground/60">
          {KANJI_COVERAGE_COPY.bandExplainer}
        </p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {KANJI_GRADE_BAND_VALUES.map((band) => (
            <li key={band}>
              <Stat
                value={totals.missingFromWanikaniByBand[band]}
                label={KANJI_GRADE_BAND_LABELS[band]}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-black text-foreground">{KANJI_COVERAGE_COPY.gapHeading}</h2>
        <p className="mb-4 mt-1 text-xs text-foreground/60">{KANJI_COVERAGE_COPY.gapNote}</p>
        <KanjiGapTable entries={gap} />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-black text-foreground">
          {KANJI_COVERAGE_COPY.reverseHeading}
        </h2>
        <div className="mt-4">
          <KanjiGapTable entries={wanikaniOnly} showBand={false} />
        </div>
      </section>
    </main>
  );
}
