"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import JapanMap, { type MapMark } from "@/app/game/JapanMap";
import { MAP_TONES } from "@/app/game/GameMode.constants";
import ModalShell from "@/app/shared/ModalShell";
import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import { MODAL_LAYERS } from "@/app/shared/modalLayers";
import { GEO_DATASETS } from "@/lib/geoRegion";
import { MAP_COUNTRIES, type MapCountryCode } from "@/lib/mapCountries";
import { mapStudyHref, parseMapStudyAddress, regionByCode, regionsInOrder } from "@/lib/mapStudy";

import MapRegionPanel from "./MapRegionPanel";
import { MAP_STUDY_COPY, MAP_STUDY_HEIGHT } from "./MapStudy.constants";

/**
 * The map, the country it shows, and the region being read about.
 *
 * Wide, the facts sit beside the map so the shape and the reading share one
 * view; narrow, they come up over it, since a phone has room for one or the
 * other. The choice is in the address either way, so a page about Tokyo can
 * be sent to somebody and opens on Tokyo.
 */
const CHIP =
  "inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-black uppercase tracking-[0.08em] transition";
const WIDE = "(min-width: 1024px)";

export default function MapStudy({
  initialCountry,
  initialCode,
}: {
  initialCountry: MapCountryCode;
  initialCode: string | number | null;
}) {
  const [country, setCountry] = useState<MapCountryCode>(initialCountry);
  const [code, setCode] = useState<string | number | null>(initialCode);
  const [hovered, setHovered] = useState<string | number | null>(null);
  const [wide, setWide] = useState(true);

  const dataset = GEO_DATASETS[country];
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
    const next = mapStudyHref(country, code);
    const current = `${window.location.pathname}${window.location.search}`;
    if (next !== current) window.history.pushState(null, "", next);
  }, [country, code]);

  useEffect(() => {
    const onPopState = () => {
      const address = parseMapStudyAddress(new URLSearchParams(window.location.search));
      setCountry(address.country);
      setCode(address.code);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const choose = useCallback((next: string | number) => {
    setCode((previous) => (String(previous) === String(next) ? null : next));
  }, []);

  const marks: MapMark[] = [
    ...(hovered !== null && String(hovered) !== String(code) ? [{ code: hovered, tone: MAP_TONES.candidate }] : []),
    ...(code !== null ? [{ code, tone: MAP_TONES.target }] : []),
  ];

  const regionLabel = useCallback(
    (regionCode: string | number) => {
      const region = regionByCode(country, regionCode);
      if (!region) return String(regionCode);
      return region.nameNative && region.nameNative !== region.name ? `${region.name} ${region.nameNative}` : region.name;
    },
    [country],
  );

  const panel = selected ? <MapRegionPanel region={selected} onClose={() => setCode(null)} /> : null;

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
              }}
              className={`${CHIP} ${
                entry.code === country ? "border-accent bg-accent text-white" : "border-line bg-surface text-foreground/70 hover:bg-surface-muted"
              }`}
            >
              {entry.label}
            </button>
          ))}
          <span className="ml-auto min-h-5 text-xs font-semibold text-foreground/60" aria-live="polite">
            {hoveredRegion ? regionLabel(hoveredRegion.code) : wide ? MAP_STUDY_COPY.hint : MAP_STUDY_COPY.hintTouch}
          </span>
        </div>

        <div className={`${MAP_STUDY_HEIGHT} rounded-2xl border border-line bg-surface-muted p-2`}>
          <JapanMap
            marks={marks}
            country={country}
            onRegionSelect={choose}
            onRegionHover={setHovered}
            regionLabel={regionLabel}
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">{MAP_STUDY_COPY.regionsLabel}</p>
          <ul className="flex flex-wrap gap-1.5">
            {regions.map((region) => {
              const on = String(region.code) === String(code);
              const native = region.nameNative && region.nameNative !== region.name ? region.nameNative : null;
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
                    {native ? (
                      <span lang="ja" translate="no" className={JP_TEXT_CLASS}>
                        {native}
                      </span>
                    ) : null}
                    <span className={native ? "text-[10px] font-semibold opacity-80" : ""}>{region.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Wide: beside the map. Narrow: over it, and only while something is chosen. */}
      <aside className="hidden overflow-hidden rounded-3xl border border-line bg-surface shadow-sm lg:block lg:max-h-[80vh]">
        {panel ?? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm font-black text-foreground">{MAP_STUDY_COPY.nothingChosen}</p>
            <p className="mt-1 text-xs font-semibold text-foreground/60">{MAP_STUDY_COPY.nothingChosenBody}</p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60">
              {dataset.totalRegions} {dataset.divisionTypeName.toLowerCase()}s
            </p>
          </div>
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
