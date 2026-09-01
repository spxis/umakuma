"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { navChildHref, type NavChild, type NavSection } from "./navSections";
import ReleaseMotto from "./ReleaseMotto";

/**
 * The header's second row: where you are inside a section, and the release.
 *
 * The codename used to sit in the top row between the search field and the
 * menu, which is what kept search down to a 96px box - three things competing
 * for the right-hand end of one row. It reads perfectly well down here, and the
 * row was already being drawn on most pages anyway.
 *
 * So this row is always present, not only when a section has children. That
 * keeps the header the same height from page to page, which stops the content
 * below it jumping as you navigate - and gives the codename a fixed home rather
 * than one that appears and disappears.
 */
export default function AppSubNavRow({
  section,
  pathname,
  wkUsername,
  subNav,
}: {
  section: NavSection | null;
  pathname: string | null;
  wkUsername: string | null;
  /**
   * A section whose pages are not in `navSections` - admin, whose tabs come
   * from its own registry. It renders in the same slot as the rest so admin
   * stops drawing a third row of its own below the header.
   */
  subNav?: ReactNode;
}) {
  const children: NavChild[] = section?.children ?? [];
  const hrefs = children.map((child: NavChild) => navChildHref(child, wkUsername));

  /*
   * A nested page matches its parent's prefix too - `grades/practice` starts
   * with `grades` - so the longest match wins rather than lighting up both.
   */
  const best = hrefs
    .filter((href: string) => pathname === href || pathname?.startsWith(`${href}/`))
    .sort((left: string, right: string) => right.length - left.length)[0];

  return (
    <div className="mt-1.5 flex min-h-[1.75rem] flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line/60 pt-1.5">
      {subNav ?? (children.length > 0 ? (
        <nav
          aria-label={`${section?.label ?? ""} pages`.trim()}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/60 sm:text-[11px]"
        >
          {children.map((child: NavChild, index: number) => {
            const href = hrefs[index]!;
            return (
              <Link
                key={child.path}
                href={href}
                className={`rounded-full px-2 py-0.5 transition ${
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

      <ReleaseMotto className="ml-auto shrink-0" />
    </div>
  );
}
