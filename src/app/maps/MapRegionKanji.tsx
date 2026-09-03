"use client";

import PillTextToggle from "@/app/shared/PillTextToggle";
import SubjectFilerCell from "@/app/shared/SubjectFilerCell";
import SubjectFilerToggle from "@/app/shared/SubjectFilerToggle";
import SubjectPill from "@/app/shared/SubjectPill";
import { useFilerOpen, useSubjectFiler } from "@/app/shared/useSubjectFiler";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import type { MapKanjiFacts } from "@/lib/mapRegionKanji";
import type { FilerHit } from "@/lib/subjectFiler";

import { MAP_STUDY_COPY } from "./MapStudy.constants";

/**
 * The characters a place is written with, as the pill every inline kanji is.
 *
 * This block has been drawn three ways. First as coloured boxes of its own:
 * no meaning, no reading, nothing to keep. Then as the explorer's card, which
 * brought all of that but is the browsing grid for a level's worth of kanji -
 * and a three-character name in a side panel is not a grid to browse. The
 * kanji page draws the characters of a word as small pills under one Text
 * on/off control; a place name is the same thing, so it is the same pill and
 * the same control, and the map no longer looks like a page of its own.
 *
 * Filing stays: a member who meets 埼 here can put it on their Kanto list.
 * The strip sits under the pill as a sibling, never inside it - the pill is
 * a link, and a control never contains another control.
 */
type NameKanji = FilerHit & { meaning: string; reading: string | null; href: string };

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

  const hits: NameKanji[] = kanji.map((character) => ({
    subjectType: SUBJECT_TYPES.kanji,
    glyph: character,
    slug: null,
    /*
     * No id: these come from the dictionary, not the WaniKani catalogue, so
     * the lists are offered and the tags, which hang off a WaniKani subject,
     * are not.
     */
    subjectId: null,
    meaning: facts[character]?.meaning ?? "",
    reading: facts[character]?.reading ?? null,
    href: `/kanji/${encodeURIComponent(character)}`,
  }));

  const filing = Boolean(accountId) && filerOpen;
  const filer = useSubjectFiler(accountId, hits, filing);

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
          {MAP_STUDY_COPY.writtenWith}
        </h3>
        <span className="ml-auto flex items-center gap-2">
          <PillTextToggle />
          {accountId ? (
            <SubjectFilerToggle open={filerOpen} onToggle={() => setFilerOpen((was) => !was)} error={filing ? filer.error : null} />
          ) : null}
        </span>
      </div>
      {/*
        * A row of pills, until the lists are open; then one line per kanji,
        * the pill at its head and its lists scrolling beside it. Under the
        * pill they wrapped into a column of forty chips per character and the
        * panel became a filing cabinet, which is what the rail is for.
        */}
      <ul className={filing ? "flex flex-col gap-2" : "flex flex-wrap gap-2"}>
        {hits.map((hit) => (
          <li key={hit.glyph} className={filing ? "flex items-center gap-2" : ""}>
            <SubjectPill
              glyph={hit.glyph}
              subjectType={SUBJECT_TYPES.kanji}
              reading={hit.reading}
              meaning={hit.meaning}
              href={hit.href}
            />
            {filing ? <SubjectFilerCell hit={hit} filer={filer} variant="rail" className="min-w-0 flex-1" /> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
