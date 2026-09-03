import { glyphTextSizeClass } from "@/app/shared/glyphSizes";
import Link from "next/link";

import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";

import { SUBJECT_PAGE_COPY } from "./SubjectPage.constants";
import { subjectSectionHref, type SubjectSection } from "./subjectSectionAddress";

/**
 * The head of a single section's page: what it is about, and the way back.
 *
 * A section page drops every block but one, and the block it keeps is Related
 * or Words or Mnemonics - none of which says which character you are reading
 * about. So the page opened on a bare underlined link and a row of chips, with
 * the subject named only inside the words "Everything about 倫". A shared link
 * landed a reader on a page that never introduced itself, and the one thing at
 * the top of it was the one thing on the page drawn like nothing else.
 *
 * It is a header now, in the shape the whole page is drawn in: the character
 * at the size the subject page gives it, its readings and meaning beside it,
 * and the way back as a chip among the chips rather than an anchor above them.
 */
const CHIP =
  "inline-flex h-7 items-center rounded-full border px-3 text-[11px] font-bold transition";

export default function SubjectSectionHeader({
  base,
  label,
  line,
  section,
  available,
}: {
  /** The subject's own page, already escaped. */
  base: string;
  /** What the subject is called: the characters, or a radical's name. */
  label: string;
  /** Readings and meaning, already joined, where the page knows them. */
  line?: string | null;
  section: SubjectSection;
  available: readonly SubjectSection[];
}) {
  const others = available.filter((id) => id !== section);

  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-surface/90 shadow-sm">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line bg-surface-muted/60 px-5 py-4">
        {/* The subject of the section, sized like every other primary glyph. */}
        <h1
          lang="ja"
          translate="no"
          className={`font-black leading-none text-foreground ${glyphTextSizeClass(label)} ${JP_TEXT_CLASS}`}
        >
          {label}
        </h1>
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
          {SUBJECT_PAGE_COPY.sectionTitles[section]}
        </p>
        {line ? <p className="min-w-0 basis-full text-sm font-bold text-foreground/75">{line}</p> : null}
      </header>

      {/*
        * The way back leads the row and is filled rather than outlined, so the
        * whole page is one click from a page about the same character and the
        * eye can tell which chip that is without reading all of them.
        */}
      <nav aria-label={SUBJECT_PAGE_COPY.otherSections} className="flex flex-wrap items-center gap-1.5 px-5 py-3">
        <Link href={base} className={`${CHIP} border-accent bg-accent text-white hover:brightness-95`}>
          {SUBJECT_PAGE_COPY.sectionBack(label)}
        </Link>
        {others.length > 0 ? (
          <>
            <span className="ml-2 mr-0.5 text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
              {SUBJECT_PAGE_COPY.otherSections}
            </span>
            {others.map((id) => (
              <Link
                key={id}
                href={subjectSectionHref(base, id)}
                className={`${CHIP} border-line bg-surface text-foreground/75 hover:bg-surface-muted`}
              >
                {SUBJECT_PAGE_COPY.sectionTitles[id]}
              </Link>
            ))}
          </>
        ) : null}
      </nav>
    </section>
  );
}
