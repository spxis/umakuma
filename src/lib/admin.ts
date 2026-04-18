import { getServerSession } from "next-auth";

import { authOptions, isAdminEmail } from "@/lib/auth";

export async function isAuthorizedAdmin(request: Request): Promise<boolean> {
  void request;
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}
