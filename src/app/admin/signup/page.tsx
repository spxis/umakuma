import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import { ACCOUNT_APPROVAL } from "@/lib/accountApproval";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import AdminPageNav from "../AdminPageNav";
import AdminWorkspaceHeader from "../AdminWorkspaceHeader";
import PendingMembersPanel from "./PendingMembersPanel";
import { SIGNUP_ADMIN_COPY } from "./Signup.constants";
import SignupSettingsPanel from "./SignupSettingsPanel";

export const dynamic = "force-dynamic";

const CARD_CLASS = "rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5";

export default async function AdminSignupPage() {
  const session = await getServerSession(authOptions);

  if (!isAdminEmail(session?.user?.email ?? null)) {
    notFound();
  }

  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  const pending = await prisma.account.findMany({
    where: { approvalStatus: ACCOUNT_APPROVAL.pending },
    select: {
      id: true,
      slug: true,
      displayName: true,
      joinedByEmail: true,
      visibility: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="relative overflow-hidden px-2 py-1.5 sm:px-6 sm:py-4 lg:px-8">
      <div className="noise-overlay pointer-events-none absolute inset-0" />
      <main className="relative w-full space-y-3">
        <AppTopMenuRow viewerMenuInfo={viewerMenuInfo} showAdminActions={true} className="mb-2" />

        <AdminPageNav activeTab="signup" />

        <AdminWorkspaceHeader
          checkingSession={false}
          sessionAuthorized={true}
          signedIn={true}
          emailAllowed={true}
          userEmail={session?.user?.email ?? null}
          userName={session?.user?.name ?? null}
          title={SIGNUP_ADMIN_COPY.title}
          description={SIGNUP_ADMIN_COPY.subtitle}
        />

        <section className={CARD_CLASS}>
          <h2 className="mb-3 text-[11px] font-black uppercase tracking-[0.12em] text-foreground/55">
            {SIGNUP_ADMIN_COPY.pendingHeading}
            {pending.length > 0 ? ` (${pending.length})` : ""}
          </h2>
          <PendingMembersPanel
            initial={pending.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))}
          />
        </section>

        <section className={CARD_CLASS}>
          <h2 className="mb-3 text-[11px] font-black uppercase tracking-[0.12em] text-foreground/55">
            {SIGNUP_ADMIN_COPY.settingsHeading}
          </h2>
          <SignupSettingsPanel />
        </section>
      </main>
    </div>
  );
}
