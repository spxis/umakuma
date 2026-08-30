import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import AuthAccessScreen from "../AuthAccessScreen";
import { signedInLoginTarget } from "../authAccess";
import { authOptions } from "@/lib/auth";

type PageProps = {
  searchParams: Promise<{
    callbackUrl?: string | string[];
  }>;
};

function normalizeCallbackUrl(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/")) {
    return "/";
  }

  return raw;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const callbackUrl = normalizeCallbackUrl(query.callbackUrl);
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    /*
     * Already signed in. Asking for the login page means "let me in", so go
     * where they were headed, or to /join, which sends a member to their own
     * page and someone with no account yet to the invite form. It used to
     * redirect to /logout, which answered a request to sign in by offering to
     * sign out. Switching accounts is still one click away, in the user menu
     * and on the sign-in screen's own tab.
     */
    redirect(signedInLoginTarget(callbackUrl));
  }

  return <AuthAccessScreen activeTab="google" googleCallbackPath={callbackUrl} />;
}
