/**
 * Countries mapped from Natural Earth's cultural vector datasets.
 *
 * Natural Earth provides admin-1 boundary geometry and topology for Canada
 * and all international regional maps. This lists every mapped country with
 * its national flag, region count, division naming, and rollout tier.
 */

export type MappedCountryTier = "public" | "pilot" | "catalog";

export type MappedCountryInfo = {
  code: string;
  name: string;
  flag: string;
  regions: number;
  /** Bordering pairs inside the country, each counted once. */
  borders: number;
  divisionPlural: string;
  tier: MappedCountryTier;
};

export const NATURAL_EARTH_COUNTRIES: MappedCountryInfo[] = [
  { code: "CA", name: "Canada", flag: "🇨🇦", regions: 13, borders: 18, divisionPlural: "Provinces and territories", tier: "public" },
  { code: "AU", name: "Australia", flag: "🇦🇺", regions: 10, borders: 11, divisionPlural: "States and territories", tier: "pilot" },
  { code: "CN", name: "China", flag: "🇨🇳", regions: 31, borders: 68, divisionPlural: "Provinces and municipalities", tier: "pilot" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼", regions: 21, borders: 33, divisionPlural: "Counties and cities", tier: "pilot" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", regions: 77, borders: 177, divisionPlural: "Provinces", tier: "pilot" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", regions: 24, borders: 45, divisionPlural: "Provinces", tier: "catalog" },
  { code: "AT", name: "Austria", flag: "🇦🇹", regions: 9, borders: 13, divisionPlural: "States", tier: "catalog" },
  { code: "BE", name: "Belgium", flag: "🇧🇪", regions: 11, borders: 20, divisionPlural: "Provinces", tier: "catalog" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", regions: 27, borders: 51, divisionPlural: "States", tier: "catalog" },
  { code: "CL", name: "Chile", flag: "🇨🇱", regions: 16, borders: 16, divisionPlural: "Regions", tier: "catalog" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", regions: 32, borders: 74, divisionPlural: "Departments", tier: "catalog" },
  { code: "FR", name: "France", flag: "🇫🇷", regions: 96, borders: 240, divisionPlural: "Departments", tier: "catalog" },
  { code: "DE", name: "Germany", flag: "🇩🇪", regions: 16, borders: 29, divisionPlural: "States", tier: "catalog" },
  { code: "IE", name: "Ireland", flag: "🇮🇪", regions: 34, borders: 72, divisionPlural: "Counties", tier: "catalog" },
  { code: "IT", name: "Italy", flag: "🇮🇹", regions: 110, borders: 247, divisionPlural: "Provinces", tier: "catalog" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", regions: 16, borders: 20, divisionPlural: "States and federal territories", tier: "catalog" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", regions: 32, borders: 69, divisionPlural: "States", tier: "catalog" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", regions: 12, borders: 23, divisionPlural: "Provinces", tier: "catalog" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", regions: 17, borders: 23, divisionPlural: "Regions", tier: "catalog" },
  { code: "NO", name: "Norway", flag: "🇳🇴", regions: 21, borders: 31, divisionPlural: "Counties", tier: "catalog" },
  { code: "PE", name: "Peru", flag: "🇵🇪", regions: 26, borders: 54, divisionPlural: "Departments", tier: "catalog" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", regions: 80, borders: 113, divisionPlural: "Provinces", tier: "catalog" },
  { code: "PL", name: "Poland", flag: "🇵🇱", regions: 16, borders: 34, divisionPlural: "Voivodeships", tier: "catalog" },
  { code: "RU", name: "Russia", flag: "🇷🇺", regions: 86, borders: 190, divisionPlural: "Federal subjects", tier: "catalog" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", regions: 17, borders: 26, divisionPlural: "Provinces and cities", tier: "catalog" },
  { code: "ES", name: "Spain", flag: "🇪🇸", regions: 52, borders: 111, divisionPlural: "Provinces", tier: "catalog" },
  { code: "SE", name: "Sweden", flag: "🇸🇪", regions: 21, borders: 40, divisionPlural: "Counties", tier: "catalog" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", regions: 26, borders: 57, divisionPlural: "Cantons", tier: "catalog" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", regions: 232, borders: 553, divisionPlural: "Administrative divisions", tier: "catalog" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", regions: 63, borders: 133, divisionPlural: "Provinces and municipalities", tier: "catalog" },
];

export const NATURAL_EARTH_TOTAL_REGIONS = NATURAL_EARTH_COUNTRIES.reduce(
  (sum, country) => sum + country.regions,
  0,
);

export const NATURAL_EARTH_TOTAL_COUNTRIES = NATURAL_EARTH_COUNTRIES.length;

export const NATURAL_EARTH_TOTAL_BORDERS = NATURAL_EARTH_COUNTRIES.reduce(
  (sum, country) => sum + country.borders,
  0,
);

/** How many of the thirty are public, in a pilot, or waiting on disk. */
export function naturalEarthTierCount(tier: MappedCountryTier): number {
  return NATURAL_EARTH_COUNTRIES.filter((country) => country.tier === tier).length;
}
