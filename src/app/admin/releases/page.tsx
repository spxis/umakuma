import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import { authOptions, isAdminEmail } from "@/lib/auth";
import AdminPageNav from "../AdminPageNav";
import AdminWorkspaceHeader from "../AdminWorkspaceHeader";
import {
  FEATURE_STATUSES,
  featuresByStatus,
  loadFeatureTimeline,
  sortFeaturesByRelease,
  sortFeaturesNewestFirst,
  summarizeFeatureTimeline,
} from "@/lib/featureTimeline";

import {
  RELEASE_TAB_COOKIE_KEY,
  RELEASE_TAB_VALUES,
  RELEASE_TABS,
  RELEASE_TIMELINE_COPY,
  type ReleaseTab,
} from "./ReleaseTimeline.constants";
import ReleaseTimelineTabs from "./ReleaseTimelineTabs";

export const dynamic = "force-dynamic";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3">
      <div className="text-2xl font-black text-foreground">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wide text-foreground/60">{label}</div>
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

  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  const cookieStore = await cookies();
  const storedTab = cookieStore.get(RELEASE_TAB_COOKIE_KEY)?.value;
  const initialTab: ReleaseTab = RELEASE_TAB_VALUES.includes(storedTab as ReleaseTab)
    ? (storedTab as ReleaseTab)
    : RELEASE_TABS.planned;

  const entries = loadFeatureTimeline();
  const totals = summarizeFeatureTimeline(entries);
  const shipped = sortFeaturesNewestFirst(featuresByStatus(entries, FEATURE_STATUSES.shipped));
  const planned = sortFeaturesByRelease(featuresByStatus(entries, FEATURE_STATUSES.planned));
  const shelved = [
    ...featuresByStatus(entries, FEATURE_STATUSES.backlogged),
    ...featuresByStatus(entries, FEATURE_STATUSES.killed),
  ];

  return (
    <div className="relative px-2 py-1.5 sm:px-6 sm:py-4 lg:px-8">
      <div className="noise-overlay pointer-events-none absolute inset-0" />
      <main className="relative w-full space-y-3">
        <AppTopMenuRow
          viewerMenuInfo={viewerMenuInfo}
          showAdminActions={true}
          className="mb-2"
          subNav={<AdminPageNav activeTab="releases" />}
        />

        <AdminWorkspaceHeader
          checkingSession={false}
          sessionAuthorized={true}
          signedIn={true}
          emailAllowed={true}
          userEmail={session?.user?.email ?? null}
          userName={session?.user?.name ?? null}
          title={RELEASE_TIMELINE_COPY.title}
          description={RELEASE_TIMELINE_COPY.subtitle}
        />

        <section>
          <div className="grid grid-cols-3 gap-3">
            <Stat value={totals.total} label={RELEASE_TIMELINE_COPY.totalsLabel} />
            <Stat value={totals.shipped} label={RELEASE_TIMELINE_COPY.shippedLabel} />
            <Stat value={totals.planned} label={RELEASE_TIMELINE_COPY.plannedLabel} />
          </div>

          <ReleaseTimelineTabs planned={planned} shipped={shipped} shelved={shelved} initialTab={initialTab} />
        </section>
      </main>
    </div>
  );
}
