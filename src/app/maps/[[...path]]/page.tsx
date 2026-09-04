import type { Metadata } from "next";
import { getServerSession } from "next-auth";

import { notFound } from "next/navigation";

import mapIcon from "@/images/umakuma-2.png";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import PublicPageHeader from "@/app/shared/PublicPageHeader";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import { authOptions } from "@/lib/auth";
import { parseMapPath } from "@/lib/mapAddress";
import { mapRegionKanjiFacts } from "@/lib/mapRegionKanji";

import MapStudy from "../MapStudy";
import { MAP_STUDY_COPY } from "../MapStudy.constants";

export const metadata: Metadata = {
  title: "Map — UmaKuma",
  description: "Learn Japan, the United States and Canada region by region: every prefecture, state and province and what it is known for.",
};

type Props = { params: Promise<{ path?: string[] }> };

/**
 * A large map to learn a country by, rather than only to be quizzed on.
 *
 * Public, like the subject pages: the map and its facts are the same for
 * everyone, and a link to one prefecture should open for whoever it is sent
 * to. The country and the chosen region ride in the address for the same
 * reason.
 */
export default async function MapStudyPage({ params }: Props) {
  /* A path that names no country or no region is not a map; it is a 404. */
  const address = parseMapPath((await params).path);
  if (!address) notFound();

  /*
   * Read for the panel, not for the map. The page stays public - the facts are
   * the same for everyone - and knowing who is looking only decides whether
   * the characters of a place name can be put on one of their lists.
   */
  const session = await getServerSession(authOptions);
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail: session?.user?.email?.trim().toLowerCase() ?? null,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  return (
    <div className={PAGE_SHELL_PADDING}>
      <PublicPageHeader />
      <div className={`${PAGE_WIDTH.wide} mx-auto max-w-400 space-y-4 pb-8`}>
        <MemberPageHeader icon={mapIcon} title={MAP_STUDY_COPY.title} subtitle={MAP_STUDY_COPY.subtitle} className="mb-3" />
        <MapStudy
          initialCountry={address.country}
          initialCode={address.code}
          initialArea={address.area}
          kanjiFacts={mapRegionKanjiFacts()}
          accountId={viewerMenuInfo?.accountId ?? null}
        />
      </div>
    </div>
  );
}
