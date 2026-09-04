import { SOURCE_KEYS, type SourceKey } from "@/lib/sourceCredits";
import { NATURAL_EARTH_COUNTRIES } from "@/lib/naturalEarthCountries";

function Heading({ children }: { children: string }) {
  return <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{children}</h2>;
}

/**
 * Presentation card displaying the countries and territorial flags mapped
 * from geographic data sources.
 */
export default function MappedCountriesSection({ source }: { source: SourceKey }) {
  if (source === SOURCE_KEYS.jpmap) {
    return (
      <section className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <span className="text-4xl leading-none" role="img" aria-label="Japan flag">
          🇯🇵
        </span>
        <div>
          <Heading>Mapped Country</Heading>
          <div className="text-base font-black text-foreground">Japan (日本)</div>
          <p className="text-xs font-semibold text-foreground/70">
            47 prefectures · Outlines provided by Global Map Japan (GSI)
          </p>
        </div>
      </section>
    );
  }

  if (source === SOURCE_KEYS.usmap) {
    return (
      <section className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <span className="text-4xl leading-none" role="img" aria-label="United States flag">
          🇺🇸
        </span>
        <div>
          <Heading>Mapped Country</Heading>
          <div className="text-base font-black text-foreground">United States</div>
          <p className="text-xs font-semibold text-foreground/70">
            50 states and the District of Columbia · Cartographic boundary TopoJSON from U.S. Census Bureau
          </p>
        </div>
      </section>
    );
  }

  if (source !== SOURCE_KEYS.worldmap) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-3xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
        <div>
          <Heading>Countries mapped from Natural Earth</Heading>
          <p className="mt-0.5 text-sm font-bold text-foreground">
            30 countries and administrative divisions with full boundary geometry
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground/60">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-black text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            1 Public
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-black text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            4 Admin pilot
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-black text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground/30" />
            25 Catalog
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
        {NATURAL_EARTH_COUNTRIES.map((country) => (
          <div
            key={country.code}
            className="flex flex-col justify-between rounded-2xl border border-line bg-surface-muted/60 p-2.5 transition hover:border-foreground/20 hover:bg-surface-muted"
          >
            <div className="flex items-start justify-between gap-1.5">
              <span className="text-2xl leading-none" role="img" aria-label={`${country.name} flag`}>
                {country.flag}
              </span>
              {country.tier === "public" ? (
                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Public
                </span>
              ) : country.tier === "pilot" ? (
                <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Pilot
                </span>
              ) : null}
            </div>
            <div className="mt-2 min-w-0">
              <div className="truncate text-xs font-black text-foreground">{country.name}</div>
              <div className="truncate text-[10px] font-semibold text-foreground/60">
                {country.regions} {country.divisionPlural.toLowerCase()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
