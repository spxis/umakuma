"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { navChildHref, navChildrenFor, type NavChild, type NavSection } from "./navSections";
import HeaderMemberStats from "./HeaderMemberStats";
import type { ViewerMenuInfo } from "@/app/users/[nickname]/UserDashboardTabs.types";

/**
 * The header's second row: where you are inside a section, and how you are doing.
 *
 * The right-hand end of this row carried the release codename.
 * It reports the member instead now - XP, and the two ladders - because the
 * footer was already printing the version, the codename, its reading and the
 * date, so the header was spending its most-read corner on a second copy of
 * something nobody needed twice.
 *
 * This row is always present, not only when a section has children. That keeps
 * the header the same height from page to page, which stops the content below
 * it jumping as you navigate - and gives the strip a fixed home rather than one
 * that appears and disappears.
 */
export default function AppSubNavRow({
  section,
  pathname,
  wkUsername,
  viewerMenuInfo,
  subNav,
}: {
  section: NavSection | null;
  pathname: string | null;
  wkUsername: string | null;
  /** Whose numbers the strip at the end of the row reports: the viewer's own, never the page's. */
  viewerMenuInfo: ViewerMenuInfo | null;
  /**
   * A section whose pages are not in `navSections` - admin, whose tabs come
   * from its own registry. It renders in the same slot as the rest so admin
   * stops drawing a third row of its own below the header.
   */
  subNav?: ReactNode;
}) {
  const children: NavChild[] = navChildrenFor(section, wkUsername);
  const hrefs = children.map((child: NavChild) => navChildHref(child, wkUsername));

  /*
   * A nested page matches its parent's prefix too - `grades/practice` starts
   * with `grades` - so the longest match wins rather than lighting up both.
   */
  const best = hrefs
    .filter((href: string) => pathname === href || pathname?.startsWith(`${href}/`))
    .sort((left: string, right: string) => right.length - left.length)[0];

  return (
    <div className="mt-1.5 flex min-h-[1.75rem] flex-nowrap items-center justify-between gap-x-3 border-t border-line/60 pt-1.5">
      {subNav ?? (children.length > 0 ? (
        <nav
          aria-label={`${section?.label ?? ""} pages`.trim()}
          /* One line, always: the pages of a section are a row, not a column. */
          className="admin-tab-scroll flex min-w-0 flex-1 flex-nowrap items-center gap-x-2 overflow-x-auto whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/60 sm:text-[11px]"
        >
          {children.map((child: NavChild, index: number) => {
            const href = hrefs[index]!;
            return (
              <Link
                key={child.path}
                href={href}
                className={`shrink-0 rounded-full px-2 py-0.5 transition ${
                  href === best ? "bg-surface-muted font-black text-foreground" : "hover:text-foreground/75"
                }`}
              >
                {child.label}
              </Link>
            );
          })}
        </nav>
      ) : (
        <span aria-hidden="true" />
      ))}

      <HeaderMemberStats viewerMenuInfo={viewerMenuInfo} className="ml-auto" />
    </div>
  );
}
