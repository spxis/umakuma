import type { StaticImageData } from "next/image";

import kumaClose from "@/images/kuma-close-transparent.png";
import umaClose from "@/images/uma-close-transparent.png";
import umaKumaLeft from "@/images/umakuma-1.png";
import umaKumaRight from "@/images/umakuma-2.png";
import userBanner from "@/images/umakuma-banner1-transparent.png";

import type { TabId } from "./UserDashboardTabs.types";

/**
 * What each member tab calls itself, in one place.
 *
 * These six tabs are one page under six addresses, and each had grown its own
 * top. Study and the two explorers opened with a decorative banner and kept
 * their real title inside a collapsible filter panel; Stats and Read each
 * built a header card of their own; Read then put its section toggle on a row
 * *above* that card, so its heading sat a row lower than anywhere else.
 *
 * The picture differs on purpose - a page should still read as itself at a
 * glance - and nothing else does.
 */
export type DashboardPageHeader = {
  icon: StaticImageData;
  title: string;
  subtitle: string;
};

/**
 * The member pages that are not dashboard tabs.
 *
 * Lists, History and Profile drew their own headers - one a hand-rolled copy
 * of this shape, two something else entirely - so a member moving between
 * them met three different tops. They take the same header as the six tabs,
 * from the same place, so the arrangement stays one decision.
 */
export const MEMBER_PAGE_HEADERS = {
  lists: { icon: umaKumaRight },
  history: { icon: kumaClose },
  profile: { icon: umaClose },
} as const;

export const DASHBOARD_PAGE_HEADERS: Record<TabId, DashboardPageHeader> = {
  learn: {
    icon: userBanner,
    title: "Study",
    subtitle: "Reviews due now and pending lessons.",
  },
  wk: {
    icon: umaKumaLeft,
    title: "Library Explorer",
    subtitle: "Everything WaniKani teaches, level by level.",
  },
  jlpt: {
    icon: umaKumaRight,
    title: "JLPT Explorer",
    subtitle: "The kanji behind each JLPT level, N5 to N1.",
  },
  stats: {
    icon: umaClose,
    title: "Stats",
    subtitle: "Progress snapshot and distribution at a glance.",
  },
  news: {
    icon: kumaClose,
    title: "News",
    subtitle: "Read the news with the kanji you know.",
  },
  read: {
    icon: umaKumaLeft,
    title: "Read",
    subtitle: "Track challenge rewards and daily check-ins.",
  },
};
