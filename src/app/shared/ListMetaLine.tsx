import { STUDY_LIST_COPY } from "./studyListCopy";
import { formatRelativeFromNow } from "@/lib/timeFormat";

import type { ListMetaFacts } from "./listMeta.types";

/**
 * What a list says about itself, before anybody opens it.
 *
 * A list card said one thing - "Updated 3 days ago" - and a reader deciding
 * whether a shared list is worth their time had nothing else to go on: not how
 * big it is, not whether it is still being added to, not whether anybody else
 * kept it. Those are the facts that answer "is this any good", and they are the
 * same facts wherever a list is described, so they are drawn in one place.
 *
 * A fact that is absent is left out rather than printed as a zero. "copied 0
 * times" is a sentence about failure; a list nobody has copied yet simply does
 * not mention copying.
 */
/**
 * "copied 3 times", "shared once" - and nothing at all for a count of zero.
 *
 * The list page had this phrasing already and the card had none of it. One
 * vocabulary rather than two, so a list does not describe itself one way on
 * its card and another on its page.
 */
function timesText(count: number, verb: string): string | null {
  if (count <= 0) return null;
  return `${verb} ${count === 1 ? STUDY_LIST_COPY.onceSuffix : `${count} ${STUDY_LIST_COPY.timesSuffix}`}`;
}

export default function ListMetaLine({ facts, className = "" }: { facts: ListMetaFacts; className?: string }) {
  const parts = [
    typeof facts.itemCount === "number"
      ? `${facts.itemCount} ${facts.itemCount === 1 ? STUDY_LIST_COPY.countSuffixOne : STUDY_LIST_COPY.countSuffix}`
      : null,
    facts.ownerName ? `${STUDY_LIST_COPY.by} ${facts.ownerName}` : null,
    facts.createdAt ? `${STUDY_LIST_COPY.created} ${formatRelativeFromNow(facts.createdAt)}` : null,
    facts.updatedAt ? `${STUDY_LIST_COPY.changed} ${formatRelativeFromNow(facts.updatedAt)}` : null,
    facts.subscriberCount ? STUDY_LIST_COPY.metaFollowers(facts.subscriberCount) : null,
    timesText(facts.copyCount ?? 0, STUDY_LIST_COPY.copied),
    timesText(facts.shareCount ?? 0, STUDY_LIST_COPY.shared),
  ].filter((part): part is string => Boolean(part));

  if (parts.length === 0) return null;

  return (
    <ul className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-foreground/60 ${className}`}>
      {/*
        * The separator trails its fact rather than leading the next one. Both
        * read the same on one line; on a wrapped line a leading dot starts the
        * second row with punctuation, which reads as a bullet nobody meant.
        */}
      {parts.map((part, index) => (
        <li key={part} className="flex items-center gap-2">
          {part}
          {index < parts.length - 1 ? <span aria-hidden="true">·</span> : null}
        </li>
      ))}
    </ul>
  );
}
