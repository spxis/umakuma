import Link from "next/link";
import { getServerSession } from "next-auth";

import StudyHistoryTable from "@/app/shared/StudyHistoryTable";
import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
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
    <div className="relative overflow-hidden px-2 py-1.5 sm:px-6 sm:py-4 lg:px-8">
      <main className="relative mx-auto w-full max-w-6xl space-y-3">
        <AppTopMenuRow
          viewerMenuInfo={viewerMenuInfo}
          showAdminActions={true}
          className="mb-2"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin" className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-surface px-4 text-xs font-bold uppercase tracking-[0.12em] text-foreground">
            Back to admin
          </Link>
        </div>

        <StudyHistoryTable
          endpoint={`/api/admin/study-history?accountId=${encodeURIComponent(accountId)}`}
          showUserColumn={true}
          heading="User Study Submission History"
        />
      </main>
    </div>
  );
}
