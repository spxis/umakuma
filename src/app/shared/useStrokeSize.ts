"use client";

import { useSyncExternalStore } from "react";

import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";
import { STROKE_SIZE_STORAGE_KEY, STROKE_SIZE_VALUES, type StrokeSize } from "./strokeAnimationCopy";

/**
 * How big the drawing is, shared by everything around it.
 *
 * The choice used to live inside the animation, which was fine while it only
 * changed the animation. It does more than that now: at the largest size the
 * printed faces beside the drawing step out of its way, and those are drawn by
 * the panel rather than by the animation - so the two have to read one value.
 *
 * Through a store rather than into state after mount, so the server's markup
 * and the first client render agree.
 */
const DEFAULT: StrokeSize = "medium";

const listeners = new Set<() => void>();

let snapshot: StrokeSize = DEFAULT;
let read = false;

export function subscribeStrokeSize(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function currentSize(): StrokeSize {
  if (!read) {
    snapshot = getStoredEnum(STROKE_SIZE_STORAGE_KEY, STROKE_SIZE_VALUES, DEFAULT);
    read = true;
  }
  return snapshot;
}

function serverSize(): StrokeSize {
  return DEFAULT;
}

export function setStrokeSize(size: StrokeSize): void {
  snapshot = size;
  read = true;
  setStoredEnum(STROKE_SIZE_STORAGE_KEY, size);
  for (const listener of listeners) listener();
}

export function useStrokeSize(): StrokeSize {
  return useSyncExternalStore(subscribeStrokeSize, currentSize, serverSize);
}
