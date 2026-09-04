"use client";

import { useCallback, useRef, useState } from "react";

import {
  MAP_ZOOM_LEVELS,
  geoBoxCentre,
  geoRegionCentre,
  geoWholeCountryBox,
  geoZoomBox,
  geoZoomToFit,
  stepMapZoom,
  type MapZoom,
} from "@/lib/geoMapFraming";
import type { CountryCode } from "@/lib/geoRegion";
import type { MapBox } from "@/lib/japanPrefectures";

import { MAP_ZOOM_COPY } from "./MapStudy.constants";

/** How far one arrow press moves the view, as a share of what is on screen. */
const PAN_STEP_RATIO = 0.15;

/**
 * Zooming and panning the study map.
 *
 * Kanto is eight prefectures inside a thumbnail, and on a whole-country map
 * Saitama and Gunma are a few pixels of the same grey. Zooming is the only way
 * to tell them apart, and once zoomed the reader has to be able to get to the
 * bit they wanted - so the two come together.
 *
 * The drag is in map units, not pixels: the SVG scales to whatever width the
 * card has, so a hundred pixels is a different distance on a phone and a
 * desktop. Converting through the rendered rectangle keeps the map moving
 * exactly with the finger.
 */
export function useMapZoom(
  country: CountryCode,
  startOn: string | number | null = null,
  /** A region opened by its address: framed from the first paint, not after. */
  startOnCodes: ReadonlyArray<string | number> = [],
) {
  /*
   * Where the map starts. A page opened at `/maps/japan/region/tohoku` opens
   * on Tohoku, already zoomed to it; one opened at `/maps/japan/kagoshima` is
   * centred on Kagoshima so zooming goes closer there rather than at the
   * middle of the country. Only the starting values: after that the view is
   * the reader's, and panning must not be overridden.
   */
  const [start] = useState(() =>
    startOnCodes.length > 0
      ? geoZoomToFit(country, startOnCodes)
      : {
          zoom: MAP_ZOOM_LEVELS[0] as MapZoom,
          centre: geoRegionCentre(country, startOn) ?? geoBoxCentre(geoWholeCountryBox(country)),
        },
  );
  const [zoom, setZoom] = useState<MapZoom>(start.zoom);
  const [centre, setCentre] = useState(start.centre);
  /*
   * A fit is allowed to overhang the map so the region it framed sits in the
   * middle; a pan is not, so a drag never runs off into open sea. Opening a
   * region turns the clamp off, and the first move the reader makes turns it
   * back on - see `geoZoomBox`.
   */
  const [clamp, setClamp] = useState(startOnCodes.length === 0);
  const dragging = useRef<{ pointerId: number; x: number; y: number; scale: number } | null>(null);

  const box: MapBox = geoZoomBox(country, zoom, centre, clamp);
  const zoomed = zoom > 1;

  /** Back to the whole country, which is where the map starts. */
  const reset = useCallback(() => {
    setZoom(MAP_ZOOM_LEVELS[0]);
    setCentre(geoBoxCentre(geoWholeCountryBox(country)));
    setClamp(true);
  }, [country]);

  /*
   * Zooming keeps looking at whatever is in the middle, rather than jumping
   * to the centre of the country: a reader who has panned to Kyushu and then
   * zooms in means "closer at Kyushu".
   */
  const step = useCallback((by: 1 | -1) => {
    setZoom((current) => stepMapZoom(current, by));
  }, []);

  /** Zoom to a region, for a choice made from the list rather than the map. */
  const focusRegion = useCallback(
    (code: string | number | null) => {
      const found = geoRegionCentre(country, code);
      if (found) setCentre(found);
    },
    [country],
  );

  /** Frame a whole region - Tohoku, the Prairies - opened from its heading. */
  const focusCodes = useCallback(
    (codes: ReadonlyArray<string | number>) => {
      const fit = geoZoomToFit(country, codes);
      setCentre(fit.centre);
      setZoom(fit.zoom);
      setClamp(false);
    },
    [country],
  );

  /*
   * Double-click goes in one step closer, on what was double-clicked.
   *
   * The gesture everybody already knows from every other map. It steps rather
   * than jumping to 3x, so a second double-click keeps going and the reader
   * ends up where they were heading; at the last step it re-centres without
   * zooming, which is still what they asked for - that region, in the middle.
   */
  const zoomInto = useCallback(
    (code: string | number) => {
      const found = geoRegionCentre(country, code);
      if (found) setCentre(found);
      setZoom((current) => stepMapZoom(current, 1));
    },
    [country],
  );

  /**
   * Zoom where the pointer is, keeping that spot under it.
   *
   * Double-clicking a region used to re-centre the map on that region's
   * middle, which threw the map sideways: you asked to look closer at the
   * coast and the whole country slid so a centroid you cannot see could sit in
   * the middle. This keeps the point you double-clicked exactly where it was
   * and grows the map around it, which is what every other map does and the
   * only thing that makes a second double-click land where you expect.
   *
   * Hold Alt (Option) to go the other way, so the gesture reverses without
   * reaching for the buttons.
   */
  const zoomAtPoint = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const towards: 1 | -1 = event.altKey || event.shiftKey ? -1 : 1;
      const next = stepMapZoom(zoom, towards);
      if (next === zoom) return;

      /* Where the pointer is in the map's own coordinates, and how far across
         the drawn window that is - the fraction is what has to stay put. */
      const fx = (event.clientX - rect.left) / rect.width;
      const fy = (event.clientY - rect.top) / rect.height;
      const mapX = box.x + fx * box.width;
      const mapY = box.y + fy * box.height;

      const whole = geoWholeCountryBox(country);
      const nextWidth = whole.width / next;
      const nextHeight = whole.height / next;

      setZoom(next);
      setCentre({ x: mapX + nextWidth * (0.5 - fx), y: mapY + nextHeight * (0.5 - fy) });
      /* A deliberate move, so the map is held inside its own edges again. */
      setClamp(true);
    },
    [box.height, box.width, box.x, box.y, country, zoom],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!zoomed || event.button !== 0) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (rect.width === 0) return;
      /* Map units per pixel, so the drag tracks the finger at any card width. */
      dragging.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, scale: box.width / rect.width };
    },
    [box.width, zoomed],
  );

  const onPointerMove = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragging.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = (event.clientX - drag.x) * drag.scale;
    const dy = (event.clientY - drag.y) * drag.scale;
    if (dx === 0 && dy === 0) return;
    dragging.current = { ...drag, x: event.clientX, y: event.clientY };
    setClamp(true);
    /* Dragging right moves the map right, which means looking further left. */
    setCentre((current) => ({ x: current.x - dx, y: current.y - dy }));
  }, []);

  const endDrag = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (dragging.current?.pointerId === event.pointerId) dragging.current = null;
  }, []);

  /*
   * The same map, without a mouse.
   *
   * Dragging is the obvious way to move a zoomed map and it is not the only
   * way anybody moves one: the arrows are what a keyboard reaches for, and a
   * map you can zoom but not pan from the keyboard is a map that traps you at
   * whatever the zoom button happened to frame. `+`, `-` and `0` are the
   * bindings every other map on the web uses, so they cost nothing to learn.
   */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<SVGSVGElement>) => {
      const nudge = box.width * PAN_STEP_RATIO;
      const move = (dx: number, dy: number) => {
        setClamp(true);
        setCentre((at) => ({ x: at.x + dx, y: at.y + dy }));
      };

      switch (event.key) {
        case "ArrowLeft":
          move(-nudge, 0);
          break;
        case "ArrowRight":
          move(nudge, 0);
          break;
        case "ArrowUp":
          move(0, -nudge);
          break;
        case "ArrowDown":
          move(0, nudge);
          break;
        case "+":
        case "=":
          step(1);
          break;
        case "-":
        case "_":
          step(-1);
          break;
        case "0":
          reset();
          break;
        default:
          return;
      }
      /* Only once a key is one of ours: the page still scrolls otherwise. */
      event.preventDefault();
    },
    [box.width, reset, step],
  );

  return {
    zoom,
    zoomed,
    box,
    reset,
    step,
    focusRegion,
    focusCodes,
    zoomInto,
    zoomAtPoint,
    /*
     * Spread onto the SVG. `touch-none` is what stops a drag on a phone
     * scrolling the page instead of moving the map.
     */
    /*
     * Always focusable, so `+` reaches the map before anything is zoomed;
     * the drag handlers and `touch-none` only matter once it is.
     */
    panProps: {
      tabIndex: 0,
      onKeyDown,
      "aria-label": MAP_ZOOM_COPY.canvasLabel,
      /* Anywhere on the map, not only on a region: the sea between islands and
         the gap between provinces are places a reader points at too. */
      onDoubleClick: zoomAtPoint,
      ...(zoomed
        ? { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, className: "cursor-grab touch-none" }
        : {}),
    },
  };
}

export type MapZoomControl = ReturnType<typeof useMapZoom>;
