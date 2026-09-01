import { getServerSession } from "next-auth";

import StudyHistoryTable from "@/app/shared/StudyHistoryTable";
import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import AdminPageNav from "@/app/admin/AdminPageNav";
import { authOptions } from "@/lib/auth";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";

type PageProps = {
  params: Promise<{ accountId: string }>;
};

export default async function AdminUserHistoryPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
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


        <StudyHistoryTable
          endpoint={`/api/admin/study-history?accountId=${encodeURIComponent(accountId)}`}
          showUserColumn={true}
          heading="User Study Submission History"
        />
      </main>
    </div>
  );
}
