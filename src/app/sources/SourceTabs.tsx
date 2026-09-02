import Link from "next/link";

import { SOURCE_KEY_VALUES, sourcePath, type SourceKey } from "@/lib/sourceCredits";

import { SOURCE_DESCRIPTIONS } from "./Sources.constants";

/**
 * One tab per source, as links.
 *
 * Links rather than buttons because each source is a page of its own: a credit
 * can point straight at one, the address says which is open, and the back
 * button works. The tab row is the same on every source page so a reader can
 * browse the rest from any of them.
 */
export default function SourceTabs({ current }: { current: SourceKey | null }) {
  return (
    <nav className="flex flex-wrap gap-1.5" aria-label="Sources">
      {SOURCE_KEY_VALUES.map((key) => {
        const active = key === current;
        return (
          <Link
            key={key}
            href={sourcePath(key)}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-black uppercase tracking-[0.08em] transition ${
              active
                ? "border-accent bg-accent text-white"
                : "border-line bg-surface text-foreground/70 hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {SOURCE_DESCRIPTIONS[key].tab}
          </Link>
        );
      })}
    </nav>
  );
}
