import Link from "next/link";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";

import { authOptions } from "@/lib/auth";
import { INVITE_SESSION_COOKIE_NAME, verifyInviteSessionToken } from "@/lib/inviteSession";
import { prisma } from "@/lib/prisma";

type CardData = {
  source: "oauth" | "invite";
  nickname: string;
  wkUsername: string;
  email: string | null;
};

async function getOauthCardData(): Promise<CardData | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase() ?? null;
  if (!email) {
    return null;
  }

  const account = await prisma.account.findFirst({
    where: { joinedByEmail: email },
    select: {
      nickname: true,
      wkUsername: true,
      joinedByEmail: true,
    },
  });

  if (account?.wkUsername) {
    return {
      source: "oauth",
      nickname: account.nickname,
      wkUsername: account.wkUsername,
      email,
    };
  }

  const fallbackName = session?.user?.name?.trim() || email.split("@")[0] || "Signed in";
  return {
    source: "oauth",
    nickname: fallbackName,
    wkUsername: "",
    email,
  };
}

async function getInviteCardData(): Promise<CardData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(INVITE_SESSION_COOKIE_NAME)?.value ?? null;
  if (!token) {
    return null;
  }

  const payload = verifyInviteSessionToken(token);
  if (!payload?.accountId) {
    return null;
  }

  const account = await prisma.account.findUnique({
    where: { id: payload.accountId },
    select: {
      nickname: true,
      wkUsername: true,
      joinedByEmail: true,
      inviteCodeHash: true,
    },
  });

  if (!account?.wkUsername || !account.inviteCodeHash) {
    return null;
  }

  return {
    source: "invite",
    nickname: account.nickname,
    wkUsername: account.wkUsername,
    email: account.joinedByEmail,
  };
}

export default async function TopRightUserCard() {
  const oauthCard = await getOauthCardData();
  const inviteCard = oauthCard ? null : await getInviteCardData();
  const card = oauthCard ?? inviteCard;

  if (!card) {
    return null;
  }

  return (
    <aside className="fixed right-3 top-3 z-50 w-[min(92vw,360px)] rounded-2xl border border-line bg-surface/95 p-3 shadow-[0_18px_40px_rgba(8,16,36,0.18)] backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
        {card.source === "oauth" ? "Signed in" : "Invite session"}
      </p>
      <p className="mt-1 truncate text-sm font-black text-foreground">{card.nickname}</p>
      <p className="truncate text-xs text-foreground/70">
        {card.wkUsername ? `@${card.wkUsername}` : card.email ?? ""}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {card.wkUsername ? (
          <Link
            href={`/users/${encodeURIComponent(card.wkUsername)}`}
            className="inline-flex h-8 items-center justify-center rounded-full border border-line bg-surface px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground transition hover:bg-surface-muted"
          >
            Open profile
          </Link>
        ) : null}
        {card.source === "oauth" ? (
          <Link
            href="/signout?callbackUrl=/"
            className="inline-flex h-8 items-center justify-center rounded-full border border-line bg-surface px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground transition hover:bg-surface-muted"
          >
            Sign out
          </Link>
        ) : (
          <Link
            href="/invite"
            className="inline-flex h-8 items-center justify-center rounded-full border border-line bg-surface px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground transition hover:bg-surface-muted"
          >
            Manage invite
          </Link>
        )}
      </div>
    </aside>
  );
}
