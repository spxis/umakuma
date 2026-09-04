"use client";

import { useState } from "react";

import { mapCountryGroups, type MapCountryCode, type WorldPart } from "@/lib/mapCountries";

import { MAP_COUNTRY_PICKER_COPY } from "./MapStudy.constants";

/**
 * Japan, and a way through to everywhere else.
 *
 * A flat row of every country was fine at three and cramped at seven; at
 * thirty it would be a wall of buttons between the reader and the map, and the
 * one country the site is actually about would be lost in it. So Japan always
 * stands on its own at the front, and the rest are reached by naming a part of
 * the world first - two clicks to any country, and never more than a handful
 * of choices on screen at once.
 *
 * Whatever is currently open stays visible even when it is neither Japan nor
 * in the part being browsed. A picker that hides the thing it is pointing at
 * leaves the reader unable to see where they are.
 */
const CHIP =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-black uppercase tracking-[0.08em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70";
const ON = "border-accent bg-accent text-white";
const OFF = "border-line bg-surface text-foreground/70 hover:bg-surface-muted";

export default function MapCountryPicker({
  country,
  isAdmin,
  onChoose,
}: {
  country: MapCountryCode;
  isAdmin: boolean;
  onChoose: (next: MapCountryCode) => void;
}) {
  const { home, parts } = mapCountryGroups(isAdmin);
  const [openPart, setOpenPart] = useState<WorldPart | null>(null);
  const [browsing, setBrowsing] = useState(false);

  const chosen = parts.flatMap((group) => group.countries).find((entry) => entry.code === country) ?? null;
  const shown = openPart ? (parts.find((group) => group.part === openPart)?.countries ?? []) : [];

  const pick = (next: MapCountryCode) => {
    onChoose(next);
    setBrowsing(false);
    setOpenPart(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        aria-pressed={country === home.code}
        onClick={() => pick(home.code)}
        className={`${CHIP} ${country === home.code ? ON : OFF}`}
      >
        {home.label}
      </button>

      {/* Where the reader is, when it is not Japan and not in the open part. */}
      {chosen && !shown.some((entry) => entry.code === chosen.code) ? (
        <button type="button" aria-pressed onClick={() => pick(chosen.code)} className={`${CHIP} ${ON}`}>
          {chosen.label}
        </button>
      ) : null}

      {!browsing ? (
        <button type="button" onClick={() => setBrowsing(true)} className={`${CHIP} ${OFF}`}>
          {MAP_COUNTRY_PICKER_COPY.elsewhere}
        </button>
      ) : (
        <>
          {parts.map((group) => (
            <button
              key={group.part}
              type="button"
              aria-pressed={group.part === openPart}
              onClick={() => setOpenPart(group.part === openPart ? null : group.part)}
              className={`${CHIP} ${group.part === openPart ? ON : OFF}`}
            >
              {group.part}
              <span className="font-semibold opacity-70">{group.countries.length}</span>
            </button>
          ))}
          {shown.map((entry) => (
            <button
              key={entry.code}
              type="button"
              aria-pressed={entry.code === country}
              onClick={() => pick(entry.code)}
              className={`${CHIP} ${entry.code === country ? ON : OFF}`}
            >
              {entry.label}
              {entry.adminOnly ? <span className="font-semibold opacity-70">{MAP_COUNTRY_PICKER_COPY.pilot}</span> : null}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setBrowsing(false);
              setOpenPart(null);
            }}
            className={`${CHIP} ${OFF}`}
          >
            {MAP_COUNTRY_PICKER_COPY.done}
          </button>
        </>
      )}
    </div>
  );
}
