import type { ReactNode } from "react";

import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";

/**
 * The pieces an article is written from.
 *
 * An article is a component, so without these every one would carry its own
 * Tailwind and slowly drift from the last. These are the whole vocabulary:
 * a lead, headings, prose, lists, figures and a note. Anything an article
 * cannot say with them is a gap in this file rather than a licence to write
 * classes inline.
 */

/** The opening paragraph, set larger than the body it introduces. */
export function Lead({ children }: { children: ReactNode }) {
  return <p className="max-w-[68ch] text-base font-semibold text-foreground/75 sm:text-lg">{children}</p>;
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-black tracking-tight text-foreground sm:text-xl">{title}</h2>
      {children}
    </section>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="max-w-[68ch] text-sm leading-relaxed text-foreground/75 sm:text-base">{children}</p>;
}

export function Points({ items }: { items: ReactNode[] }) {
  return (
    <ul className="max-w-[68ch] space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2.5 text-sm leading-relaxed text-foreground/75 sm:text-base">
          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** A measured number and what it counts; the shape most of these notes take. */
export function Figures({ items }: { items: { value: string; label: string }[] }) {
  return (
    <dl className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-surface px-4 py-3">
          <dt className="text-xl font-black tabular-nums tracking-tight text-foreground">{item.value}</dt>
          <dd className="mt-0.5 text-xs font-semibold text-foreground/60">{item.label}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A released version, its codename and what it did. */
export function Release({
  version,
  codename,
  reading,
  children,
}: {
  version: string;
  codename: string;
  reading: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-t border-line/60 py-3 sm:flex-row sm:gap-4">
      <span className="shrink-0 pt-0.5 text-xs font-black tabular-nums text-accent sm:w-20">{version}</span>
      <div className="min-w-0 space-y-1">
        <p className="max-w-[62ch] text-sm leading-relaxed text-foreground/80">{children}</p>
        <p className="text-xs font-semibold text-foreground/60">
          <span lang="ja" translate="no" className={`text-kanji-text ${JP_TEXT_CLASS}`}>
            {codename}
          </span>{" "}
          {reading}
        </p>
      </div>
    </div>
  );
}

/** Set apart from the prose: a caveat, a correction, a thing to remember. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-[68ch] border-l-2 border-accent/40 pl-4 text-sm leading-relaxed text-foreground/70">
      {children}
    </p>
  );
}

export function Term({ children }: { children: ReactNode }) {
  return <strong className="font-bold text-foreground">{children}</strong>;
}

/** Japanese inline in English prose, tagged so translation leaves it alone. */
export function Jp({ children }: { children: ReactNode }) {
  return (
    <span lang="ja" translate="no" className={JP_TEXT_CLASS}>
      {children}
    </span>
  );
}
