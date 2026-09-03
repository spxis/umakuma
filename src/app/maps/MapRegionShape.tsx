"use client";

import JapanMap from "@/app/game/JapanMap";
import { MAP_TONES } from "@/app/game/GameMode.constants";
import { geoRegionBox } from "@/lib/geoMapFraming";
import type { CountryCode } from "@/lib/geoRegion";

import { MAP_SHAPE_COPY } from "./MapStudy.constants";

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
 * The same map component the board uses, framed on one region. Nothing new
 * draws prefectures; it is the one that already knows how.
 */
export default function MapRegionShape({
  country,
  code,
  label,
}: {
  country: CountryCode;
  code: string | number;
  label: string;
}) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-line bg-surface-muted">
      <div className="h-44 w-full p-2">
        <JapanMap
          country={country}
          marks={[{ code, tone: MAP_TONES.target }]}
          box={geoRegionBox(country, code)}
          regionLabel={() => label}
          className="pointer-events-none"
        />
      </div>
      <figcaption className="sr-only">{MAP_SHAPE_COPY.caption(label)}</figcaption>
    </figure>
  );
}
