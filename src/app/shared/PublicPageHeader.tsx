import { getServerSession } from "next-auth";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import { authOptions, isAdminEmail } from "@/lib/auth";

/**
 * The site's own navigation, on the pages anybody can read.
 *
 * The subject pages are where every search result lands, so they are the most
 * likely page on the site to be someone's first. Without this they are a
 * cul-de-sac: no search box to look up the next word, no way to the explorers,
 * nothing but the back button. The results page learned this already - it
 * dropped its chrome once and ended every search at a dead end - and moving
 * the destination out of the explorers moves that lesson with it.
 *
 * The session is read for the header alone. Nothing below it changes with who
 * is asking, which is what lets one address answer for a member, a visitor and
 * a link pasted into a chat.
 */
export default async function PublicPageHeader() {
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  return (
    <AppTopMenuRow
      viewerMenuInfo={viewerMenuInfo}
      showAdminActions={isAdminEmail(viewerEmail)}
      className="mb-2"
    />
  );
}
