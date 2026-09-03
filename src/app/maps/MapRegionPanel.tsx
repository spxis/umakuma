"use client";


import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import type { GeoRegion } from "@/lib/geoRegion";
import { regionFacts, regionKanji, type FactGroup } from "@/lib/mapStudy";

import type { MapKanjiFacts } from "@/lib/mapRegionKanji";

import type { MapMarkStatus } from "@/lib/mapMarks";

import MapMarkButtons from "./MapMarkButtons";
import type { CountryCode } from "@/lib/geoRegion";

import MapRegionKanji from "./MapRegionKanji";
import MapRegionShape from "./MapRegionShape";
import { MAP_MARK_COPY, MAP_STUDY_COPY } from "./MapStudy.constants";

/**
 * Everything known about one region, laid out to be read.
 *
 * The same facts the Map game asks about, in the order a person would want
 * them: what it is called and where, then what it is known for, then the
 * older things. A prefecture's kanji link to their own pages, because the
 * name is the first place a learner meets those characters.
 */
const HEADING = "text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60";

function Group({ group }: { group: FactGroup }) {
  return (
    <section className="space-y-2">
      <h3 className={HEADING}>{group.heading}</h3>
      {group.facts ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {group.facts.map((row) => (
            <div key={row.label} className="contents">
              <dt className="font-medium text-foreground/60">{row.label}</dt>
              <dd className="font-semibold text-foreground/90">
                {row.value}
                {row.native ? (
                  <span lang="ja" translate="no" className={`ml-1.5 font-semibold text-foreground/70 ${JP_TEXT_CLASS}`}>
                    {row.native}
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {group.items ? (
        <ul className="space-y-1.5 text-sm">
          {group.items.map((item, index) => (
            <li key={item} className="font-medium leading-snug text-foreground/90">
              {item}
              {/* The Japanese on its own line, quieter: a fact and its twin, not one long run. */}
              {group.itemsNative?.[index] ? (
                <span lang="ja" translate="no" className={`mt-0.5 block text-xs text-foreground/60 ${JP_TEXT_CLASS}`}>
                  {group.itemsNative[index]}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export default function MapRegionPanel({
  region,
  onClose,
  kanjiFacts,
  accountId,
  country,
  mark,
}: {
  region: GeoRegion;
  onClose?: () => void;
  /** What each character of the name means and how it reads. */
  kanjiFacts: MapKanjiFacts;
  accountId: string | null;
  /** Which board the region belongs to, for drawing it on its own. */
  country: CountryCode;
  /** What the member has said about this region, and how to change it. */
  mark?: {
    status: MapMarkStatus | null;
    visited: boolean;
    saving: boolean;
    error: string | null;
    onChange: (next: { status: MapMarkStatus | null; visited: boolean }) => void;
  } | null;
}) {
  const kanji = regionKanji(region);
  const groups = regionFacts(region);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-line bg-surface-muted/60 px-5 py-3">
        <div className="min-w-0">
          {region.nameNative && region.nameNative !== region.name ? (
            <p lang="ja" translate="no" className={`text-2xl font-black text-foreground ${JP_TEXT_CLASS}`}>
              {region.nameNative}
              {region.reading ? (
                <span className="ml-2 text-sm font-semibold text-foreground/60">{region.reading}</span>
              ) : null}
            </p>
          ) : null}
          <h2 className="text-lg font-black text-foreground">{region.name}</h2>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/60">
            {region.divisionType} · {region.region}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={MAP_STUDY_COPY.close}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-sm font-black text-foreground/70 transition hover:bg-surface-muted"
          >
            X
          </button>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {/*
          * The shape first, because it is what the map could not show: on the
          * country map Kagawa is four millimetres of grey, so the one thing a
          * map is for is the thing you cannot see.
          */}
        <MapRegionShape country={country} code={region.code} label={region.name} />

        {/*
          * Above the facts, because it is the one thing on this panel the
          * reader does rather than reads - and because a member who has just
          * looked at Iwate and thought "yes, I know that one" should not have
          * to scroll past its rice production to say so.
          */}
        {accountId && mark ? (
          <section className="space-y-1.5">
            <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
              {MAP_MARK_COPY.heading}
            </h3>
            <MapMarkButtons status={mark.status} visited={mark.visited} saving={mark.saving} onChange={mark.onChange} />
            {mark.error ? <p className="text-[11px] font-bold text-rose-600">{MAP_MARK_COPY.failed}</p> : null}
          </section>
        ) : null}

        {kanji.length > 0 ? <MapRegionKanji kanji={kanji} facts={kanjiFacts} accountId={accountId} /> : null}

        {groups.map((group) => (
          <Group key={group.id} group={group} />
        ))}
      </div>
    </div>
  );
}
