import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { viewerKind } from "@/lib/accountListing";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { loadLeaderboardAccounts } from "@/lib/leaderboardAccounts";
import { refreshDueAccounts } from "@/lib/sync";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";

import { resolveViewerMenuInfo } from "../../users/[nickname]/userPageAuth";
import { viewerAddress } from "../../shared/viewerAddress";

/**
 * The board, for whoever is asking.
 *
 * This route used to select from `Account` itself, with no session check and no
 * visibility filter, and hand back every member's `nickname` and real
 * `wkUsername` to anyone who asked - children included. The home page had long
 * since moved to `loadLeaderboardAccounts`, which applies both filters, so the
 * route was serving nobody and leaking to everybody. Its only caller in the
 * repo is a smoke test.
 *
 * It reuses the same loader now, so there is one place that decides who may be
 * seen. `listableTo` inside it reads each member's own visibility choice and
 * the admin's approval; a stranger sees only members who chose to be public.
 *
 * The sync trigger moved behind the session check as well. It was reachable
 * anonymously, which let anyone on the internet make the server start
 * refreshing accounts against the WaniKani API.
 */
export async function GET() {
  return withApiRouteTelemetry({
    route: "/api/leaderboard",
    method: "GET",
    request: undefined,
    execute: async () => {
      try {
        const session = await getServerSession(authOptions);
        const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
        if (!viewerEmail) {
          return NextResponse.json({ error: "Sign in to see the board." }, { status: 401 });
        }

        const isAdmin = isAdminEmail(viewerEmail);
        const viewerMenuInfo = await resolveViewerMenuInfo({
          viewerEmail,
          sessionName: session?.user?.name?.trim() ?? null,
        });

        /*
         * Signed in is not the same as being a member here, which is the rule
         * the home page already follows: a Google session with no account of
         * its own sees what a stranger sees.
         */
        const viewer = viewerKind({
          isAdmin,
          hasAccount: Boolean(viewerAddress(viewerMenuInfo)),
        });

        void refreshDueAccounts(1).catch((error) => {
          console.error("Non-blocking refresh failed", error);
        });

        return NextResponse.json({ leaderboard: await loadLeaderboardAccounts(viewer) });
      } catch (error) {
        console.error(error);
        return NextResponse.json(
          { error: "Could not fetch leaderboard right now." },
          { status: 500 },
        );
      }
    },
  });
}
