/**
 * What a member says about a region: whether they know it, and whether they
 * have been there.
 *
 * Two facts rather than one, because they answer differently and a family map
 * wants both: a child can name every prefecture and have set foot in three,
 * and a parent can have driven through Gifu twice and still not place it. So
 * the status is a small ladder and being there is a flag beside it, not a
 * third rung on the same ladder.
 */

export const MAP_MARK_STATUSES = {
  /** Solid. Nothing more to do here. */
  known: "known",
  /** Seen it, does not stick yet. */
  practice: "practice",
} as const;

export type MapMarkStatus = (typeof MAP_MARK_STATUSES)[keyof typeof MAP_MARK_STATUSES];

export const MAP_MARK_STATUS_VALUES = Object.values(MAP_MARK_STATUSES) as MapMarkStatus[];

export function isMapMarkStatus(value: string): value is MapMarkStatus {
  return (MAP_MARK_STATUS_VALUES as readonly string[]).includes(value);
}

/** One region, as the member has marked it. */
export type MapMarkRecord = {
  region: string;
  status: MapMarkStatus | null;
  visited: boolean;
};

/** Every mark for one country, keyed by region code as text. */
export type MapMarkIndex = Record<string, { status: MapMarkStatus | null; visited: boolean }>;

export const NO_MARK: { status: MapMarkStatus | null; visited: boolean } = { status: null, visited: false };

export function markFor(index: MapMarkIndex, region: string | number): { status: MapMarkStatus | null; visited: boolean } {
  return index[String(region)] ?? NO_MARK;
}

/**
 * Pressing a status button.
 *
 * Pressing the one already set clears it, which is the only way back to "I
 * have not said" - a third button for that would be a button nobody presses
 * on purpose and everybody presses by accident.
 */
export function toggleStatus(current: MapMarkStatus | null, pressed: MapMarkStatus): MapMarkStatus | null {
  return current === pressed ? null : pressed;
}

/**
 * Whether a mark is worth a row in the database.
 *
 * Nothing said is nothing stored: a member who marks a prefecture known and
 * then clears it should leave no trace, or the table fills with rows meaning
 * "no opinion" and every count of what somebody has marked has to filter them
 * out first.
 */
export function markIsEmpty(mark: { status: MapMarkStatus | null; visited: boolean }): boolean {
  return mark.status === null && !mark.visited;
}

/** How the map paints a region, given what the member has said about it. */
export function markTone(mark: { status: MapMarkStatus | null; visited: boolean }): string | null {
  if (mark.status === MAP_MARK_STATUSES.known) return mark.visited ? "knownVisited" : "known";
  if (mark.status === MAP_MARK_STATUSES.practice) return mark.visited ? "practiceVisited" : "practice";
  return mark.visited ? "visited" : null;
}

export type MapMarkTotals = { known: number; practice: number; visited: number };

/** What the member has said about a country so far, for the line that says so. */
export function markTotals(index: MapMarkIndex): MapMarkTotals {
  const totals: MapMarkTotals = { known: 0, practice: 0, visited: 0 };
  for (const mark of Object.values(index)) {
    if (mark.status === MAP_MARK_STATUSES.known) totals.known += 1;
    if (mark.status === MAP_MARK_STATUSES.practice) totals.practice += 1;
    if (mark.visited) totals.visited += 1;
  }
  return totals;
}
