import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import { authOptions, isAdminEmail } from "@/lib/auth";
import AdminPageNav from "../AdminPageNav";
import {
  FEATURE_STATUSES,
  featuresByStatus,
  loadFeatureTimeline,
  sortFeaturesByRelease,
  sortFeaturesNewestFirst,
  summarizeFeatureTimeline,
} from "@/lib/featureTimeline";

import { RELEASE_TIMELINE_COPY } from "./ReleaseTimeline.constants";
import ReleaseTimelineTabs from "./ReleaseTimelineTabs";

export const dynamic = "force-dynamic";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3">
      <div className="text-2xl font-black text-foreground">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wide text-foreground/50">{label}</div>
    </div>
  );
}

export default async function AdminReleasesPage() {
  const session = await getServerSession(authOptions);

  // Not a redirect or a message: an unauthorized visitor should not learn that
  // this page exists at all.
  if (!isAdminEmail(session?.user?.email ?? null)) {
    notFound();
  }

  const entries = loadFeatureTimeline();
  const totals = summarizeFeatureTimeline(entries);
  const shipped = sortFeaturesNewestFirst(featuresByStatus(entries, FEATURE_STATUSES.shipped));
  const planned = sortFeaturesByRelease(featuresByStatus(entries, FEATURE_STATUSES.planned));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <AdminPageNav activeTab="releases" />

      <h1 className="text-2xl font-black text-foreground sm:text-3xl">
        {RELEASE_TIMELINE_COPY.title}
      </h1>
      <p className="mt-2 text-sm text-foreground/70">{RELEASE_TIMELINE_COPY.subtitle}</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat value={totals.total} label={RELEASE_TIMELINE_COPY.totalsLabel} />
        <Stat value={totals.shipped} label={RELEASE_TIMELINE_COPY.shippedLabel} />
        <Stat value={totals.planned} label={RELEASE_TIMELINE_COPY.plannedLabel} />
      </div>

      <ReleaseTimelineTabs planned={planned} shipped={shipped} />

    </main>
  );
}
