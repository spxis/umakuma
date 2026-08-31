import { GEO_DATASETS, type CountryCode } from "@/lib/geoRegion";
import { geoBoxIsWholeCountry, geoFocusBox } from "@/lib/geoMapFraming";
import { JAPAN_MAP, mapBoxToViewBox, type MapBox } from "@/lib/japanPrefectures";
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
  /** Which country's board to draw. Japan unless the run says otherwise. */
  country?: CountryCode;
  /** Handles make small prefectures tappable; off when the map is only a prompt. */
  showHandles?: boolean;
  disabled?: boolean;
  className?: string;
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
  country = "JP",
  showHandles = false,
  disabled = false,
  className,
}: Props) {
  const dataset = GEO_DATASETS[country];
  const box = geoFocusBox(country, focusCodes);
  const { radius, fontSize, stroke } = handleFor(box);
  // Codes are numbers in Japan and letters elsewhere, so key them as text.
  const marksByCode = new Map(marks.map((mark) => [String(mark.code), mark]));
  const wholeCountry = geoBoxIsWholeCountry(country, box);
  const regionByCode = new Map(dataset.regions.map((region) => [String(region.code), region]));
  /*
   * Only Japan draws part of itself in a box. Okinawa in place stretches the
   * frame until the mainland is unreadable; no other country here has an
   * outlying region far enough away to need the same treatment.
   */
  const inset = country === "JP" ? JAPAN_MAP.inset : null;

  return (
    <svg
      viewBox={mapBoxToViewBox(box)}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Map of ${dataset.countryName} by ${dataset.divisionTypeName.toLowerCase()}`}
      className={`h-full w-full ${className ?? ""}`}
    >
      {/* Okinawa is drawn in a box rather than in place, the way Japanese maps
          do. Only Japan has an inset; the others draw everything where it is. */}
      {wholeCountry && inset ? (
        <rect
          x={inset.x}
          y={inset.y}
          width={inset.width}
          height={inset.height}
          className="fill-none stroke-line"
          strokeWidth={stroke * 1.5}
          strokeDasharray={`${stroke * 6} ${stroke * 4}`}
        />
      ) : null}

      {dataset.regions.map((region) => {
        const mark = marksByCode.get(String(region.code));
        return (
          <path
            key={String(region.code)}
            d={region.map.path}
            fillRule="evenodd"
            strokeWidth={stroke}
            strokeLinejoin="round"
            className={`transition-colors ${MAP_TONE_CLASS[mark?.tone ?? MAP_TONES.idle]!.shape}`}
          />
        );
      })}

      {/* Tap targets sit above every path so a small prefecture is as easy to hit
          as Hokkaido, which is what keeps the question about knowing Japan. */}
      {showHandles
        ? marks.map((mark) => {
            const region = regionByCode.get(String(mark.code));
            if (!region) return null;
            const [x, y] = region.map.centroid;
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
                <line
                  x1={x}
                  y1={y}
                  x2={x}
                  y2={y - radius * 2.1}
                  strokeWidth={stroke * 2}
                  className={MAP_TONE_CLASS[mark.tone]!.line}
                />
                <circle
                  cx={x}
                  cy={y - radius * 2.1}
                  r={radius}
                  strokeWidth={stroke * 2}
                  className={MAP_TONE_CLASS[mark.tone]!.handle}
                />
                <text
                  x={x}
                  y={y - radius * 2.1}
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
