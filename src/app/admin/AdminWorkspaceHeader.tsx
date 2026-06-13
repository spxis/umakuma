import Image from "next/image";

import adminBanner from "@/images/umakuma-hero2-transparent.png";
import AdminStatusBadge from "./AdminStatusBadge";

type AdminWorkspaceHeaderProps = {
  checkingSession: boolean;
  sessionAuthorized: boolean;
  signedIn: boolean;
  emailAllowed: boolean;
  userEmail: string | null;
  userName: string | null;
};

export default function AdminWorkspaceHeader({
  checkingSession,
  sessionAuthorized,
  signedIn,
  emailAllowed,
  userEmail,
  userName,
}: AdminWorkspaceHeaderProps) {
  return (
    <section className="rounded-2xl border border-line bg-surface/90 p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-white sm:h-14 sm:w-24">
            <Image
              src={adminBanner}
              alt=""
              fill
              className="h-full w-full"
              style={{ objectFit: "contain", objectPosition: "center" }}
              sizes="96px"
            />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/60">Admin workspace</p>
            <h1 className="mt-1 text-2xl font-black text-foreground sm:text-3xl">Manage accounts, data, campaigns, and logs</h1>
            <p className="mt-1 text-sm text-foreground/70">Switch tabs to focus on one admin job at a time.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-line bg-surface-muted px-3 py-2">
          <AdminStatusBadge
            checkingSession={checkingSession}
            sessionAuthorized={sessionAuthorized}
            signedIn={signedIn}
            emailAllowed={emailAllowed}
          />
          <span className="text-xs font-semibold text-foreground/70">
            {signedIn ? userEmail ?? userName ?? "Signed in" : "Not signed in"}
          </span>
        </div>
      </div>
    </section>
  );
}
