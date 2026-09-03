import { GEO_DATASETS, type CountryCode } from "@/lib/geoRegion";
import { GEO_INSETS, applyInsetTransform, insetTransform, insetTransformAttribute } from "@/lib/geoMapInsets";
import { geoBoxIsWholeCountry, geoFocusBox } from "@/lib/geoMapFraming";
import { mapBoxToViewBox, type MapBox } from "@/lib/japanPrefectures";
import { placeMapHandles } from "@/lib/mapHandles";
import { MAP_TONE_CLASS, MAP_TONES } from "./GameMode.constants";
import type { MapTone } from "./GameMode.types";

export type MapMark = {
  code: string | number;
  tone: MapTone;
  /** Shown in the tap handle: the keyboard number for this choice. */
  keyHint?: string;
  onSelect?: () => void;
};

type Props = {
  marks: MapMark[];
  /** Regions the view should frame. Empty draws the whole country. */
  focusCodes?: ReadonlyArray<string | number>;
  /**
   * The window to draw, when the caller is framing it itself.
   *
   * The study map zooms and pans, so it computes its own window; the game
   * frames whatever the question is about and leaves this off. Given, it wins
   * over `focusCodes`, which is the caller saying it has already decided.
   */
  box?: MapBox;
  /** Which country's board to draw. Japan unless the run says otherwise. */
  country?: CountryCode;
  /** Handles make small prefectures tappable; off when the map is only a prompt. */
  showHandles?: boolean;
  disabled?: boolean;
  className?: string;
  /**
   * Regions as things to choose, for a map that is read rather than played.
   * With this set every region is a button under the pointer or a finger;
   * the game leaves it unset and uses handles, which keep a small prefecture
   * as easy to hit as Hokkaido.
   */
  onRegionSelect?: (code: string | number) => void;
  onRegionHover?: (code: string | number | null) => void;
  /** What a region is called, for the pointer and the screen reader. */
  regionLabel?: (code: string | number) => string;
  /**
   * Pointer handlers for a caller that pans the map, spread onto the `<svg>`.
   * The study map drags to pan; the game never does.
   */
  svgProps?: React.SVGProps<SVGSVGElement>;
};

/** Handle size as a share of the framed width, so it holds up at any zoom. */
const HANDLE_RADIUS_RATIO = 0.045;
const STROKE_RATIO = 0.0022;

function handleFor(box: MapBox) {
  const radius = box.width * HANDLE_RADIUS_RATIO;
  return { radius, fontSize: radius * 1.15, stroke: box.width * STROKE_RATIO };
}

export default function JapanMap({
  marks,
  focusCodes = [],
  box: framed,
  country = "JP",
  showHandles = false,
  disabled = false,
  className,
  onRegionSelect,
  onRegionHover,
  regionLabel,
  svgProps,
}: Props) {
  const choosable = Boolean(onRegionSelect) && !disabled;
  const dataset = GEO_DATASETS[country];
  const box = framed ?? geoFocusBox(country, focusCodes);
  const { radius, fontSize, stroke } = handleFor(box);
  // Codes are numbers in Japan and letters elsewhere, so key them as text.
  const marksByCode = new Map(marks.map((mark) => [String(mark.code), mark]));
  const wholeCountry = geoBoxIsWholeCountry(country, box);
  const regionByCode = new Map(dataset.regions.map((region) => [String(region.code), region]));
  /*
   * The regions drawn beside the mainland rather than where they really are.
   * Okinawa in place stretches the frame until the mainland is unreadable;
   * Alaska in place is wider than Texas and hard against the left edge. Each
   * is moved into a box of its own, and only when the whole country is in
   * view - zoomed to one region, it is drawn where it belongs.
   */
  const insets = wholeCountry ? GEO_INSETS[country] ?? [] : [];
  const insetByCode = new Map(
    insets.flatMap((entry) => {
      const region = regionByCode.get(String(entry.code));
      if (!region) return [];
      return [[String(entry.code), { box: entry.box, transform: insetTransform(region.map.bbox, entry.box) }] as const];
    }),
  );

  /*
   * Where each handle sits, clear of the ones already placed. The geometry is
   * in `placeMapHandles`; all this does is find each mark's region first.
   */
  const placedHandles = placeMapHandles(
    marks.flatMap((mark) => {
      const region = regionByCode.get(String(mark.code));
      if (!region) return [];
      /* A handle follows its region into the box, or it points at open sea. */
      const seated = insetByCode.get(String(mark.code));
      const centroid = seated ? applyInsetTransform(region.map.centroid, seated.transform) : region.map.centroid;
      return [{ item: mark, centroid }];
    }),
    radius,
    box,
  );

  return (
    <svg
      viewBox={mapBoxToViewBox(box)}
      preserveAspectRatio="xMidYMid meet"
      role={choosable ? "group" : "img"}
      aria-label={`Map of ${dataset.countryName} by ${dataset.divisionTypeName.toLowerCase()}`}
      onMouseLeave={choosable ? () => onRegionHover?.(null) : undefined}
      {...svgProps}
      className={`h-full w-full ${className ?? ""} ${svgProps?.className ?? ""}`.trim()}
    >
      {/* Okinawa is drawn in a box rather than in place, the way Japanese maps
          do. Only Japan has an inset; the others draw everything where it is. */}
      {[...insetByCode.values()].map(({ box }) => (
        <rect
          key={`${box.x}-${box.y}`}
          x={box.x}
          y={box.y}
          width={box.width}
          height={box.height}
          className="fill-none stroke-line"
          strokeWidth={stroke * 1.5}
          strokeDasharray={`${stroke * 6} ${stroke * 4}`}
        />
      ))}

      {dataset.regions.map((region) => {
        const mark = marksByCode.get(String(region.code));
        const label = regionLabel?.(region.code) ?? region.name;
        const seated = insetByCode.get(String(region.code));
        return (
          <path
            key={String(region.code)}
            transform={seated ? insetTransformAttribute(seated.transform) : undefined}
            d={region.map.path}
            fillRule="evenodd"
            strokeWidth={stroke}
            strokeLinejoin="round"
            role={choosable ? "button" : undefined}
            tabIndex={choosable ? 0 : undefined}
            aria-label={choosable ? label : undefined}
            onClick={choosable ? () => onRegionSelect?.(region.code) : undefined}
            onKeyDown={
              choosable
                ? (event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    onRegionSelect?.(region.code);
                  }
                : undefined
            }
            onMouseEnter={choosable ? () => onRegionHover?.(region.code) : undefined}
            onFocus={choosable ? () => onRegionHover?.(region.code) : undefined}
            className={`transition-colors ${MAP_TONE_CLASS[mark?.tone ?? MAP_TONES.idle]!.shape} ${
              choosable ? "cursor-pointer outline-none focus-visible:stroke-accent" : ""
            }`}
          >
            {choosable ? <title>{label}</title> : null}
          </path>
        );
      })}

      {/* Tap targets sit above every path so a small region is as easy to hit
          as Hokkaido, which is what keeps the question about knowing the map. */}
      {showHandles
        ? placedHandles.map(({ item: mark, x, y, hx, hy }) => {
            // A handle with nothing to select is a pointer, not a control: Read
            // uses one to show which prefecture the question is about.
            const interactive = Boolean(mark.onSelect);
            return (
              <g
                key={mark.code}
                role={interactive ? "button" : undefined}
                tabIndex={interactive && !disabled ? 0 : undefined}
                aria-label={interactive ? `Choice ${mark.keyHint ?? ""}`.trim() : undefined}
                aria-disabled={interactive && disabled ? true : undefined}
                onClick={interactive && !disabled ? mark.onSelect : undefined}
                onKeyDown={(event) => {
                  if (!interactive || disabled || (event.key !== "Enter" && event.key !== " ")) return;
                  event.preventDefault();
                  mark.onSelect?.();
                }}
                className={!interactive ? "" : disabled ? "cursor-wait" : "cursor-pointer focus-visible:outline-none"}
              >
                {/* The stem follows the handle wherever it was pushed, so it
                    still points at its own region. */}
                <line
                  x1={x}
                  y1={y}
                  x2={hx}
                  y2={hy}
                  strokeWidth={stroke * 2}
                  className={MAP_TONE_CLASS[mark.tone]!.line}
                />
                <circle
                  cx={hx}
                  cy={hy}
                  r={radius}
                  strokeWidth={stroke * 2}
                  className={MAP_TONE_CLASS[mark.tone]!.handle}
                />
                <text
                  x={hx}
                  y={hy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={fontSize}
                  className="fill-white font-black"
                >
                  {mark.keyHint}
                </text>
              </g>
            );
          })
        : null}
    </svg>
  );
}
