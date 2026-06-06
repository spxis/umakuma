import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { INVITE_SESSION_COOKIE_NAME, verifyInviteSessionToken } from "@/lib/inviteSession";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Read · UmaKuma",
  description: "Read Japanese news articles from your user dashboard.",
};

export default async function NewsPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase() ?? null;
  const linkedAccount = email
    ? await prisma.account.findFirst({
        where: { joinedByEmail: email },
        select: { wkUsername: true },
      })
    : null;

  if (linkedAccount?.wkUsername) {
    redirect(`/users/${encodeURIComponent(linkedAccount.wkUsername)}/news?read=news`);
  }

  const cookieStore = await cookies();
  const inviteToken = cookieStore.get(INVITE_SESSION_COOKIE_NAME)?.value ?? null;
  const invitePayload = inviteToken ? verifyInviteSessionToken(inviteToken) : null;

  if (invitePayload?.accountId) {
    const inviteAccount = await prisma.account.findUnique({
      where: { id: invitePayload.accountId },
      select: { wkUsername: true, inviteCodeHash: true },
    });

    if (inviteAccount?.wkUsername && inviteAccount.inviteCodeHash) {
      redirect(`/users/${encodeURIComponent(inviteAccount.wkUsername)}/news?read=news`);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
      <h1 className="text-xl font-black text-foreground sm:text-2xl">News moved to user dashboards</h1>
      <p className="mt-3 text-sm text-foreground/75 sm:text-base">
        Open your user page to read news and track progress.
      </p>
      <div className="mt-6">
        <Link
          href="/join"
          className="inline-flex items-center justify-center rounded-full border border-line bg-surface px-5 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted"
        >
          Go to join
        </Link>
      </div>
    </main>
  );
}
