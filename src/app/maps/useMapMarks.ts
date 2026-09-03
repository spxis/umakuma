"use client";

import { useCallback, useEffect, useState } from "react";

import { markFor, type MapMarkIndex, type MapMarkStatus } from "@/lib/mapMarks";

/**
 * The member's marks for the country on screen.
 *
 * Fetched per country rather than per region: the map paints all 47 at once,
 * so asking region by region would be 47 requests to draw one picture. Held
 * here rather than on the server render because the country changes without a
 * page load.
 *
 * Written through and shown at once, with the old value put back if the server
 * disagrees - the same shape the filing column uses, and for the same reason:
 * marking a prefecture known should feel like pressing a button, not like
 * submitting a form.
 */
export function useMapMarks(accountId: string | null, country: string) {
  const [marks, setMarks] = useState<MapMarkIndex>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /*
     * Nothing to fetch and nothing to clear: with no account the marks are
     * empty by construction below, so this returns rather than setting state
     * in an effect - which is the rule, and which would also have re-rendered
     * every visitor once for no reason.
     */
    if (!accountId) return undefined;
    let cancelled = false;
    void fetch(`/api/maps/${accountId}/marks?country=${encodeURIComponent(country)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { marks?: MapMarkIndex };
        if (!cancelled) setMarks(body.marks ?? {});
      })
      .catch(() => {
        /* A map that will not load its marks is still a map worth reading. */
        if (!cancelled) setMarks({});
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, country]);

  const setMark = useCallback(
    (region: string | number, next: { status: MapMarkStatus | null; visited: boolean }) => {
      if (!accountId) return;
      const key = String(region);
      const before = markFor(marks, key);
      setMarks((current) => ({ ...current, [key]: next }));
      setSaving(true);
      setError(null);

      void fetch(`/api/maps/${accountId}/marks`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ country, region: key, status: next.status, visited: next.visited }),
      })
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status));
        })
        .catch(() => {
          setMarks((current) => ({ ...current, [key]: before }));
          setError("failed");
        })
        .finally(() => setSaving(false));
    },
    [accountId, country, marks],
  );

  /* A visitor has no marks, whatever a previous account left behind. */
  return { marks: accountId ? marks : {}, setMark, saving, error };
}
