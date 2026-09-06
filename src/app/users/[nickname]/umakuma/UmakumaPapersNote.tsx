import { CURRICULUM_PAPERS_URL } from "@/lib/ladder/curriculumPapers";

import { UK_EXPLORER_COPY as copy } from "./UmakumaExplorer.constants";

/**
 * Where the curriculum is explained, linked from the curriculum itself.
 *
 * The papers state the promises the build is held to and carry the version
 * every figure was drawn from, and until now they were reachable only by
 * somebody who had read `docs/CURRICULUM_PAPERS.md`. John, looking at the
 * explorer: "You can link to the articles we have created for UmaKuma as they
 * are interesting."
 *
 * At the foot of the explorer rather than the top: a reader who came to look
 * at level 24 should reach level 24, and the reasoning behind the ladder is
 * what they may want next.
 */
export default function UmakumaPapersNote() {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <h2 className="text-lg font-black text-foreground">{copy.papersHeading}</h2>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground/70">{copy.papersBlurb}</p>
      <a
        href={CURRICULUM_PAPERS_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex h-9 items-center rounded-full border border-line bg-surface px-4 text-[11px] font-black uppercase tracking-[0.08em] text-foreground transition hover:bg-surface-muted"
      >
        {copy.papersLink}
      </a>
    </section>
  );
}
