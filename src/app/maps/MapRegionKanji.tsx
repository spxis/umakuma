"use client";

import SubjectCards from "@/app/shared/SubjectCards";
import SubjectFilerCell from "@/app/shared/SubjectFilerCell";
import SubjectFilerToggle from "@/app/shared/SubjectFilerToggle";
import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import type { SubjectListRow } from "@/app/shared/subjectListView";
import { useFilerOpen, useSubjectFiler } from "@/app/shared/useSubjectFiler";
import { SUBJECT_TYPES, srsBucketFromStage } from "@/lib/domainConstants";
import type { MapKanjiFacts } from "@/lib/mapRegionKanji";
import type { FilerHit } from "@/lib/subjectFiler";

import { MAP_STUDY_COPY } from "./MapStudy.constants";

/**
 * The characters a place is written with, drawn the way every other kanji is.
 *
 * The panel used to draw its own coloured boxes: no meaning, no reading, and
 * no way to keep one - on a site where a kanji in a search row, on a subject
 * page, in the glyph viewer and on the strokes page all carry the same three.
 * A member who met 埼 here and wanted it on their Kanto list had to go and
 * find it somewhere else.
 *
 * So it is the shared grid, which brings all of that with it. The facts come
 * from the server because the dictionary is `server-only`; everything else is
 * the same component the rest of the site uses.
 */
export default function MapRegionKanji({
  kanji,
  facts,
  accountId,
}: {
  kanji: string[];
  facts: MapKanjiFacts;
  /** The reader's own account, or null for a visitor, who is offered no filing. */
  accountId: string | null;
}) {
  const [filerOpen, setFilerOpen] = useFilerOpen();

  const rows: Array<SubjectListRow & FilerHit & { href: string; reading: string | null }> = kanji.map((character) => ({
    key: `kanji:${character}`,
    /*
     * Zero rather than an invented id: these come from the dictionary, not the
     * WaniKani catalogue, and `catalogId` reads any non-positive value as "no
     * catalogue id" - so the lists are offered and the tags, which need a
     * WaniKani subject to hang off, are not.
     */
    subjectId: 0,
    slug: null,
    srsStage: null,
    srsBucket: srsBucketFromStage(null),
    glyph: character,
    meaning: facts[character]?.meaning ?? "",
    reading: facts[character]?.reading ?? null,
    subjectType: SUBJECT_TYPES.kanji,
    wkLevel: null,
    href: `/kanji/${encodeURIComponent(character)}`,
  }));

  const filing = Boolean(accountId) && filerOpen;
  const filer = useSubjectFiler(accountId, rows, filing);

  return (
    <section className="space-y-1.5">
      <div className="flex items-center gap-2">
        <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
          {MAP_STUDY_COPY.writtenWith}
        </h3>
        {accountId ? (
          <span className="ml-auto">
            <SubjectFilerToggle open={filerOpen} onToggle={() => setFilerOpen((was) => !was)} error={filing ? filer.error : null} />
          </span>
        ) : null}
      </div>
      <SubjectCards
        rows={rows}
        onSelect={() => undefined}
        /*
         * Fixed columns, not auto-fill, and no density toggle.
         *
         * A place name is two to four characters and the panel is a fixed
         * width, so how many fit on a row is decided here rather than offered
         * as a choice - an explorer's grid has to cope with 900 kanji and a
         * viewport, which is a different problem. Three across leaves 埼玉県
         * on one line and 北海道 comfortable.
         */
        gridClassName="grid-cols-3 gap-2"
        hrefFor={(row) => row.href}
        renderDetail={(row) =>
          row.reading ? (
            <span lang="ja" translate="no" className={`text-[11px] font-semibold text-foreground/60 ${JP_TEXT_CLASS}`}>
              {row.reading}
            </span>
          ) : null
        }
        renderUnder={filing ? (row) => <SubjectFilerCell hit={row} filer={filer} className="mt-1 justify-center" /> : undefined}
      />
    </section>
  );
}
