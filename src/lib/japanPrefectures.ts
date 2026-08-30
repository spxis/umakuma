import mapData from "@/data/japanPrefectures.json";

import { SUBJECT_TYPES } from "@/lib/domainConstants";
import type { GameOption } from "@/lib/gameMode";

export type JapanRegion =
  | "Hokkaido"
  | "Tohoku"
  | "Kanto"
  | "Chubu"
  | "Kansai"
  | "Chugoku"
  | "Shikoku"
  | "Kyushu";

export type JapanPrefecture = {
  /** The official prefecture code, 1 (Hokkaido) to 47 (Okinawa). */
  code: number;
  /** Name without the 県/府/都 suffix, for example 京都. */
  kanji: string;
  /** Name as written on official documents, for example 京都府. */
  kanjiFull: string;
  romaji: string;
  reading: string;
  region: JapanRegion;
  /** True for Okinawa, which is drawn in its own box rather than in place. */
  inset: boolean;
  /** One SVG path covering every ring of the prefecture, in viewBox units. */
  path: string;
  centroid: [number, number];
  /** [minX, minY, maxX, maxY], used to frame the zoom on small prefectures. */
  bbox: [number, number, number, number];
  neighbors: number[];
};

export type JapanMap = {
  source: string;
  viewBox: string;
  width: number;
  height: number;
  inset: { code: number; x: number; y: number; width: number; height: number };
  prefectures: JapanPrefecture[];
};

export const JAPAN_MAP = mapData as JapanMap;

export const JAPAN_PREFECTURES = JAPAN_MAP.prefectures;

export const JAPAN_PREFECTURE_COUNT = JAPAN_PREFECTURES.length;

/**
 * Prefectures are not WaniKani subjects, but Map mode rides on the same run,
 * question and answer tables so it inherits scoring, streaks and the scoreboard
 * unchanged. Their ids live in a reserved range far above any WaniKani subject
 * id, so a prefecture id can never collide with or be mistaken for a real one.
 */
export const MAP_SUBJECT_ID_BASE = 90_000_000;

export function mapSubjectId(code: number): number {
  return MAP_SUBJECT_ID_BASE + code;
}

export function isMapSubjectId(subjectId: number): boolean {
  const code = subjectId - MAP_SUBJECT_ID_BASE;
  return code >= 1 && code <= JAPAN_PREFECTURE_COUNT;
}

export function prefectureCodeFromSubjectId(subjectId: number): number | null {
  return isMapSubjectId(subjectId) ? subjectId - MAP_SUBJECT_ID_BASE : null;
}

const PREFECTURES_BY_CODE = new Map(JAPAN_PREFECTURES.map((entry) => [entry.code, entry]));

export function prefectureByCode(code: number): JapanPrefecture | null {
  return PREFECTURES_BY_CODE.get(code) ?? null;
}

export function prefectureBySubjectId(subjectId: number): JapanPrefecture | null {
  const code = prefectureCodeFromSubjectId(subjectId);
  return code === null ? null : prefectureByCode(code);
}

/**
 * A prefecture in the shape the game engine already speaks.
 *
 * `characters` is the side the map draws, so the existing Find/Read directions
 * carry over untouched: Read puts the map in the prompt and names on the tiles,
 * Find puts the name in the prompt and maps on the tiles. Prefectures are place
 * names, so they ride the vocabulary type and its accent colour.
 */
export function prefectureOption(prefecture: JapanPrefecture): GameOption {
  return {
    subjectId: mapSubjectId(prefecture.code),
    subjectType: SUBJECT_TYPES.vocabulary,
    // Prefectures sit outside the WaniKani level ladder.
    level: 0,
    characters: prefecture.kanji,
    primaryMeaning: prefecture.romaji,
    primaryReading: prefecture.reading,
  };
}

export type MapBox = { x: number; y: number; width: number; height: number };

export const JAPAN_MAP_BOX: MapBox = {
  x: 0,
  y: 0,
  width: JAPAN_MAP.width,
  height: JAPAN_MAP.height,
};

/** How much of the map a focused view covers at its tightest. */
const MIN_FOCUS_SPAN_RATIO = 0.3;
/** Breathing room around the focused prefectures, as a share of their extent. */
const FOCUS_PADDING_RATIO = 0.45;

/**
 * The window to draw when the question is about particular prefectures.
 *
 * Kagawa is a twentieth the width of Hokkaido, so at national scale the small
 * ones are unreadable and the question stops being about knowing Japan. Framing
 * the view on the prefectures in play makes every question equally legible. The
 * minimum span stops a single small prefecture filling the screen with no
 * surrounding coastline to place it against.
 */
export function prefectureFocusBox(codes: number[]): MapBox {
  const framed = codes.flatMap((code) => {
    const prefecture = prefectureByCode(code);
    return prefecture ? [prefecture] : [];
  });
  if (framed.length === 0) return JAPAN_MAP_BOX;

  const minX = Math.min(...framed.map((entry) => entry.bbox[0]));
  const minY = Math.min(...framed.map((entry) => entry.bbox[1]));
  const maxX = Math.max(...framed.map((entry) => entry.bbox[2]));
  const maxY = Math.max(...framed.map((entry) => entry.bbox[3]));

  const padding = Math.max(maxX - minX, maxY - minY) * FOCUS_PADDING_RATIO;
  const minimumSpan = JAPAN_MAP.width * MIN_FOCUS_SPAN_RATIO;
  const width = Math.max(maxX - minX + padding * 2, minimumSpan);
  const height = Math.max(maxY - minY + padding * 2, minimumSpan);
  if (width >= JAPAN_MAP.width && height >= JAPAN_MAP.height) return JAPAN_MAP_BOX;

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  // Keep the window on the map, so a coastal prefecture does not frame open sea.
  return {
    x: Math.min(Math.max(centerX - width / 2, 0), Math.max(0, JAPAN_MAP.width - width)),
    y: Math.min(Math.max(centerY - height / 2, 0), Math.max(0, JAPAN_MAP.height - height)),
    width,
    height,
  };
}

export function mapBoxToViewBox(box: MapBox): string {
  return `${box.x} ${box.y} ${box.width} ${box.height}`;
}

/** True when the box shows the whole country rather than a zoomed-in window. */
export function mapBoxIsWholeCountry(box: MapBox): boolean {
  return box.width >= JAPAN_MAP.width && box.height >= JAPAN_MAP.height;
}

/** How narrow a window has to be before a close-up beside the map earns its place. */
const CLOSE_UP_MAX_WIDTH_RATIO = 0.6;

/**
 * True when a close-up would show meaningfully more than the full map already
 * does. Hokkaido fills a third of the country on its own, so a second panel of
 * almost the same picture would only take space from the board.
 */
export function mapBoxIsZoomed(box: MapBox): boolean {
  return box.width <= JAPAN_MAP.width * CLOSE_UP_MAX_WIDTH_RATIO;
}
