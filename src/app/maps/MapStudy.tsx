"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import JapanMap, { type MapMark } from "@/app/game/JapanMap";
import { MAP_TONES } from "@/app/game/GameMode.constants";
import ModalShell from "@/app/shared/ModalShell";
import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import { MODAL_LAYERS } from "@/app/shared/modalLayers";
import { GEO_DATASETS } from "@/lib/geoRegion";
import { MAP_COUNTRIES, type MapCountryCode } from "@/lib/mapCountries";
import { mapHref, parseMapPath } from "@/lib/mapAddress";
import { regionCodesInArea } from "@/lib/mapDirectory";
import { mapViewTitle, regionByCode, regionsInOrder } from "@/lib/mapStudy";
import { regionNameLabel, regionNameLines } from "@/lib/regionNames";

import { MAP_ZOOM_LEVELS } from "@/lib/geoMapFraming";
import { markFor, markTone, markTotals } from "@/lib/mapMarks";
import type { MapKanjiFacts } from "@/lib/mapRegionKanji";

import MapRegionDirectory from "./MapRegionDirectory";
import MapRegionPanel from "./MapRegionPanel";
import { useMapMarks } from "./useMapMarks";
import { useMapZoom } from "./useMapZoom";
import { MAP_MARK_COPY, MAP_STUDY_COPY, MAP_STUDY_HEIGHT } from "./MapStudy.constants";

/**
 * The map, the country it shows, and the region being read about.
 *
 * Wide, the facts sit beside the map so the shape and the reading share one
 * view; narrow, they come up over it, since a phone has room for one or the
 * other. The choice is in the address either way, so a page about Tokyo can
 * be sent to somebody and opens on Tokyo.
 */
/* Square, so the − and + read as a pair whatever the digit between them is. */
const ZOOM_BUTTON =
  "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-black text-foreground/70 transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-35";

const CHIP =
  "inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-black uppercase tracking-[0.08em] transition";
const WIDE = "(min-width: 1024px)";

export default function MapStudy({
  initialCountry,
  initialCode,
  initialArea,
  kanjiFacts,
  accountId,
}: {
  initialCountry: MapCountryCode;
  initialCode: string | number | null;
  /** A region the address named, lit and framed from the first paint. */
  initialArea: string | null;
  /** What each kanji in a place name means and reads, resolved on the server. */
  kanjiFacts: MapKanjiFacts;
  /** The reader's own account, or null for a visitor. */
  accountId: string | null;
}) {
  const [country, setCountry] = useState<MapCountryCode>(initialCountry);
  const [code, setCode] = useState<string | number | null>(initialCode);
  const [hovered, setHovered] = useState<string | number | null>(null);
  /*
   * An area held down, and an area merely pointed at. Two pieces of state
   * rather than one because pointing is a preview you get back from by moving
   * away, while choosing survives the pointer leaving the heading - which is
   * the whole use for it, reading the map with Tohoku lit.
   */
  const [area, setArea] = useState<string | null>(initialArea);
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);
  const [wide, setWide] = useState(true);

  const dataset = GEO_DATASETS[country];
  const division = dataset.divisionTypeName.toLowerCase();
  const regions = useMemo(() => regionsInOrder(country), [country]);
  const selected = regionByCode(country, code);
  const hoveredRegion = regionByCode(country, hovered);

  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const apply = () => setWide(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  /* The address follows the choice, and the back button walks the choices. */
  useEffect(() => {
    const next = mapHref(country, code, area);
    if (next !== window.location.pathname) window.history.pushState(null, "", next);
  }, [country, code, area]);

  useEffect(() => {
    const onPopState = () => {
      const address = parseMapPath(window.location.pathname.replace(/^\/maps\/?/, "").split("/").filter(Boolean));
      if (!address) return;
      setCountry(address.country);
      setCode(address.code);
      setArea(address.area);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const view = useMapZoom(country, initialCode, regionCodesInArea(regions, initialArea));
  const marking = useMapMarks(accountId, country);

  /*
   * Escape puts the region down. The panel has an X and, on a phone, a modal
   * that already closes on Escape - but at desktop width the panel is a column
   * beside the map with no modal behind it, so the key did nothing at all.
   */
  useEffect(() => {
    if (code === null) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setCode(null);
      setHovered(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [code]);

  /*
   * Choosing while zoomed brings the region into view. Picking Saitama from
   * the list and being left looking at Kyushu makes a zoom feel broken.
   *
   * On the act of choosing rather than in an effect on `code`: the hook hands
   * back a fresh object every render, so an effect depending on it re-ran
   * constantly and put the centre back on the chosen region - which silently
   * undid every drag the moment it finished.
   */
  const choose = useCallback(
    (next: string | number) => {
      setCode(next);
      setHovered(null);
      /*
       * A province chosen inside a lit region stays part of it - that is the
       * address `/region/prairies/alberta` - and one chosen outside it puts the
       * region out, because an address claiming Ontario is in the Prairies
       * would be a lie and `mapHref` refuses to write one.
       */
      setArea((held) =>
        held && regionCodesInArea(regions, held).some((member) => String(member) === String(next)) ? held : null,
      );
      setHoveredArea(null);
      view.focusRegion(next);
    },
    [regions, view],
  );

  /** A region opened from its heading: lit, and the map framed on it. */
  const openArea = useCallback(
    (name: string) => {
      setArea(name);
      setHoveredArea(null);
      view.focusCodes(regionCodesInArea(regions, name));
    },
    [regions, view],
  );

  /*
   * What the member has said, under what they are doing.
   *
   * The marks paint the whole map and the hover and the selection paint one
   * region each, so the two go on in that order: a prefecture you are pointing
   * at should look pointed-at even if you have marked it known.
   */
  const painted: MapMark[] = regions.flatMap((region) => {
    const tone = markTone(markFor(marking.marks, region.code));
    return tone ? [{ code: region.code, tone: tone as MapMark["tone"] }] : [];
  });

  /*
   * The area goes on over the member's own marks and under the pointer, so a
   * prefecture you are pointing at still reads as pointed-at while its whole
   * area is lit behind it.
   */
  const litArea = hoveredArea ?? area;
  const areaCodes = regionCodesInArea(regions, litArea);
  const viewTitle = mapViewTitle(litArea, selected ?? null);

  const marks: MapMark[] = [
    ...painted,
    ...areaCodes.map((areaCode) => ({ code: areaCode, tone: MAP_TONES.candidate })),
    ...(hovered !== null && String(hovered) !== String(code) ? [{ code: hovered, tone: MAP_TONES.candidate }] : []),
    ...(code !== null ? [{ code, tone: MAP_TONES.target }] : []),
  ];

  const totals = markTotals(marking.marks);
  const saidAnything = totals.known + totals.practice + totals.visited > 0;

  const regionLabel = useCallback(
    (regionCode: string | number) => {
      const region = regionByCode(country, regionCode);
      if (!region) return String(regionCode);
      return regionNameLabel(region);
    },
    [country],
  );

  const panel = selected ? (
    <MapRegionPanel
      region={selected}
      onClose={() => setCode(null)}
      kanjiFacts={kanjiFacts}
      accountId={accountId}
      country={country}
      mark={{
        ...markFor(marking.marks, selected.code),
        saving: marking.saving,
        error: marking.error,
        onChange: (next) => marking.setMark(selected.code, next),
      }}
    />
  ) : null;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section className="space-y-3 rounded-3xl border border-line bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
            {MAP_STUDY_COPY.countryLabel}
          </span>
          {MAP_COUNTRIES.map((entry) => (
            <button
              key={entry.code}
              type="button"
              aria-pressed={entry.code === country}
              onClick={() => {
                setCountry(entry.code);
                setCode(null);
                setHovered(null);
                setArea(null);
                setHoveredArea(null);
              }}
              className={`${CHIP} ${
                entry.code === country ? "border-accent bg-accent text-white" : "border-line bg-surface text-foreground/70 hover:bg-surface-muted"
              }`}
            >
              {entry.label}
            </button>
          ))}
          {/*
            * One line, always. Pointing at a long name used to wrap this and
            * push the map down, so the whole board moved under the pointer.
            */}
          <span
            className="ml-auto min-w-0 flex-1 truncate text-right text-xs font-semibold text-foreground/60"
            title={hoveredRegion ? regionLabel(hoveredRegion.code) : undefined}
            aria-live="polite"
          >
            {hoveredRegion ? regionLabel(hoveredRegion.code) : wide ? MAP_STUDY_COPY.hint(division) : MAP_STUDY_COPY.hintTouch(division)}
          </span>
        </div>

        {saidAnything ? (
          <p className="text-[11px] font-semibold text-foreground/60">
            {MAP_MARK_COPY.tally(totals.known, totals.practice, totals.visited, dataset.totalRegions)}
          </p>
        ) : null}

        <div className={`relative ${MAP_STUDY_HEIGHT} rounded-2xl border border-line bg-surface-muted p-2`}>
          <JapanMap
            marks={marks}
            country={country}
            box={view.box}
            onRegionSelect={choose}
            onRegionDoubleSelect={view.zoomInto}
            onRegionHover={setHovered}
            regionLabel={regionLabel}
            svgProps={view.panProps}
          />
          {/*
            * What is framed, said on the map itself. The address and the panel
            * both knew; the picture did not, and a picture of seven lit
            * prefectures with no name is a quiz rather than a map. Top-left,
            * across from the zoom controls; the corners below are taken by the
            * pan hint and the credit.
            */}
          {viewTitle ? (
            <p
              aria-live="polite"
              className="pointer-events-none absolute left-3 top-3 max-w-[60%] truncate rounded-full bg-surface/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-foreground shadow-sm backdrop-blur"
            >
              {viewTitle}
            </p>
          ) : null}
          {/*
            * Over the map rather than beside it: the controls belong to what
            * they change, and a row above the map would push it down on the
            * one screen size where its height is already tight.
            */}
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-line bg-surface/90 p-1 shadow-sm backdrop-blur">
            <button
              type="button"
              onClick={() => view.step(-1)}
              disabled={view.zoom === MAP_ZOOM_LEVELS[0]}
              aria-label={MAP_STUDY_COPY.zoomOut}
              title={MAP_STUDY_COPY.zoomOut}
              className={ZOOM_BUTTON}
            >
              −
            </button>
            <span className="min-w-8 text-center text-[11px] font-black text-foreground/70">{view.zoom}×</span>
            <button
              type="button"
              onClick={() => view.step(1)}
              disabled={view.zoom === MAP_ZOOM_LEVELS[MAP_ZOOM_LEVELS.length - 1]}
              aria-label={MAP_STUDY_COPY.zoomIn}
              title={MAP_STUDY_COPY.zoomIn}
              className={ZOOM_BUTTON}
            >
              +
            </button>
            {view.zoomed ? (
              <button type="button" onClick={view.reset} className={`${ZOOM_BUTTON} w-auto px-2 text-[10px]`}>
                {MAP_STUDY_COPY.zoomReset}
              </button>
            ) : null}
          </div>
          {/* Said once, while zoomed, where somebody is about to try dragging. */}
          {view.zoomed ? (
            <p className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-surface/85 px-2.5 py-1 text-[10px] font-semibold text-foreground/60">
              {MAP_STUDY_COPY.panHint}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">{dataset.divisionTypePlural}</p>
          <ul className="flex flex-wrap gap-1.5">
            {regions.map((region) => {
              const on = String(region.code) === String(code);
              const names = regionNameLines(region);
              return (
                <li key={region.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => choose(region.code)}
                    onMouseEnter={() => setHovered(region.code)}
                    onMouseLeave={() => setHovered(null)}
                    className={`inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-bold transition ${
                      on ? "border-accent bg-accent text-white" : "border-line bg-surface text-foreground/75 hover:bg-surface-muted"
                    }`}
                  >
                    {names.leadLang ? (
                      <span lang={names.leadLang} translate="no" className={JP_TEXT_CLASS}>
                        {names.lead}
                      </span>
                    ) : null}
                    <span className={names.sub ? "text-[10px] font-semibold opacity-80" : ""}>{names.sub ?? names.lead}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Wide: beside the map. Narrow: over it, and only while something is chosen. */}
      {/*
        * A definite height, so the panel's own body can scroll. With only a
        * max-height the body grew past it and the card clipped whatever came
        * after - the emblem and everything under it could not be read at all.
        */}
      <aside className="hidden overflow-hidden rounded-3xl border border-line bg-surface shadow-sm lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)] lg:flex-col">
        {panel ?? (
          <MapRegionDirectory
            regions={regions}
            marks={marking.marks}
            hovered={hovered}
            onHover={setHovered}
            onChoose={choose}
            divisionPlural={dataset.divisionTypePlural.toLowerCase()}
            activeArea={area}
            onAreaHover={setHoveredArea}
            onAreaChoose={(next) => setArea((held) => (held === next ? null : next))}
            onAreaOpen={openArea}
          />
        )}
      </aside>

      {!wide && selected ? (
        <ModalShell
          onClose={() => setCode(null)}
          closeOnBackdrop
          layer={MODAL_LAYERS.page}
          label={selected.name}
          height="list"
          panelClassName="flex w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_20px_65px_rgba(0,0,0,0.42)]"
        >
          {panel}
        </ModalShell>
      ) : null}
    </div>
  );
}
