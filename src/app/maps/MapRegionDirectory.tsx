"use client";

import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import type { GeoRegion } from "@/lib/geoRegion";
import { markFor, markTone, type MapMarkIndex } from "@/lib/mapMarks";
import { groupRegionsByArea } from "@/lib/mapDirectory";
import { regionNameLines } from "@/lib/regionNames";

import MapRegionGlyph from "./MapRegionGlyph";
import { MAP_DIRECTORY_COPY } from "./MapStudy.constants";

/**
 * The whole country, as a list, where the panel has nothing else to show.
 *
 * The panel is half the page. With nothing chosen it held one line saying so,
 * beside a map of 47 prefectures - a large empty box on a page whose subject
 * was sitting right next to it. So it holds the country instead: every region
 * with its outline, its name in both scripts, and the marks the member has
 * made, in the areas a Japanese map is read in rather than one run of 47.
 *
 * A row is the map. Pointing at one lights that region on the board and
 * choosing one opens it, which is what the chips under the map already did -
 * so this is a second way through the same door, not a table of contents.
 * That is also why it goes when something is chosen: the panel's job is then
 * the region, and the chips are still there to move between them.
 */
export default function MapRegionDirectory({
  regions,
  marks,
  hovered,
  onHover,
  onChoose,
  divisionPlural,
  activeArea,
  onAreaHover,
  onAreaChoose,
}: {
  regions: GeoRegion[];
  marks: MapMarkIndex;
  hovered: string | number | null;
  onHover: (code: string | number | null) => void;
  onChoose: (code: string | number) => void;
  /** "prefectures", "states": what this country calls the things in the list. */
  divisionPlural: string;
  /** The area held down, whose regions the map is lighting. */
  activeArea: string | null;
  onAreaHover: (area: string | null) => void;
  onAreaChoose: (area: string) => void;
}) {
  const areas = groupRegionsByArea(regions);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-line bg-surface-muted/60 px-5 py-3">
        <h2 className="text-base font-black text-foreground">
          {MAP_DIRECTORY_COPY.heading(regions.length, divisionPlural)}
        </h2>
        <p className="text-xs font-semibold text-foreground/60">{MAP_DIRECTORY_COPY.hint}</p>
      </header>

      {/*
        * Columns rather than a grid, so an area's rows stay together and the
        * next area starts under the last one instead of leaving a ragged gap
        * across the row. Two only where there is room for two readable ones.
        */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="columns-1 gap-x-4 [column-fill:balance] xl:columns-2">
          {areas.map((area) => (
            <section key={area.name} className="mb-3 break-inside-avoid">
              {/*
                * The button sits inside the heading rather than replacing it.
                * The areas were `h3`s, which is how a screen reader jumps
                * through the country; making the heading a control outright
                * would have taken that away. A heading is not a control, so
                * nothing here is a control inside a control - the rows are
                * siblings in the list below, not children of this.
                */}
              <h3>
                <button
                  type="button"
                  aria-pressed={area.name === activeArea}
                  onClick={() => onAreaChoose(area.name)}
                  onMouseEnter={() => onAreaHover(area.name)}
                  onMouseLeave={() => onAreaHover(null)}
                  onFocus={() => onAreaHover(area.name)}
                  onBlur={() => onAreaHover(null)}
                  title={MAP_DIRECTORY_COPY.areaTitle(area.name)}
                  className={`mb-1 block w-full cursor-pointer truncate rounded-lg px-1 py-0.5 text-left text-[11px] font-black uppercase tracking-[0.12em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${
                    area.name === activeArea
                      ? "bg-accent/15 text-accent"
                      : "text-foreground/60 hover:bg-surface-muted hover:text-foreground"
                  }`}
                >
                  {area.name}
                </button>
              </h3>
              <ul className="space-y-0.5">
                {area.regions.map((region) => {
                  const lit = String(region.code) === String(hovered);
                  const names = regionNameLines(region);
                  return (
                    <li key={region.id}>
                      <button
                        type="button"
                        onClick={() => onChoose(region.code)}
                        onMouseEnter={() => onHover(region.code)}
                        onMouseLeave={() => onHover(null)}
                        onFocus={() => onHover(region.code)}
                        onBlur={() => onHover(null)}
                        className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-2 py-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${
                          lit ? "border-accent bg-accent/10" : "border-transparent hover:border-line hover:bg-surface-muted"
                        }`}
                      >
                        <span className="h-9 w-9 shrink-0">
                          <MapRegionGlyph
                            path={region.map.path}
                            bbox={region.map.bbox}
                            tone={markTone(markFor(marks, region.code))}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          {names.leadLang ? (
                            <span lang={names.leadLang} translate="no" className={`block truncate text-base font-black leading-tight text-foreground ${JP_TEXT_CLASS}`}>
                              {names.lead}
                            </span>
                          ) : null}
                          <span className={`block truncate font-bold leading-tight ${names.sub ? "text-sm text-foreground/70" : "text-base text-foreground"}`}>
                            {names.sub ?? names.lead}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
