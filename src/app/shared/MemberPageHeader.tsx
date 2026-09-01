import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";

type Props = {
  /**
   * The page's own picture. Free to differ - this is the one thing that is
   * meant to, so a page still reads as itself at a glance.
   */
  icon: StaticImageData;
  title: string;
  subtitle: string;
  /** What this page lets you do, on the right of the same row. */
  actions?: ReactNode;
  className?: string;
};

/**
 * The top of a member page: what it is, and what you can do on it.
 *
 * Every member page had its own answer. Study and the two explorers opened
 * with a decorative banner and then hid their actual title inside the filter
 * panel; History used a header card; Read used a header card *and* put its
 * Challenge and Check-ins buttons on a row above it, so the title sat lower
 * there than anywhere else. Four pages, four layouts, and the one thing they
 * agreed on - the nav - was the thing nobody had written twice.
 *
 * One shape now: picture, title, subtitle, actions on the right. The picture
 * is per page and the actions are per page; the arrangement is not. What this
 * replaces is not only the banner but the habit of putting a page's controls
 * wherever there happened to be room, which is what pushed Read's heading down
 * a row and left Study's title inside a panel that can be collapsed.
 */
export default function MemberPageHeader({ icon, title, subtitle, actions, className }: Props) {
  return (
    <section
      className={`rounded-2xl border border-line bg-surface/90 p-4 sm:p-6 ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-white sm:h-14 sm:w-24">
            <Image
              src={icon}
              alt=""
              fill
              className="h-full w-full"
              style={{ objectFit: "contain", objectPosition: "center" }}
              sizes="96px"
            />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black text-foreground">{title}</h1>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">
              {subtitle}
            </p>
          </div>
        </div>
        {/*
          * Wrapping rather than shrinking. A page can carry three controls
          * here - Read has two and a toggle - and at 393px they belong on
          * their own line under the title rather than squeezed beside it.
          */}
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
