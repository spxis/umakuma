import Link from "next/link";

import { SUBJECT_PAGE_COPY } from "./SubjectPage.constants";
import { subjectSectionHref, type SubjectSection } from "./subjectSectionAddress";

/**
 * What a section page says about where it is.
 *
 * A link somebody was sent opens on one block of a subject they may not know,
 * so the strip names the subject, offers the whole page, and lists the other
 * parts this subject actually has - which is also the only way to walk between
 * them. No title of its own: the block below carries one, and two of them read
 * as a mistake.
 */
export default function SubjectSectionHeader({
  base,
  label,
  section,
  available,
}: {
  /** The subject's own page, already escaped. */
  base: string;
  /** What the subject is called: the characters, or a radical's name. */
  label: string;
  section: SubjectSection;
  available: readonly SubjectSection[];
}) {
  const others = available.filter((id) => id !== section);

  return (
    <section className="rounded-3xl border border-line bg-surface/90 px-5 py-4 shadow-sm">
      <Link href={base} className="text-sm font-bold text-accent underline underline-offset-2">
        {SUBJECT_PAGE_COPY.sectionBack(label)}
      </Link>

      {others.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
            {SUBJECT_PAGE_COPY.otherSections}
          </span>
          {others.map((id) => (
            <Link
              key={id}
              href={subjectSectionHref(base, id)}
              className="inline-flex h-7 items-center rounded-full border border-line bg-surface px-3 text-[11px] font-bold text-foreground/75 transition hover:bg-surface-muted"
            >
              {SUBJECT_PAGE_COPY.sectionTitles[id]}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
