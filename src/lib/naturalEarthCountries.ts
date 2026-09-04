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
  divisionPlural: string;
  tier: MappedCountryTier;
};

export const NATURAL_EARTH_COUNTRIES: MappedCountryInfo[] = [
  { code: "CA", name: "Canada", flag: "🇨🇦", regions: 13, divisionPlural: "Provinces and territories", tier: "public" },
  { code: "AU", name: "Australia", flag: "🇦🇺", regions: 10, divisionPlural: "States and territories", tier: "pilot" },
  { code: "CN", name: "China", flag: "🇨🇳", regions: 31, divisionPlural: "Provinces and municipalities", tier: "pilot" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼", regions: 21, divisionPlural: "Counties and cities", tier: "pilot" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", regions: 77, divisionPlural: "Provinces", tier: "pilot" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", regions: 24, divisionPlural: "Provinces", tier: "catalog" },
  { code: "AT", name: "Austria", flag: "🇦🇹", regions: 9, divisionPlural: "States", tier: "catalog" },
  { code: "BE", name: "Belgium", flag: "🇧🇪", regions: 11, divisionPlural: "Provinces", tier: "catalog" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", regions: 27, divisionPlural: "States", tier: "catalog" },
  { code: "CL", name: "Chile", flag: "🇨🇱", regions: 16, divisionPlural: "Regions", tier: "catalog" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", regions: 32, divisionPlural: "Departments", tier: "catalog" },
  { code: "FR", name: "France", flag: "🇫🇷", regions: 96, divisionPlural: "Departments", tier: "catalog" },
  { code: "DE", name: "Germany", flag: "🇩🇪", regions: 16, divisionPlural: "States", tier: "catalog" },
  { code: "IE", name: "Ireland", flag: "🇮🇪", regions: 34, divisionPlural: "Counties", tier: "catalog" },
  { code: "IT", name: "Italy", flag: "🇮🇹", regions: 110, divisionPlural: "Provinces", tier: "catalog" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", regions: 16, divisionPlural: "States and federal territories", tier: "catalog" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", regions: 32, divisionPlural: "States", tier: "catalog" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", regions: 12, divisionPlural: "Provinces", tier: "catalog" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", regions: 17, divisionPlural: "Regions", tier: "catalog" },
  { code: "NO", name: "Norway", flag: "🇳🇴", regions: 21, divisionPlural: "Counties", tier: "catalog" },
  { code: "PE", name: "Peru", flag: "🇵🇪", regions: 26, divisionPlural: "Departments", tier: "catalog" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", regions: 80, divisionPlural: "Provinces", tier: "catalog" },
  { code: "PL", name: "Poland", flag: "🇵🇱", regions: 16, divisionPlural: "Voivodeships", tier: "catalog" },
  { code: "RU", name: "Russia", flag: "🇷🇺", regions: 86, divisionPlural: "Federal subjects", tier: "catalog" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", regions: 17, divisionPlural: "Provinces and cities", tier: "catalog" },
  { code: "ES", name: "Spain", flag: "🇪🇸", regions: 52, divisionPlural: "Provinces", tier: "catalog" },
  { code: "SE", name: "Sweden", flag: "🇸🇪", regions: 21, divisionPlural: "Counties", tier: "catalog" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", regions: 26, divisionPlural: "Cantons", tier: "catalog" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", regions: 232, divisionPlural: "Administrative divisions", tier: "catalog" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", regions: 63, divisionPlural: "Provinces and municipalities", tier: "catalog" },
];

export const NATURAL_EARTH_TOTAL_REGIONS = NATURAL_EARTH_COUNTRIES.reduce(
  (sum, country) => sum + country.regions,
  0,
);

export const NATURAL_EARTH_TOTAL_COUNTRIES = NATURAL_EARTH_COUNTRIES.length;
