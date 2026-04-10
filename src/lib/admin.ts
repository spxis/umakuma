import { getServerSession } from "next-auth";

import { ADMIN_SESSION_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/adminSession";
import { authOptions, isAdminEmail } from "@/lib/auth";

function getCookieValue(cookieHeader: string, cookieName: string): string | null {
  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [rawName, ...valueParts] = cookie.trim().split("=");
    if (rawName === cookieName) {
      return valueParts.join("=");
    }
  }
  return null;
}

export async function isAuthorizedAdmin(request: Request): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (isAdminEmail(session?.user?.email)) {
    return true;
  }

  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    return false;
  }

  const received = request.headers.get("x-admin-key");
  if (received === expected) {
    return true;
  }

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return false;
  }

  const adminSessionToken = getCookieValue(cookieHeader, ADMIN_SESSION_COOKIE_NAME);
  if (!adminSessionToken) {
    return false;
  }

  return verifyAdminSessionToken(adminSessionToken);
}
