import type { Metadata } from "next";

import mapIcon from "@/images/umakuma-2.png";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import PublicPageHeader from "@/app/shared/PublicPageHeader";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { parseMapStudyAddress } from "@/lib/mapStudy";

import MapStudy from "./MapStudy";
import { MAP_STUDY_COPY } from "./MapStudy.constants";

export const metadata: Metadata = {
  title: "Map — UmaKuma",
  description: "Learn Japan, the United States and Canada region by region: every prefecture, state and province and what it is known for.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * A large map to learn a country by, rather than only to be quizzed on.
 *
 * Public, like the subject pages: the map and its facts are the same for
 * everyone, and a link to one prefecture should open for whoever it is sent
 * to. The country and the chosen region ride in the address for the same
 * reason.
 */
export default async function MapStudyPage({ searchParams }: Props) {
  const address = parseMapStudyAddress(await searchParams);

  return (
    <div className={PAGE_SHELL_PADDING}>
      <PublicPageHeader />
      <div className={`${PAGE_WIDTH.wide} mx-auto max-w-400 space-y-4 pb-8`}>
        <MemberPageHeader icon={mapIcon} title={MAP_STUDY_COPY.title} subtitle={MAP_STUDY_COPY.subtitle} className="mb-3" />
        <MapStudy initialCountry={address.country} initialCode={address.code} />
      </div>
    </div>
  );
}
