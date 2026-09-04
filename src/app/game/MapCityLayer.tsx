import type { MapCity } from "@/lib/geoCities";

/**
 * Cities drawn over a country's outlines.
 *
 * The points arrive already in the map's own coordinates - the builder put them
 * through the same projection as the boundaries - so nothing is transformed
 * here. This decides only how big a dot is and which cities can be named
 * without printing one name over another.
 *
 * Not interactive, deliberately. The regions under these are buttons, and a
 * control inside a control is what `UnifiedExplorerCard.test.tsx` exists to
 * stop; a city that swallowed the click would take the province with it. Each
 * dot carries a `<title>`, so the pointer and a screen reader still get the
 * name whether or not there was room to print it.
 */
type Props = {
  cities: MapCity[];
  /** The map's own stroke width at this zoom, so dots hold their proportions. */
  stroke: number;
  /**
   * Where a city has to move because its region did.
   *
   * Okinawa is drawn in a box at the foot of Japan's map, and its outline is
   * carried there by a transform at render. Its cities take the same ride or
   * they float in the sea where the prefecture used to be. Identity today, but
   * the box is a value somebody may move.
   */
  insetFor?: (region: string | null) => { scale: number; x: number; y: number } | null;
};

const DOT_RATIO = { country: 2.6, region: 2.1, place: 1.5 } as const;

/* A glyph is about this fraction of the font size across, near enough to
   reserve space with. Exact metrics would need measuring in the browser. */
const GLYPH_WIDTH_RATIO = 0.55;

type Box = { x0: number; y0: number; x1: number; y1: number };

const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

function dotRatio(city: MapCity): number {
  if (city.capital === "country") return DOT_RATIO.country;
  if (city.capital === "region") return DOT_RATIO.region;
  return DOT_RATIO.place;
}

/**
 * Which cities get their name printed.
 *
 * Greedy, in the order the builder sorted them, which is most important first:
 * a name is printed if its box is still clear, and skipped if it would land on
 * one already there. Fredericton and Halifax printed over each other as
 * "Frederictonifax" when every city was labelled unconditionally, and a fixed
 * importance cut-off instead left thirty anonymous dots in the empty north
 * while the crowded south still collided.
 *
 * It re-solves itself at every zoom for free: the label box is sized from
 * `stroke`, which shrinks with the window, so the same cities spread apart as
 * the reader zooms in and more of them find room.
 */
function labelledCities(cities: MapCity[], stroke: number): Set<MapCity> {
  const fontSize = stroke * 5;
  const taken: Box[] = [];
  const chosen = new Set<MapCity>();

  for (const city of cities) {
    const r = stroke * dotRatio(city);
    const width = city.name.length * fontSize * GLYPH_WIDTH_RATIO;
    const box: Box = {
      x0: city.x + r,
      y0: city.y - fontSize * 0.6,
      x1: city.x + r * 1.6 + width,
      y1: city.y + fontSize * 0.6,
    };
    if (taken.some((placed) => overlaps(placed, box))) continue;
    taken.push(box);
    chosen.add(city);
  }

  return chosen;
}

export default function MapCityLayer({ cities, stroke, insetFor }: Props) {
  if (cities.length === 0) return null;

  const seated = cities.map((city) => {
    const move = insetFor?.(city.region) ?? null;
    if (!move) return city;
    return { ...city, x: move.x + city.x * move.scale, y: move.y + city.y * move.scale };
  });
  const named = labelledCities(seated, stroke);

  return (
    <g data-testid="map-city-layer">
      {seated.map((city) => {
        const r = stroke * dotRatio(city);
        return (
          <g key={`${city.name}-${city.x}-${city.y}`}>
            <circle
              cx={city.x}
              cy={city.y}
              r={r}
              strokeWidth={stroke * 0.9}
              className={city.capital ? "fill-accent stroke-surface" : "fill-foreground/70 stroke-surface"}
            >
              <title>{city.name}</title>
            </circle>
            {/* A capital wears a ring, so it reads as one without a legend. */}
            {city.capital ? (
              <circle
                cx={city.x}
                cy={city.y}
                r={r * 1.9}
                strokeWidth={stroke * 0.7}
                className="fill-none stroke-accent/70"
              />
            ) : null}
            {named.has(city) ? (
              /*
               * The halo is the stroke painted under the fill. Without it a name
               * over a dark province is unreadable, and a plate behind each
               * label would hide the border the label sits on.
               */
              <text
                x={city.x + r * 1.6}
                y={city.y}
                dominantBaseline="central"
                fontSize={stroke * 5}
                strokeWidth={stroke * 1.6}
                className="pointer-events-none fill-foreground stroke-surface font-bold [paint-order:stroke]"
              >
                {city.name}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
