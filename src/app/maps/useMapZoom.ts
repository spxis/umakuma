"use client";

import { useCallback, useRef, useState } from "react";

import {
  MAP_ZOOM_LEVELS,
  geoBoxCentre,
  geoRegionCentre,
  geoWholeCountryBox,
  geoZoomBox,
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
export function useMapZoom(country: CountryCode) {
  const [zoom, setZoom] = useState<MapZoom>(MAP_ZOOM_LEVELS[0]);
  const [centre, setCentre] = useState(() => geoBoxCentre(geoWholeCountryBox(country)));
  const dragging = useRef<{ pointerId: number; x: number; y: number; scale: number } | null>(null);

  const box: MapBox = geoZoomBox(country, zoom, centre);
  const zoomed = zoom > 1;

  /** Back to the whole country, which is where the map starts. */
  const reset = useCallback(() => {
    setZoom(MAP_ZOOM_LEVELS[0]);
    setCentre(geoBoxCentre(geoWholeCountryBox(country)));
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
      const move = (dx: number, dy: number) => setCentre((at) => ({ x: at.x + dx, y: at.y + dy }));

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
      ...(zoomed
        ? { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, className: "cursor-grab touch-none" }
        : {}),
    },
  };
}

export type MapZoomControl = ReturnType<typeof useMapZoom>;
