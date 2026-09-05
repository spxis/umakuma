import { LEVEL_SYSTEMS, type LevelSystem } from "@/lib/levelBadge";

import { CROSS_SYSTEM_NAME_COPY as copy } from "./crossSystemNameCopy";

/**
 * What the other system calls this radical.
 *
 * A member who spent two years on WaniKani learned 卜 as *toe*. Our curriculum
 * calls it *divining*, and until this existed there was nothing on the card to
 * say those are the same shape - the reading looked like a different radical
 * they had never met.
 *
 * So both names, in one row, labelled with the same `WK` and `UK` prefixes
 * every chip on the site already uses. Deliberately the same component in both
 * directions: our name on a WaniKani surface and theirs on ours are the same
 * fact read from two sides, and drawing them two ways would make them look
 * like two different features.
 *
 * It is not shown at all when there is nothing to say - a radical only one
 * system teaches, or a member with no WaniKani connection, who may not be
 * shown their invented names.
 */
export default function CrossSystemName({
  system,
  name,
  className,
}: {
  /** Whose name this is - `WK` for WaniKani's, `UK` for ours. */
  system: LevelSystem;
  name: string | null | undefined;
  className?: string;
}) {
  if (!name) return null;
  const theirs = system === LEVEL_SYSTEMS.wanikani;

  return (
    <div
      title={theirs ? copy.wanikaniTitle(name) : copy.umakumaTitle(name)}
      className={`flex items-center gap-2 rounded-lg border border-line bg-surface-muted/50 px-2 py-1 ${className ?? ""}`.trim()}
    >
      <span
        translate="no"
        className="shrink-0 rounded-md bg-foreground/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-foreground/70"
      >
        {system}
      </span>
      <span className="min-w-0 flex-1 text-[9px] font-bold uppercase tracking-[0.1em] text-foreground/60">
        {theirs ? copy.wanikani : copy.umakuma}
      </span>
      <span className="shrink-0 truncate text-sm font-black text-foreground">{name}</span>
    </div>
  );
}
