"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";

export function usePersistedTab<T extends string>(
  key: string,
  allowed: readonly T[],
  initialValue: T,
): readonly [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initialValue);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) {
      return;
    }

    restoredRef.current = true;
    const persisted = getStoredEnum<T>(key, allowed, initialValue);
    if (persisted === initialValue) {
      return;
    }

    const restoreTimer = window.setTimeout(() => {
      setValue(persisted);
    }, 0);

    return () => {
      window.clearTimeout(restoreTimer);
    };
  }, [allowed, initialValue, key]);

  useEffect(() => {
    if (!restoredRef.current) {
      return;
    }

    setStoredEnum<T>(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
