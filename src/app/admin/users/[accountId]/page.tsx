import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import AdminPageNav from "@/app/admin/AdminPageNav";
import AdminWorkspaceHeader from "@/app/admin/AdminWorkspaceHeader";
import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import { authOptions, isAdminEmail } from "@/lib/auth";

import { ADMIN_USER_DETAIL_COPY } from "./AdminUserDetail.constants";
import AdminUserDetail from "./AdminUserDetail";

/* Prisma-backed through its API routes, and gated on a live session either
   way: there is nothing here to build ahead of time. */
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ accountId: string }> };

/**
 * The admin's screen for one member.
 *
 * 404 rather than a refusal notice for anybody who is not an admin, which is
 * what the other standalone admin pages do: an admin-only page that says "you
 * may not see this" has confirmed it exists.
 */
export default async function AdminUserDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!isAdminEmail(session?.user?.email ?? null)) {
    notFound();
  }

  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });
  const { accountId } = await params;

  return (
    <div className="relative px-2 py-1.5 sm:px-6 sm:py-4 lg:px-8">
      <div className="noise-overlay pointer-events-none absolute inset-0" />
      <main className="relative w-full space-y-3">
        <AppTopMenuRow
          viewerMenuInfo={viewerMenuInfo}
          showAdminActions={true}
          className="mb-2"
          subNav={<AdminPageNav activeTab="users" />}
        />

        <AdminWorkspaceHeader
          checkingSession={false}
          sessionAuthorized={true}
          signedIn={true}
          emailAllowed={true}
          userEmail={session?.user?.email ?? null}
          userName={session?.user?.name ?? null}
          title={ADMIN_USER_DETAIL_COPY.page.title}
          description={ADMIN_USER_DETAIL_COPY.page.subtitle}
        />

        <AdminUserDetail accountId={accountId} />
      </main>
    </div>
  );
}
