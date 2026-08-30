import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import AuthAccessScreen from "../AuthAccessScreen";

type PageProps = {
  searchParams: Promise<{
    access?: string | string[];
    flow?: string | string[];
  }>;
};

function isAccessDenied(value: string | string[] | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "denied";
}

export default async function JoinPage({ searchParams }: PageProps) {
  const query = await searchParams;

  if (query.flow) {
    const next = isAccessDenied(query.access) ? "/join?access=denied" : "/join";
    redirect(next);
  }

  // A viewer who already resolves to an account has nothing to join. This
  // includes the access=denied bounce from someone else's page - the right
  // landing is their own page, not an invite form they have no code for.
  const session = await getServerSession(authOptions);
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail: session?.user?.email?.trim().toLowerCase() ?? null,
    sessionName: session?.user?.name?.trim() ?? null,
  });
  if (viewerMenuInfo?.wkUsername) {
    redirect(`/users/${encodeURIComponent(viewerMenuInfo.wkUsername)}`);
  }

  return <AuthAccessScreen activeTab="invite" accessDenied={isAccessDenied(query.access)} />;
}
