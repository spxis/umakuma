import Link from "next/link";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import GoogleSignInButton from "./GoogleSignInButton";
import InviteCodeAccessPanel, { type InviteSessionStatus } from "./InviteCodeAccessPanel";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { INVITE_SESSION_COOKIE_NAME, verifyInviteSessionToken } from "@/lib/inviteSession";
import { prisma } from "@/lib/prisma";

type AuthTab = "invite" | "google";

type Props = {
  activeTab: AuthTab;
  accessDenied?: boolean;
  allowGoogleRouteRedirects?: boolean;
  googleCallbackPath?: string;
};

const TAB_BASE_CLASS =
  "inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-black uppercase tracking-[0.12em] transition";
const TAB_ACTIVE_CLASS = "border border-line bg-surface text-foreground";
const TAB_INACTIVE_CLASS = "text-foreground/70 hover:bg-surface";
const PRIMARY_BUTTON_CLASS =
  "inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-accent-2";
const SECONDARY_BUTTON_CLASS =
  "inline-flex h-11 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-black uppercase tracking-[0.12em] text-slate-800 transition hover:bg-surface-muted";

export default async function AuthAccessScreen({
  activeTab,
  accessDenied = false,
  allowGoogleRouteRedirects = true,
  googleCallbackPath = "/",
}: Props) {
  const session = await getServerSession(authOptions);
  const googleEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const isGoogleSignedIn = Boolean(googleEmail);
  const viewerIsAdmin = isAdminEmail(googleEmail);
  const googleLinkedAccount = googleEmail
    ? await prisma.account.findFirst({
        where: { joinedByEmail: googleEmail },
        select: {
          wkUsername: true,
        },
      })
    : null;

  const cookieStore = await cookies();
  const inviteToken = cookieStore.get(INVITE_SESSION_COOKIE_NAME)?.value ?? null;
  const invitePayload = inviteToken ? verifyInviteSessionToken(inviteToken) : null;
  const inviteLinkedAccount = invitePayload?.accountId
    ? await prisma.account.findUnique({
        where: { id: invitePayload.accountId },
        select: { id: true, nickname: true, wkUsername: true, inviteCodeHash: true },
      })
    : null;

  const inviteSession: InviteSessionStatus =
    inviteLinkedAccount?.inviteCodeHash
      ? {
          signedIn: true,
          account: {
            id: inviteLinkedAccount.id,
            nickname: inviteLinkedAccount.nickname,
            wkUsername: inviteLinkedAccount.wkUsername,
          },
        }
      : { signedIn: false };

  if (activeTab === "google" && allowGoogleRouteRedirects) {
    const redirectUsername =
      googleLinkedAccount?.wkUsername ??
      (inviteLinkedAccount?.inviteCodeHash ? inviteLinkedAccount.wkUsername : null);
    if (redirectUsername) {
      redirect(`/users/${encodeURIComponent(redirectUsername)}?tab=study`);
    }

    if (isGoogleSignedIn && !googleLinkedAccount?.wkUsername && !viewerIsAdmin) {
      redirect("/join");
    }
  }

  const showTabs = true;
  const signedInGoogleName = session?.user?.name?.trim() ?? "";
  const signedInGoogleEmail = session?.user?.email?.trim() ?? "";
  const signedInGoogleLabel = [signedInGoogleName, signedInGoogleEmail]
    .filter((value) => value.length > 0)
    .join(" · ") || "Google account";
  const signOutHref = `/signout?callbackUrl=${encodeURIComponent(googleCallbackPath)}`;

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="noise-overlay pointer-events-none absolute inset-0" />
      <main className="relative mx-auto w-full max-w-2xl space-y-5">
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-line bg-surface px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-surface-muted"
        >
          Back to leaderboard
        </Link>

        <section className="animate-enter rounded-4xl border border-line bg-surface/90 p-6 shadow-[0_24px_80px_rgba(15,111,255,0.15)] backdrop-blur sm:p-8">
          {accessDenied ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              You do not have access to that user page yet. Use your invite code to continue.
            </div>
          ) : null}

          {showTabs ? (
            <div className="mb-5 inline-flex rounded-full border border-line bg-surface-muted p-1">
              <Link
                href={isGoogleSignedIn ? "/logout" : "/login"}
                aria-current={activeTab === "google" ? "page" : undefined}
                className={`${TAB_BASE_CLASS} ${activeTab === "google" ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS}`}
              >
                {isGoogleSignedIn ? "Logout" : "Login"}
              </Link>
              <Link
                href="/join"
                aria-current={activeTab === "invite" ? "page" : undefined}
                className={`${TAB_BASE_CLASS} ${activeTab === "invite" ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS}`}
              >
                Join
              </Link>
            </div>
          ) : null}

          {activeTab === "invite" ? (
            <>
              <h1 className="text-4xl leading-[0.95] text-foreground sm:text-5xl">Join with invite code</h1>
              <p className="mt-3 text-sm text-slate-700 sm:text-base">
                Use your 6-character invite code to open your study page.
              </p>

              {isGoogleSignedIn ? (
                <div className="mt-2 w-full rounded-2xl border border-line bg-surface-muted p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/65">Google Access</p>
                  <p
                    title={signedInGoogleLabel}
                    className="mt-3 inline-flex h-11 w-full items-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-foreground/80 overflow-hidden text-ellipsis whitespace-nowrap"
                  >
                    {signedInGoogleLabel}
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <h1 className="text-4xl leading-[0.95] text-foreground sm:text-5xl">Login with Google</h1>
              <p className="mt-3 text-sm text-slate-700 sm:text-base">
                {isGoogleSignedIn
                  ? "Your Google session is already active on this browser."
                  : "Use Google login when your account already linked."}
              </p>
            </>
          )}

          {activeTab === "invite" ? (
            <>
              <div className={`${isGoogleSignedIn ? "mt-4" : "mt-2"} w-full`}>
                <InviteCodeAccessPanel initialSession={inviteSession} />
              </div>
            </>
          ) : (
            <>
              <div className="mt-2 w-full rounded-2xl border border-line bg-surface-muted p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/65">Google Access</p>
                <div className="mt-3">
                  {isGoogleSignedIn ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <p
                        title={signedInGoogleLabel}
                        className="inline-flex h-11 items-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-foreground/80 overflow-hidden text-ellipsis whitespace-nowrap"
                      >
                        {signedInGoogleLabel}
                      </p>
                      <Link href={signOutHref} className={`${SECONDARY_BUTTON_CLASS} h-11 w-full`}>
                        Sign out
                      </Link>
                    </div>
                  ) : (
                    <GoogleSignInButton callbackPath={googleCallbackPath} className={`${PRIMARY_BUTTON_CLASS} h-11 w-full`} />
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
