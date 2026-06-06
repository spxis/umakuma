import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

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

export default async function LogoutPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const callbackUrl = normalizeCallbackUrl(query.callbackUrl);
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect(
      callbackUrl === "/"
        ? "/login"
        : `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
    );
  }

  redirect(
    callbackUrl === "/"
      ? "/signout"
      : `/signout?callbackUrl=${encodeURIComponent(callbackUrl)}`,
  );
}
