const FLAG_TRUE = "1";
const FLAG_FALSE = "0";

export function getLocalStorageItem(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setLocalStorageItem(key: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors in restricted browsing modes.
  }
}

export function getStoredFlagOneIsTrue(key: string, defaultValue = false): boolean {
  const value = getLocalStorageItem(key);
  if (value === null) {
    return defaultValue;
  }

  return value === FLAG_TRUE;
}

export function getStoredFlagZeroIsFalse(key: string, defaultValue = true): boolean {
  const value = getLocalStorageItem(key);
  if (value === null) {
    return defaultValue;
  }

  return value !== FLAG_FALSE;
}

export function setStoredBooleanFlag(key: string, value: boolean): void {
  setLocalStorageItem(key, value ? FLAG_TRUE : FLAG_FALSE);
}

export function getStoredEnum<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = getLocalStorageItem(key);
  return value && allowed.includes(value as T) ? (value as T) : fallback;
}

export function setStoredEnum<T extends string>(key: string, value: T): void {
  setLocalStorageItem(key, value);
}

export function getStoredPositiveInt(key: string): number | null {
  const value = getLocalStorageItem(key);
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function getStoredJson<T>(key: string, fallback: T): T {
  const raw = getLocalStorageItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setStoredJson(key: string, value: unknown): void {
  setLocalStorageItem(key, JSON.stringify(value));
}

/**
 * The same pair for `sessionStorage`, for state that belongs to a sitting.
 *
 * A half-built selection is not a preference: it is a task somebody is in the
 * middle of, and it should survive turning to page two and not survive next
 * week. `localStorage` would keep it for months and hand it back out of
 * nowhere; a session ends when the tab does.
 */
export function getSessionItem(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setSessionItem(key: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage errors in restricted browsing modes.
  }
}

export function getSessionJson<T>(key: string, fallback: T): T {
  const raw = getSessionItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setSessionJson(key: string, value: unknown): void {
  setSessionItem(key, JSON.stringify(value));
}
