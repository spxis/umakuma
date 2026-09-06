import Link from "next/link";

import { XP_SECTION_NAV_COPY as copy } from "./xpBoardCopy";

/**
 * One row across the top of every XP page.
 *
 * SPX carried a nav on every page of its XP system - XP Chart, How to Gain XP,
 * Promotions, Weekly Leaders, XP Leaders - and building these pages without
 * one is how two of them ended up reachable from nowhere at all. `/xp/weekly`
 * linked only to itself and `/xp/promotions` was not linked from anywhere on
 * the site; both were built, tested, gated and invisible.
 *
 * So the fix is structural rather than a handful of links added where somebody
 * remembered: a page that joins this section joins the row, and
 * `xpSectionNav.test.ts` fails if a page under `/xp` does not render it. An
 * orphan cannot be shipped by forgetting.
 *
 * One line at every width, scrolling rather than wrapping, like the two header
 * rows above it - a nav that grows a second line as the window narrows moves
 * the page under the reader.
 */
export const XP_SECTION_LINKS = [
  { href: "/xp", label: copy.board },
  { href: "/xp/weekly", label: copy.weekly },
  { href: "/xp/promotions", label: copy.promotions },
  { href: "/xp/earn", label: copy.earn },
] as const;

export type XpSectionHref = (typeof XP_SECTION_LINKS)[number]["href"];

export default function XpSectionNav({
  current,
  /** The reader's own address, for the one link that is theirs. Null when signed out. */
  address = null,
}: {
  current: XpSectionHref | null;
  address?: string | null;
}) {
  return (
    <nav
      aria-label={copy.label}
      className="admin-tab-scroll mb-3 flex flex-nowrap items-center gap-x-2 overflow-x-auto whitespace-nowrap px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/60"
    >
      {XP_SECTION_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.href === current ? "page" : undefined}
          className={`shrink-0 rounded-full px-2 py-0.5 transition ${
            link.href === current
              ? "bg-surface-muted font-black text-foreground"
              : "hover:text-foreground/75"
          }`}
        >
          {link.label}
        </Link>
      ))}

      {/* Theirs, and only offered when there is somebody to offer it to. */}
      {address ? (
        <Link
          href={`/users/${encodeURIComponent(address)}/xp`}
          className="shrink-0 rounded-full px-2 py-0.5 transition hover:text-foreground/75"
        >
          {copy.mine}
        </Link>
      ) : null}
    </nav>
  );
}
