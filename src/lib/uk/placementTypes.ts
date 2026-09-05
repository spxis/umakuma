import { type GameChoiceCount } from "@/lib/gameBoard";
import { type SubjectType } from "@/lib/domainConstants";

import { type PlacementConfidence } from "./placementStaircase";

/**
 * What the placement routes hand the page.
 *
 * Shared between the route and the step that draws it so the two cannot drift,
 * and kept out of the server module so importing a type does not drag
 * `server-only` into a client component.
 *
 * Note what is **not** here: which option is the right one. The page never
 * learns it, during the probe or after it. That is what makes a stateless test
 * worth sitting — and it is also why the test shows no per-question feedback,
 * since there is nothing to show it with.
 */

export type PlacementOption = {
  subjectId: number;
  label: string;
};

export type PlacementQuestion = {
  position: number;
  /** Kanji or vocabulary, so the glyph can be sized and marked as Japanese. */
  subjectType: SubjectType;
  prompt: string;
  options: PlacementOption[];
};

export type PlacementProbePayload = {
  done: false;
  /** Signed, opaque, and returned unchanged with the answers. */
  ticket: string;
  rung: number;
  choiceCount: GameChoiceCount;
  /** One-based, for "probe 3" rather than a progress bar that cannot know. */
  probeNumber: number;
  maxProbes: number;
  questions: PlacementQuestion[];
};

export type PlacementResultPayload = {
  done: true;
  /** The level they start on. */
  floor: number;
  /** What the ladder derives once the seeding has landed. */
  level: number;
  confidence: PlacementConfidence;
  probes: number;
  seeded: number;
  seededMissed: number;
};

export type PlacementStepPayload = PlacementProbePayload | PlacementResultPayload;
