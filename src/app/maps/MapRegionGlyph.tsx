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

/*
 * One pixel of outline, the same on every glyph.
 *
 * `vectorEffect="non-scaling-stroke"` means this number is screen pixels, not
 * map units - which is the whole point at this size, since a stroke measured
 * in the viewBox would be a hundredth of a pixel here. It was being computed
 * as a fraction of the region's own box, mixing the two: Hokkaido's box is
 * 524 map units across and got a 10.5 pixel border on a 36 pixel icon, so a
 * quarter of the glyph was outline and the shape underneath was unreadable,
 * while Kagawa's 49-unit box got 0.97 and looked right. The border grew with
 * the size of the real place, which is why the big prefectures were the ones
 * that looked wrong.
 */
const GLYPH_STROKE = 1;

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
        strokeWidth={GLYPH_STROKE}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
