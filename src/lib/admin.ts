import "server-only";

import { getServerSession } from "next-auth";

import { authOptions, isAdminEmail } from "@/lib/auth";

export async function isAuthorizedAdmin(request: Request): Promise<boolean> {
  void request;
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}

/**
 * Which admin is asking, for the log that answers "who moved this".
 *
 * Null rather than throwing: a caller that has already passed
 * `isAuthorizedAdmin` is authorised regardless, and an audit line reading
 * "admin" is better than an edit refused because a session had no email.
 */
export async function adminEmail(request: Request): Promise<string | null> {
  void request;
  const session = await getServerSession(authOptions);
  return session?.user?.email?.trim().toLowerCase() ?? null;
}
