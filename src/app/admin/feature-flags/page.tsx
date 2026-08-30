import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import { authOptions, isAdminEmail } from "@/lib/auth";
import AdminPageNav from "../AdminPageNav";
import AdminWorkspaceHeader from "../AdminWorkspaceHeader";

import { FEATURE_FLAGS_COPY } from "./FeatureFlags.constants";
import FeatureFlagsPanel from "./FeatureFlagsPanel";

export const dynamic = "force-dynamic";

export default async function AdminFeatureFlagsPage() {
  const session = await getServerSession(authOptions);

  if (!isAdminEmail(session?.user?.email ?? null)) {
    notFound();
  }

  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  return (
    <div className="relative overflow-hidden px-2 py-1.5 sm:px-6 sm:py-4 lg:px-8">
      <div className="noise-overlay pointer-events-none absolute inset-0" />
      <main className="relative w-full space-y-3">
        <AppTopMenuRow
          viewerMenuInfo={viewerMenuInfo}
          showAdminActions={true}
          className="mb-2"
        />

        <AdminPageNav activeTab="featureFlags" />

        <AdminWorkspaceHeader
          checkingSession={false}
          sessionAuthorized={true}
          signedIn={true}
          emailAllowed={true}
          userEmail={session?.user?.email ?? null}
          userName={session?.user?.name ?? null}
          title={FEATURE_FLAGS_COPY.title}
          description={FEATURE_FLAGS_COPY.subtitle}
        />

        <FeatureFlagsPanel />
      </main>
    </div>
  );
}
