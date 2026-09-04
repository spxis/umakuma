import { GEO_DATASETS } from "@/lib/geoRegion";
import {
  NATURAL_EARTH_COUNTRIES,
  NATURAL_EARTH_TOTAL_COUNTRIES,
  naturalEarthTierCount,
  type MappedCountryTier,
} from "@/lib/naturalEarthCountries";
import { SOURCE_KEYS, type SourceKey } from "@/lib/sourceCredits";

import { MAPPED_COUNTRIES_COPY } from "./Sources.constants";

const TIER_DOT: Record<MappedCountryTier, string> = {
  public: "bg-emerald-500",
  pilot: "bg-amber-500",
  catalog: "bg-foreground/30",
};

/* A catalogue country wears no badge: the card being plain is the answer. */
const TIER_BADGE: Partial<Record<MappedCountryTier, string>> = {
  public: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  pilot: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

/** The tiers in the order the summary row reads them. */
const TIERS: MappedCountryTier[] = ["public", "pilot", "catalog"];

function Heading({ children }: { children: string }) {
  return <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{children}</h2>;
}

function OneCountry({ flag, name, detail }: { flag: string; name: string; detail: string }) {
  return (
    <section className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-5 shadow-sm">
      <span className="text-4xl leading-none" role="img" aria-label={MAPPED_COUNTRIES_COPY.flagLabel(name)}>
        {flag}
      </span>
      <div>
        <Heading>{MAPPED_COUNTRIES_COPY.heading}</Heading>
        <div className="text-base font-black text-foreground">{name}</div>
        <p className="text-xs font-semibold text-foreground/70">{detail}</p>
      </div>
    </section>
  );
}

/**
 * Which countries a map source drew, under its report.
 *
 * Japan and the United States have one each; Natural Earth has thirty, so it
 * gets a grid saying which tier each sits in - public, an admin pilot, or built
 * and waiting on disk. Every count is asked of the data rather than typed in.
 * The panel read "30 countries" and "25 Catalog" beside a manifest that could
 * answer both, and on an accreditation page a number that has drifted is a
 * false claim about somebody else's work.
 */
export default function MappedCountriesSection({ source }: { source: SourceKey }) {
  if (source === SOURCE_KEYS.jpmap) {
    const dataset = GEO_DATASETS.JP;
    return (
      <OneCountry
        flag="🇯🇵"
        name={MAPPED_COUNTRIES_COPY.japan.name}
        detail={`${MAPPED_COUNTRIES_COPY.regionsOf(dataset.totalRegions, dataset.divisionTypePlural)} · ${MAPPED_COUNTRIES_COPY.japan.detail}`}
      />
    );
  }

  if (source === SOURCE_KEYS.usmap) {
    return (
      <OneCountry
        flag="🇺🇸"
        name={MAPPED_COUNTRIES_COPY.unitedStates.name}
        detail={MAPPED_COUNTRIES_COPY.unitedStates.detail}
      />
    );
  }

  if (source !== SOURCE_KEYS.worldmap) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-3xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
        <div>
          <Heading>{MAPPED_COUNTRIES_COPY.worldHeading}</Heading>
          <p className="mt-0.5 text-sm font-bold text-foreground">
            {MAPPED_COUNTRIES_COPY.worldLede(NATURAL_EARTH_TOTAL_COUNTRIES)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground/60">
          {TIERS.map((tier) => (
            <span
              key={tier}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-black text-foreground"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${TIER_DOT[tier]}`} />
              {naturalEarthTierCount(tier)} {MAPPED_COUNTRIES_COPY.tierSummary[tier]}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
        {NATURAL_EARTH_COUNTRIES.map((country) => {
          const badge = TIER_BADGE[country.tier];
          return (
            <div
              key={country.code}
              className="flex flex-col justify-between rounded-2xl border border-line bg-surface-muted/60 p-2.5 transition hover:border-foreground/20 hover:bg-surface-muted"
            >
              <div className="flex items-start justify-between gap-1.5">
                <span
                  className="text-2xl leading-none"
                  role="img"
                  aria-label={MAPPED_COUNTRIES_COPY.flagLabel(country.name)}
                >
                  {country.flag}
                </span>
                {badge ? (
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${badge}`}>
                    {MAPPED_COUNTRIES_COPY.tierBadge[country.tier]}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 min-w-0">
                <div className="truncate text-xs font-black text-foreground">{country.name}</div>
                <div className="truncate text-[10px] font-semibold text-foreground/60">
                  {MAPPED_COUNTRIES_COPY.regionsOf(country.regions, country.divisionPlural)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
