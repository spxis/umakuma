import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { isAwaitingApproval } from "@/lib/accountApproval";
import { isAccountBarred } from "@/lib/accountStanding";
import { normalizeDisplayName } from "@/lib/accountIdentity";
import { authOptions } from "@/lib/auth";
import { INVITE_SESSION_COOKIE_NAME, verifyInviteSessionToken } from "@/lib/inviteSession";
import UmaKumaPageBanner from "@/app/shared/UmaKumaPageBanner";
import { prisma } from "@/lib/prisma";
import { allowsSelfSignup } from "@/lib/signupSettings";
import { loadSignupSettings } from "@/lib/signupSettingsServer";

import WelcomeForm from "./WelcomeForm";
import { WELCOME_COPY } from "./welcomeCopy";

const CARD_CLASS = "rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8";

/** One sentence and a way onwards: three of this page's states are that shape. */
function NoticeCard({ heading, body, action, href }: {
  heading: string;
  body: string;
  action: string;
  href: string;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 px-4 py-10 sm:px-6">
      <UmaKumaPageBanner variant="leaderboard" />
      <section className={CARD_CLASS}>
        <h1 className="text-2xl font-black text-foreground">{heading}</h1>
        <p className="mt-2 text-sm text-foreground/70">{body}</p>
        <Link
          href={href}
          className="mt-5 inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-accent-2"
        >
          {action}
        </Link>
      </section>
    </main>
  );
}

/**
 * The first thing a newcomer sees, and the only page that creates an account.
 *
 * It handles five states rather than assuming one: not signed in, signed in
 * with signup closed, signed in and waiting for approval, signed in to an
 * account that was turned away, and signed in with a working account - which
 * is the case a double submit or a stale tab lands on, and it belongs on their
 * own page rather than back at this form.
 */
export default async function WelcomePage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase() ?? null;

  /*
   * Either kind of session, because an invited member may have no Google
   * account at all. Assuming `getServerSession` sent them to the login screen
   * from a page they were entitled to open.
   */
  const inviteToken = (await cookies()).get(INVITE_SESSION_COOKIE_NAME)?.value ?? null;
  const inviteAccountId = inviteToken ? verifyInviteSessionToken(inviteToken)?.accountId ?? null : null;

  if (!email && !inviteAccountId) {
    redirect("/login?callbackUrl=%2Fwelcome");
  }

  const settings = await loadSignupSettings();
  const account = email
    ? await prisma.account.findFirst({
        where: { joinedByEmail: { equals: email, mode: "insensitive" } },
        select: { slug: true, wkUsername: true, approvalStatus: true, disabledAt: true },
      })
    : await prisma.account.findUnique({
        where: { id: inviteAccountId as string },
        select: { slug: true, wkUsername: true, approvalStatus: true, disabledAt: true },
      });

  if (account) {
    /*
     * Turned away, so this is where they stop. Sending them to their own page
     * would land them on a refusal notice, and offering the signup form would
     * invite them to make a second account.
     */
    if (isAccountBarred(account)) {
      return (
        <NoticeCard
          heading={WELCOME_COPY.rejectedHeading}
          body={WELCOME_COPY.rejectedBody}
          action={WELCOME_COPY.rejectedAction}
          href="/"
        />
      );
    }

    if (isAwaitingApproval(account.approvalStatus)) {
      return (
        <NoticeCard
          heading={WELCOME_COPY.pendingHeading}
          body={WELCOME_COPY.pendingBody}
          action={WELCOME_COPY.pendingAction}
          href="/"
        />
      );
    }

    redirect(`/users/${encodeURIComponent(account.slug ?? account.wkUsername ?? "")}`);
  }

  /*
   * Creating an account needs a Google identity to attach it to. An invite
   * session whose account has gone would otherwise be shown a form that its
   * own API refuses.
   */
  if (!email) {
    redirect("/join");
  }

  if (!allowsSelfSignup(settings)) {
    return (
      <NoticeCard
        heading={WELCOME_COPY.closedHeading}
        body={WELCOME_COPY.closedBody}
        action={WELCOME_COPY.closedAction}
        href="/join"
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 px-4 py-10 sm:px-6">
      {/* A newcomer's first screen should look like the site, not a form. */}
      <UmaKumaPageBanner variant="leaderboard" />

      <header>
        <h1 className="text-3xl font-black text-foreground sm:text-4xl">{WELCOME_COPY.heading}</h1>
        <p className="mt-2 text-base text-foreground/75">{WELCOME_COPY.subheading}</p>
      </header>

      <section className={CARD_CLASS}>
        <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
          {WELCOME_COPY.whatHeading}
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {WELCOME_COPY.what.map((item) => (
            <li key={item.title} className="rounded-xl border border-line bg-surface-muted/50 p-3">
              <p className="text-sm font-bold text-foreground">{item.title}</p>
              <p className="mt-1 text-xs text-foreground/65">{item.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 p-3">
          <p className="text-sm font-bold text-foreground">{WELCOME_COPY.noWanikaniHeading}</p>
          <p className="mt-1 text-xs text-foreground/70">{WELCOME_COPY.noWanikaniBody}</p>
        </div>
      </section>

      <section className={CARD_CLASS}>
        <WelcomeForm
          suggestedName={normalizeDisplayName(session?.user?.name) ?? ""}
          defaultVisibility={settings.defaultVisibility}
          askDisplayName={settings.askDisplayName}
          askVisibility={settings.askVisibility}
        />
      </section>
    </main>
  );
}
