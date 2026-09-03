"use client";

import { useState } from "react";

import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { LIST_STANDINGS, type ListStanding, type MemberStandings } from "@/lib/listProgress";

/**
 * Who on this list knows what.
 *
 * The family use, and the reason for sharing a list at all: a parent wants to
 * see who has this week's kanji down and who needs a hand, without opening
 * five profiles. One bar per member, in order of how far along they are, so
 * the person who needs help is at the bottom where they are easy to find.
 *
 * Closed by default. It answers a question somebody comes to the page to ask,
 * not one the page should ask on their behalf every time they open a list to
 * read it.
 */

const TONE: Record<ListStanding, string> = {
  [LIST_STANDINGS.known]: "bg-emerald-500",
  [LIST_STANDINGS.learning]: "bg-amber-400",
  [LIST_STANDINGS.none]: "bg-line",
};

const LEGEND: ListStanding[] = [LIST_STANDINGS.known, LIST_STANDINGS.learning, LIST_STANDINGS.none];

export default function ListProgressPanel({
  members,
  trackable,
  untracked,
}: {
  members: MemberStandings[];
  trackable: number;
  untracked: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-line bg-surface">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
      >
        <span className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
          {STUDY_LIST_COPY.progressHeading}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
          {open ? STUDY_LIST_COPY.progressHide : STUDY_LIST_COPY.progressShow}
        </span>
      </button>

      {open ? (
        <div className="space-y-2 border-t border-line px-4 py-3">
          <ul className="space-y-2">
            {members.map((member) => (
              <li key={member.accountId} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-xs font-black text-foreground" title={member.name}>
                  {member.name}
                </span>
                {/*
                  * One bar, three runs, in the order somebody reads progress:
                  * what is done, what is under way, what has not been started.
                  */}
                <span className="flex h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
                  {LEGEND.map((standing) =>
                    member.counts[standing] > 0 ? (
                      <span
                        key={standing}
                        className={TONE[standing]}
                        style={{ width: `${(member.counts[standing] / trackable) * 100}%` }}
                      />
                    ) : null,
                  )}
                </span>
                <span className="w-24 shrink-0 text-right text-[11px] font-semibold text-foreground/60">
                  {member.counts.known} {STUDY_LIST_COPY.progressOf} {trackable}
                </span>
              </li>
            ))}
          </ul>

          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/60">
            {LEGEND.map((standing) => (
              <span key={standing} className="inline-flex items-center gap-1.5">
                <span className={`inline-block h-2 w-2 rounded-full ${TONE[standing]}`} />
                {STUDY_LIST_COPY.progressLabels[standing]}
              </span>
            ))}
            {/*
              * Said rather than counted against anybody. A list may hold a word
              * WaniKani never taught, and nobody has a stage for it - marking
              * every member down for an item none of them can be marked up for
              * would make a shared list look worse the more of it was typed by
              * hand.
              */}
            {untracked > 0 ? (
              <span className="normal-case tracking-normal text-foreground/60">
                {STUDY_LIST_COPY.progressUntracked(untracked)}
              </span>
            ) : null}
          </p>
        </div>
      ) : null}
    </section>
  );
}
