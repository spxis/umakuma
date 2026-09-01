"use client";

import { usePathname } from "next/navigation";

/**
 * The `/users/<who>` an on-screen surface currently belongs to.
 *
 * Surfaces that offer a destination - practise this set, open that sheet - have
 * to build a link under the member whose page they are on, and the pathname is
 * the only place that is written down: the study explorer, history and the
 * tagged lists are all mounted without being told whose page they landed on.
 *
 * Empty when the surface is not under a member at all. The tagged lists open
 * from the game lobby and the JLPT explorer as well, and an empty base is what
 * lets those withhold the offer rather than build a link to nowhere.
 */
export function useUserBasePath(): string {
  const pathname = usePathname() ?? "";
  return pathname.startsWith("/users/") ? pathname.split("/").slice(0, 3).join("/") : "";
}

/** Where a practice sheet is built for the member whose page this is. */
export function usePracticePath(): string {
  const base = useUserBasePath();
  return base ? `${base}/grades/practice` : "";
}
