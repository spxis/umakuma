import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions, isAdminEmail } from "@/lib/auth";
import { loadSignupSettings } from "@/lib/signupSettingsServer";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import AuthAccessScreen from "../AuthAccessScreen";
import { JOIN_HREF, newcomerLanding } from "../authAccess";
import { viewerAddress } from "@/app/shared/viewerAddress";

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
  const address = viewerAddress(viewerMenuInfo);
  if (address) {
    redirect(`/users/${encodeURIComponent(address)}`);
  }

  /*
   * A signed-in newcomer belongs on the page that creates their account, not
   * on a form asking for a code, whenever the door is open. This is the guard
   * that holds on a refresh: wherever they came from, this page will not show
   * them the invite form while signup is open.
   */
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const landing = newcomerLanding(
    { isSignedIn: Boolean(viewerEmail), isAdmin: isAdminEmail(viewerEmail), hasLinkedAccount: false },
    await loadSignupSettings(),
  );
  if (landing && landing !== JOIN_HREF) {
    redirect(landing);
  }

  return <AuthAccessScreen activeTab="invite" accessDenied={isAccessDenied(query.access)} />;
}
