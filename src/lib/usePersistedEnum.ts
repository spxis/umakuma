"use client";

import { useCallback, useEffect, useState } from "react";

import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";

/**
 * A stored choice, adopted after the first paint rather than during it.
 *
 * **The fallback is what renders first, always.** Seeding `useState` from
 * `localStorage` looks like the obvious thing and is a hydration bug: the
 * initialiser does not run on the server, so the server renders the fallback
 * and the client's first render - which *is* hydration - renders the stored
 * value. React finds the two do not match, logs "Hydration failed because the
 * server rendered HTML didn't match", and throws the whole tree away and
 * re-renders it. Every load, for anybody who had ever changed the setting.
 *
 * So the stored value is adopted in an effect, which runs after hydration has
 * succeeded. The cost is one extra render and a frame of the default; the
 * alternative was a discarded tree and a console full of errors.
 *
 * Reads are wrapped by `getStoredEnum`, which returns the fallback for a
 * missing key, an unrecognised value, or a browser that refuses storage - so a
 * private window gets the default rather than a crash.
 */
export function usePersistedEnum<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    setValue(getStoredEnum(key, allowed, fallback));
    /* `allowed` is a literal array at every call site, so a new identity each
       render; depending on it would re-read forever. The key and the fallback
       are what actually decide the answer. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fallback]);

  const store = useCallback(
    (next: T) => {
      setValue(next);
      setStoredEnum(key, next);
    },
    [key],
  );

  return [value, store];
}
