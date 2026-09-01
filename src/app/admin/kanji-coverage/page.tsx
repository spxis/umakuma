import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import { authOptions, isAdminEmail } from "@/lib/auth";
import AdminPageNav from "../AdminPageNav";
import AdminWorkspaceHeader from "../AdminWorkspaceHeader";
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
      <div className="text-xs font-semibold uppercase tracking-wide text-foreground/60">{label}</div>
    </div>
  );
}

export default async function AdminKanjiCoveragePage() {
  const session = await getServerSession(authOptions);

  if (!isAdminEmail(session?.user?.email ?? null)) {
    notFound();
  }

  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  const entries = await loadKanjiCoverage();
  const totals = summarizeKanjiCoverage(entries);
  const gap = missingFromWanikani(entries);
  const wanikaniOnly = entries
    .filter((entry) => entry.source === KANJI_SOURCES.wanikaniOnly)
    .sort((left, right) => (left.wkLevel ?? 0) - (right.wkLevel ?? 0));

  return (
    <div className="relative px-2 py-1.5 sm:px-6 sm:py-4 lg:px-8">
      <div className="noise-overlay pointer-events-none absolute inset-0" />
      <main className="relative w-full space-y-3">
        <AppTopMenuRow
          viewerMenuInfo={viewerMenuInfo}
          showAdminActions={true}
          className="mb-2"
          subNav={<AdminPageNav activeTab="kanjiCoverage" />}
        />

        <AdminWorkspaceHeader
          checkingSession={false}
          sessionAuthorized={true}
          signedIn={true}
          emailAllowed={true}
          userEmail={session?.user?.email ?? null}
          userName={session?.user?.name ?? null}
          title={KANJI_COVERAGE_COPY.title}
          description={KANJI_COVERAGE_COPY.subtitle}
        />

        <section>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
        </section>
      </main>
    </div>
  );
}
