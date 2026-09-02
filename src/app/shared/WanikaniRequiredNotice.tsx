import Link from "next/link";

import { CONNECT_COPY } from "@/app/users/[nickname]/wanikani/connectCopy";
import {
  MEMBER_CAPABILITY_DEFINITIONS,
  capabilitiesWithoutWanikani,
  type MemberCapabilityId,
} from "@/lib/memberCapabilities";

type Props = {
  /** The capability the page needed, which names it and says why. */
  capability: MemberCapabilityId;
  /** The member's address, for the link to their own connection page. */
  userKey: string;
  /** A second way on, for a page that has one. */
  secondaryAction?: { label: string; href: string };
};

const PRIMARY =
  "inline-flex h-11 items-center justify-center rounded-full bg-accent px-6 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-accent-2";
const QUIET =
  "inline-flex h-11 items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-bold text-foreground/70 transition hover:bg-surface-muted";

/**
 * What stands in for a WaniKani-shaped surface when there is no WaniKani.
 *
 * These pages did not fail; they rendered. The Library Explorer drew sixty
 * levels of nothing, Stats drew a wall of zeros and congratulated the member
 * on passing a level gate they had reached by never starting, and Study
 * answered "This account has no WaniKani connection" in red above a full
 * filter panel over an empty list. Each read as breakage, and none of them
 * said the one useful thing: this needs a connection, and here is where you
 * make one.
 *
 * It says what the page would have been, why it cannot be that yet, and the
 * two ways onwards - connect, or go and do one of the things that never asked.
 */
export default function WanikaniRequiredNotice({ capability, userKey, secondaryAction }: Props) {
  const definition = MEMBER_CAPABILITY_DEFINITIONS[capability];
  const open = capabilitiesWithoutWanikani();

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      {/* The capability names itself above the sentence rather than inside it:
          "Your reviews and lessons needs a connection" is what one heading
          built out of both reads like, for half the labels in the registry. */}
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">{definition.label}</p>
      <h2 className="mt-1 text-lg font-black text-foreground">{CONNECT_COPY.gateHeading}</h2>
      <p className="mt-1 max-w-2xl text-sm text-foreground/70">{definition.detail}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href={`/users/${encodeURIComponent(userKey)}/wanikani`} className={PRIMARY}>
          {CONNECT_COPY.gateAction}
        </Link>
        {secondaryAction ? (
          <Link href={secondaryAction.href} className={QUIET}>
            {secondaryAction.label}
          </Link>
        ) : null}
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
          {CONNECT_COPY.gateKeepsHeading}
        </h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {open.map((item) => (
            <li
              key={item.id}
              className="rounded-full border border-line bg-surface-muted px-3 py-1 text-xs font-bold text-foreground/70"
            >
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
