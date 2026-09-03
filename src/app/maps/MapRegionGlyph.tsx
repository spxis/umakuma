import { geoShapeGlyphBox } from "@/lib/geoMapFraming";
import { mapBoxToViewBox } from "@/lib/japanPrefectures";
import { MAP_TONE_CLASS } from "@/app/game/GameMode.constants";

/**
 * One region's outline, at the size of a letter.
 *
 * Its own path in its own square, not the country map shrunk: a row of the
 * directory that drew the whole board 47 times would be 2,209 paths for 47
 * pictures, and every one of them would show the same country with a speck
 * lit somewhere in it.
 *
 * Painted in the tone the map is painting it, so a prefecture marked known is
 * green in both places. Unmarked is darker here than on the board - a shape
 * two centimetres across at a tenth opacity is not a shape.
 */
const GLYPH_IDLE = "fill-foreground/25 stroke-foreground/45";

export default function MapRegionGlyph({
  path,
  bbox,
  tone,
  className = "",
}: {
  path: string;
  bbox: readonly [number, number, number, number];
  /** How the board is painting it, or null where the member has said nothing. */
  tone: string | null;
  className?: string;
}) {
  const box = geoShapeGlyphBox(bbox);
  return (
    <svg
      viewBox={mapBoxToViewBox(box)}
      aria-hidden="true"
      focusable="false"
      className={`h-full w-full ${className}`.trim()}
    >
      <path
        d={path}
        className={tone ? MAP_TONE_CLASS[tone]?.shape ?? GLYPH_IDLE : GLYPH_IDLE}
        strokeWidth={box.width * 0.02}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
