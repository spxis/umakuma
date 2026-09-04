"use client";

import CountryMap from "@/app/game/CountryMap";
import { MAP_TONES } from "@/app/game/GameMode.constants";
import { geoRegionBox } from "@/lib/geoMapFraming";
import type { MapCity } from "@/lib/geoCities";
import type { CountryCode } from "@/lib/geoRegion";

import { MAP_SHAPE_COPY, MAP_SHAPE_FRAME_ASPECT } from "./MapStudy.constants";

/**
 * The chosen region on its own, filling the panel.
 *
 * On the country map Kagawa is four millimetres of grey and Rhode Island is
 * smaller than the word for it, so the shape - the one thing a map is for -
 * is the thing you cannot see. Drawn on its own it is the size of the panel,
 * and the neighbours are still there in outline so it is a place rather than
 * a blob: recognising Toyama means recognising the bite it takes out of the
 * coast, not its silhouette on a white card.
 *
 * The frame's proportions are named once and used twice, which is the whole
 * trick: the window is cut to the same shape the frame is, so the map scales
 * to fit with nothing left over. Given a fixed height and a panel whose width
 * changes, the two disagreed - the window was near enough square, the frame
 * two and a half times as wide - and the map filled that width with more
 * country, until the region it was drawn for was a speck in the middle.
 *
 * The same map component the board uses, framed on one region. Nothing new
 * draws prefectures; it is the one that already knows how.
 */
export default function MapRegionShape({
  country,
  code,
  label,
  cities,
}: {
  country: CountryCode;
  code: string | number;
  label: string;
  /** The region's cities, when the map beside this is drawing them. */
  cities?: MapCity[];
}) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-line bg-surface-muted">
      <div className="w-full p-2" style={{ aspectRatio: String(MAP_SHAPE_FRAME_ASPECT) }}>
        <CountryMap
          country={country}
          marks={[{ code, tone: MAP_TONES.target }]}
          box={geoRegionBox(country, code, MAP_SHAPE_FRAME_ASPECT)}
          regionLabel={() => label}
          cities={cities}
          className="pointer-events-none"
        />
      </div>
      <figcaption className="sr-only">{MAP_SHAPE_COPY.caption(label)}</figcaption>
    </figure>
  );
}
