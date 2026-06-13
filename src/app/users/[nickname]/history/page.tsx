import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Image from "next/image";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import { authOptions, isAdminEmail } from "@/lib/auth";
import userBanner from "@/images/umakuma-banner1-transparent.png";
import { prisma } from "@/lib/prisma";
import { canViewUserPage, resolveViewerMenuInfo } from "../userPageAuth";
import HistoryScopedStudyHistoryTable from "./HistoryScopedStudyHistoryTable";

type PageProps = {
  params: Promise<{ nickname: string }>;
};

export default async function UserHistoryPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  const { nickname } = await params;
  const userKey = decodeURIComponent(nickname);

  const account = await prisma.account.findFirst({
    where: { wkUsername: userKey },
    select: {
      id: true,
      nickname: true,
      wkUsername: true,
      lastSyncedAt: true,
      lastActivityAt: true,
    },
  });

  if (!account) {
    notFound();
  }

  const canViewThisPage = canViewUserPage({
    viewerEmail,
    viewerMenuInfo,
    targetWkUsername: account.wkUsername,
  });
  if (!canViewThisPage) {
    redirect("/join?access=denied");
  }

  return (
    <div className="px-2 py-1.5 sm:px-6 sm:py-4 lg:px-8">
      <AppTopMenuRow
        viewerMenuInfo={viewerMenuInfo}
        primaryWkUsername={account.wkUsername}
        accountId={account.id}
        showAdminActions={isAdminEmail(viewerEmail)}
        lastSyncedAt={account.lastSyncedAt.toISOString()}
        lastActivityAt={account.lastActivityAt ? account.lastActivityAt.toISOString() : null}
        className="mb-2"
      />
      <main className="space-y-3">
        <section className="rounded-2xl border border-line bg-surface/90 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-white sm:h-14 sm:w-24">
              <Image
                src={userBanner}
                alt=""
                fill
                className="h-full w-full"
                style={{ objectFit: "contain", objectPosition: "center" }}
                sizes="96px"
              />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground">History</h1>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">
                Study attempt history for {account.nickname}.
              </p>
            </div>
          </div>
        </section>
        <HistoryScopedStudyHistoryTable accountId={account.id} />
      </main>
    </div>
  );
}
