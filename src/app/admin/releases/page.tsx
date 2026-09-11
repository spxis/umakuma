import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import CodenameText from "@/app/shared/CodenameText";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import { APP_VERSION, APP_VERSION_RELEASE } from "@/lib/appVersion";
import { authOptions, isAdminEmail } from "@/lib/auth";
import AdminPageNav from "../AdminPageNav";
import AdminWorkspaceHeader from "../AdminWorkspaceHeader";
import { FEATURE_STATUSES, featuresByStatus, loadFeatureTimeline, sortFeaturesNewestFirst } from "@/lib/featureTimeline";
import { codenameForRelease } from "@/lib/releaseCodenames";
import { heldNow } from "@/lib/ticketClaims";
import { isWaitingTicket } from "@/lib/tickets";
import { listTickets } from "@/lib/ticketsServer";

import {
  RELEASE_TAB_COOKIE_KEY,
  RELEASE_TAB_VALUES,
  RELEASE_TABS,
  RELEASE_TIMELINE_COPY,
  type ReleaseTab,
} from "./ReleaseTimeline.constants";
import ReleaseTimelineTabs from "./ReleaseTimelineTabs";

export const dynamic = "force-dynamic";

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
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
  /* An unknown value - the old six-tab page's cookies included - opens the board. */
  const initialTab: ReleaseTab = RELEASE_TAB_VALUES.includes(storedTab as ReleaseTab)
    ? (storedTab as ReleaseTab)
    : RELEASE_TABS.tickets;

  /* The file holds what shipped; the board holds everything else. */
  const shipped = sortFeaturesNewestFirst(featuresByStatus(loadFeatureTimeline(), FEATURE_STATUSES.shipped));
  const tickets = await listTickets();

  /*
   * The queue is the board, so the counters read the board. Waiting is what
   * has been asked for and not started; in progress is what somebody holds
   * inside the lease, the same answer `pnpm task` gives - a session that died
   * holding a ticket left it In progress here for ever while the CLI printed
   * STALE beside the same row.
   */
  const waiting = tickets.filter((ticket) => isWaitingTicket(ticket.status)).length;
  const held = tickets.filter((ticket) => heldNow(ticket)).length;
  const codename = codenameForRelease(APP_VERSION_RELEASE);

  return (
    <div className="relative px-2 py-1.5 sm:px-6 sm:py-4 lg:px-8">
      <div className="noise-overlay pointer-events-none absolute inset-0" />
      <main className="relative w-full space-y-3">
        <AppTopMenuRow viewerMenuInfo={viewerMenuInfo} showAdminActions={true} className="mb-2" subNav={<AdminPageNav activeTab="releases" />} />

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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat value={waiting} label={RELEASE_TIMELINE_COPY.waitingLabel} />
            <Stat value={held} label={RELEASE_TIMELINE_COPY.inProgressLabel} />
            <Stat value={shipped.length} label={RELEASE_TIMELINE_COPY.shippedLabel} />
            <Stat
              value={
                <span className="flex flex-wrap items-baseline gap-2">
                  <span>{APP_VERSION}</span>
                  {codename ? <CodenameText codename={codename} className="text-xs font-semibold text-foreground/60" /> : null}
                </span>
              }
              label={RELEASE_TIMELINE_COPY.versionLabel}
            />
          </div>

          <ReleaseTimelineTabs shipped={shipped} tickets={tickets} initialTab={initialTab} />
        </section>
      </main>
    </div>
  );
}
