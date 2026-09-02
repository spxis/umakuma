import {
  FEATURE_KINDS,
  FEATURE_STATUSES,
  sortFeaturesByRelease,
  type FeatureArea,
  type FeatureKind,
  type FeatureTimelineEntry,
} from "./featureTimeline";

/**
 * The board: every open piece of work, in order, and who has it.
 *
 * Several agents work this repository at once, in parallel sessions that
 * cannot see each other. The timeline JSON is the one thing they all read, so
 * it is also the one place a request can be recorded, picked up and put down
 * without two sessions building the same thing or a report being lost between
 * a chat and a commit. This module is the maths of that; `scripts/backlog.ts`
 * is the hands.
 *
 * Pure over entries, so the rules can be tested without touching the file.
 */

export type BacklogDraft = {
  id: string;
  name: string;
  area: FeatureArea;
  summary: string;
  kind?: FeatureKind;
};

/**
 * The next ordering number a new entry can take.
 *
 * Release numbers on planned work must be distinct - the timeline test refuses
 * a collision - and picking one by eye is how two entries ended up on 6 in one
 * afternoon. The end of the queue is the honest default; a request that
 * belongs earlier is moved by hand, deliberately.
 */
export function nextFreeRelease(entries: FeatureTimelineEntry[]): number {
  const taken = entries
    .filter((entry) => entry.status === FEATURE_STATUSES.planned && typeof entry.release === "number")
    .map((entry) => entry.release as number);
  return taken.length === 0 ? 1 : Math.max(...taken) + 1;
}

/** A request as a planned entry, dated today as an estimate. */
export function addEntry(
  entries: FeatureTimelineEntry[],
  draft: BacklogDraft,
  today: string,
): FeatureTimelineEntry[] {
  if (entries.some((entry) => entry.id === draft.id)) {
    throw new Error(`An entry with id "${draft.id}" already exists.`);
  }
  return [
    ...entries,
    {
      id: draft.id,
      name: draft.name,
      area: draft.area,
      kind: draft.kind ?? FEATURE_KINDS.feature,
      status: FEATURE_STATUSES.planned,
      date: today,
      dateIsEstimate: true,
      release: nextFreeRelease(entries),
      summary: draft.summary,
    },
  ];
}

/**
 * Picks an entry up.
 *
 * Refuses a second claim rather than overwriting the first: the whole point of
 * the field is that two sessions do not start the same work, and a claim that
 * can be silently taken over is no claim at all. Putting it down first is one
 * command.
 */
export function claimEntry(
  entries: FeatureTimelineEntry[],
  id: string,
  owner: string,
  now: string,
): FeatureTimelineEntry[] {
  const target = entries.find((entry) => entry.id === id);
  if (!target) throw new Error(`No entry "${id}".`);
  if (target.status !== FEATURE_STATUSES.planned) {
    throw new Error(`"${id}" is ${target.status}; only planned work is claimed.`);
  }
  if (target.owner && target.owner !== owner) {
    throw new Error(`"${id}" is already claimed by ${target.owner}. Have them release it first.`);
  }
  return entries.map((entry) => (entry.id === id ? { ...entry, owner, claimedAt: now } : entry));
}

/** Puts an entry down without shipping it. */
export function releaseEntry(entries: FeatureTimelineEntry[], id: string): FeatureTimelineEntry[] {
  if (!entries.some((entry) => entry.id === id)) throw new Error(`No entry "${id}".`);
  return entries.map((entry) => {
    if (entry.id !== id) return entry;
    const { owner: _owner, claimedAt: _claimedAt, ...rest } = entry;
    return rest;
  });
}

/** Open work, in progress first, then by release order. */
export function openWork(entries: FeatureTimelineEntry[]): FeatureTimelineEntry[] {
  const planned = sortFeaturesByRelease(entries.filter((entry) => entry.status === FEATURE_STATUSES.planned));
  return [...planned.filter((entry) => entry.owner), ...planned.filter((entry) => !entry.owner)];
}

/** The board as text, for a terminal. */
export function formatBoard(entries: FeatureTimelineEntry[]): string {
  const work = openWork(entries);
  if (work.length === 0) return "Nothing planned.";

  const lines = work.map((entry) => {
    const kind = entry.kind === FEATURE_KINDS.bug ? "BUG " : "    ";
    const state = entry.owner ? `IN PROGRESS · ${entry.owner}` : "planned";
    return `${String(entry.release ?? "-").padStart(3)}  ${kind} ${entry.id.padEnd(36)} ${state}\n      ${entry.name}`;
  });

  const inProgress = work.filter((entry) => entry.owner).length;
  const bugs = work.filter((entry) => entry.kind === FEATURE_KINDS.bug).length;
  return [`${work.length} open · ${inProgress} in progress · ${bugs} bugs`, "", ...lines].join("\n");
}

/*
 * Everything above 7-bit ASCII. Built from code points rather than written as
 * a literal range, so the source holds no character a reviewer cannot see.
 */
const NON_ASCII = new RegExp(`[${String.fromCharCode(0x80)}-${String.fromCharCode(0xffff)}]`, "g");

/**
 * The file's own escaping.
 *
 * The JSON is stored with every non-ASCII character escaped, so a diff shows
 * the entry that changed and not every Japanese title on the page. A plain
 * `JSON.stringify` would write the characters raw and rewrite the whole file.
 */
export function stringifyTimeline(entries: FeatureTimelineEntry[]): string {
  const raw = JSON.stringify(entries, null, 2);
  const escaped = raw.replace(NON_ASCII, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
  return `${escaped}\n`;
}
