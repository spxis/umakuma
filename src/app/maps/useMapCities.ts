"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getStoredEnum, getStoredFlagOneIsTrue, setStoredBooleanFlag, setStoredEnum } from "@/lib/clientStorage";
import {
  CITY_DENSITIES,
  citiesAtDensity,
  cityDensityCounts,
  hasCities,
  isCityDensity,
  type CityDensity,
  type MapCity,
} from "@/lib/geoCities";
import type { CountryCode } from "@/lib/geoRegion";

/**
 * Whether the map is drawing cities, and how many of them.
 *
 * Both choices are the reader's and both are remembered per browser, but
 * neither is read during render. `usePersistedBoolean` seeds its state from
 * localStorage inside the useState initialiser, which is safe only while the
 * stored value agrees with the default - the mark layers default to on and
 * mostly do. Cities default to off, so the first reader who turned them on and
 * came back got a server paint saying off and a client paint saying on, and
 * React threw a hydration mismatch. Reading after mount costs one extra paint
 * and cannot disagree with the markup that was sent.
 */
export type MapCitiesState = {
  /** Whether this country has a city layer at all. */
  available: boolean;
  shown: boolean;
  toggle: () => void;
  density: CityDensity;
  chooseDensity: (next: CityDensity) => void;
  counts: Record<CityDensity, number>;
  /** What the map should draw: empty unless the layer is on. */
  cities: MapCity[];
};

export function useMapCities(country: CountryCode): MapCitiesState {
  const available = hasCities(country);
  const [shown, setShown] = useState(false);
  const [density, setDensity] = useState<CityDensity>("major");

  useEffect(() => {
    /*
     * Setting state in an effect is usually the wrong shape, and here it is
     * the only right one: localStorage does not exist while the server renders,
     * so the value cannot be known until after mount. Reading it in the
     * useState initialiser instead - which is what `usePersistedBoolean` does -
     * makes the first client paint disagree with the markup React sent, and
     * React throws a hydration mismatch. One extra paint is the price.
     */
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above: the store is browser-only
    setShown(getStoredFlagOneIsTrue("maps.cities.shown", false));
    setDensity(getStoredEnum("maps.cities.density", CITY_DENSITIES, "major"));
  }, []);

  const toggle = useCallback(() => {
    setShown((on) => {
      setStoredBooleanFlag("maps.cities.shown", !on);
      return !on;
    });
  }, []);

  const chooseDensity = useCallback((next: CityDensity) => {
    if (!isCityDensity(next)) return;
    setDensity(next);
    setStoredEnum("maps.cities.density", next);
  }, []);

  const counts = useMemo(() => cityDensityCounts(country), [country]);
  const cities = useMemo(
    () => (available && shown ? citiesAtDensity(country, density) : []),
    [available, shown, country, density],
  );

  return { available, shown, toggle, density, chooseDensity, counts, cities };
}
