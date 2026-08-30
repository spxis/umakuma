import "server-only";

import { getServerSession } from "next-auth";

import { authOptions, isAdminEmail } from "@/lib/auth";

/**
 * Whether the current viewer is an admin, for chrome rendered in the root
 * layout.
 *
 * Guarded the way `loadFooterModeChips` is: the layout wraps every route, so
 * anything that throws here fails the whole build rather than one page. A
 * viewer we cannot resolve is simply not an admin.
 */
export async function loadViewerIsAdmin(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    return isAdminEmail(session?.user?.email ?? null);
  } catch {
    return false;
  }
}
