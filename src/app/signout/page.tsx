import { getServerSession } from "next-auth";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import SignOutActionButton from "./SignOutActionButton";

const TAB_BASE_CLASS =
  "inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-black uppercase tracking-[0.12em] transition";
const TAB_ACTIVE_CLASS = "border border-line bg-surface text-foreground";
const TAB_INACTIVE_CLASS = "text-foreground/70 hover:bg-surface";

type PageProps = {
  searchParams: Promise<{
    callbackUrl?: string | string[];
    clearAdmin?: string | string[];
  }>;
};

function normalizeCallbackUrl(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/")) {
    return "/";
  }

  return raw;
}

function hasClearAdminFlag(value: string | string[] | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "1";
}

export default async function SignOutPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const callbackUrl = normalizeCallbackUrl(query.callbackUrl);
  const clearAdmin = hasClearAdminFlag(query.clearAdmin);
  const session = await getServerSession(authOptions);
  const signedInName = session?.user?.name?.trim() ?? "";
  const signedInEmail = session?.user?.email?.trim() ?? "";
  const signedInLabel = [signedInName, signedInEmail]
    .filter((value) => value.length > 0)
    .join(" · ") || "Google account";

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="noise-overlay pointer-events-none absolute inset-0" />
      <main className="relative mx-auto w-full max-w-2xl space-y-5">
        <Link
          href={callbackUrl}
          className="inline-flex items-center rounded-full border border-line bg-surface px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-surface-muted"
        >
          Back to leaderboard
        </Link>

        <section className="animate-enter rounded-2xl border border-line bg-surface/90 p-6 shadow-[0_24px_80px_rgba(15,111,255,0.15)] backdrop-blur sm:p-8">
          <div className="mb-5 inline-flex rounded-full border border-line bg-surface-muted p-1">
            <Link
              href="/logout"
              aria-current="page"
              className={`${TAB_BASE_CLASS} ${TAB_ACTIVE_CLASS}`}
            >
              Logout
            </Link>
            <Link
              href="/join"
              className={`${TAB_BASE_CLASS} ${TAB_INACTIVE_CLASS}`}
            >
              Join
            </Link>
          </div>

          <h1 className="text-4xl leading-[0.95] text-foreground sm:text-5xl">Sign out</h1>
          <p className="mt-3 text-sm text-slate-700 sm:text-base">
            This will end your Google session for UmaKuma{clearAdmin ? " and clear remembered admin access on this device" : ""}.
          </p>

          <div className="mt-2 w-full rounded-2xl border border-line bg-surface-muted p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/65">Google Access</p>
            <p
              title={signedInLabel}
              className="mt-3 inline-flex h-11 w-full items-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-foreground/80 overflow-hidden text-ellipsis whitespace-nowrap"
            >
              {signedInLabel}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link href={callbackUrl} className="inline-flex h-11 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-black uppercase tracking-[0.12em] text-slate-800 transition hover:bg-surface-muted">
                Cancel
              </Link>
              <SignOutActionButton callbackUrl={callbackUrl} clearAdmin={clearAdmin} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}