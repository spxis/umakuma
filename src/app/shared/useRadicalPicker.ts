"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  RADICAL_GRID_DEFAULT,
  radicalGridSizeServerSnapshot,
  radicalGridSizeSnapshot,
  setRadicalGridSize,
  stepRadicalGridSize,
  subscribeRadicalGridSize,
  type RadicalGridSize,
} from "@/lib/radicalGridSize";
import type { RadicalGroup } from "@/lib/radicalSearch";

/**
 * The picker's state, held once and drawn in two places.
 *
 * The controls belong on the options row under the input, beside Add to lists,
 * and the grid belongs under that row - so the two halves are rendered by
 * different components and must not each keep their own idea of what has been
 * picked. The state lives here and both read it.
 *
 * It holds no selection of its own either: the chosen radicals are in the
 * search box as `:radicals 日 + 月`, this asks the server what that means, and
 * a pick rewrites the box.
 */
type Result = {
  groups: RadicalGroup[];
  chosen: string[];
  usable: string[];
};

const EMPTY: Result = { groups: [], chosen: [], usable: [] };

export type RadicalPicker = {
  groups: RadicalGroup[];
  /** What the server made of what was typed; a name resolves to a character. */
  picked: string[];
  usable: Set<string>;
  failed: boolean;
  size: RadicalGridSize;
  resize: (by: 1 | -1) => void;
  resetSize: () => void;
  toggle: (radical: string) => void;
  clear: () => void;
};

export function useRadicalPicker(
  tokens: readonly string[],
  onChange: (next: string[]) => void,
  /* Every box mounts this; only the one holding a command should ask. */
  enabled = true,
): RadicalPicker {
  const [result, setResult] = useState<Result>(EMPTY);
  const [failed, setFailed] = useState(false);
  const key = tokens.join(",");

  const size = useSyncExternalStore(
    subscribeRadicalGridSize,
    radicalGridSizeSnapshot,
    radicalGridSizeServerSnapshot,
  );

  useEffect(() => {
    if (!enabled) return;

    let live = true;
    const query = key.length > 0 ? `?radicals=${encodeURIComponent(key)}` : "";
    fetch(`/api/radicals${query}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("failed"))))
      .then((data: Result) => {
        if (!live) return;
        setResult(data);
        setFailed(false);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [enabled, key]);

  const picked = result.chosen;

  return {
    groups: result.groups,
    picked,
    usable: new Set(result.usable),
    failed,
    size,
    resize: (by) => setRadicalGridSize(stepRadicalGridSize(size, by)),
    resetSize: () => setRadicalGridSize(RADICAL_GRID_DEFAULT),
    toggle: (radical) =>
      onChange(picked.includes(radical) ? picked.filter((one) => one !== radical) : [...picked, radical]),
    clear: () => onChange([]),
  };
}
