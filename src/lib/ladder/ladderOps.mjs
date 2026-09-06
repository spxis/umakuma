/**
 * An admin's changes to the ladder, replayed over the computed one.
 *
 * `build-kanji-ladder` is a pure function of five files: it recomputes the
 * whole curriculum every run and writes it out. That is what makes it
 * trustworthy and it is also why an edit made in the admin console would
 * vanish on the next `pnpm ladder:refresh`. These ops are the bridge — they
 * are committed to the repo, and the build replays them after it has sorted
 * the kanji and before it places radicals and words.
 *
 * The order matters. `placeRadicals` and `placeVocabulary` are pure functions
 * of where the kanji ended up, so a kanji moved here drags its radicals and
 * the words that use it along without anybody writing that rule twice.
 *
 * Written as `.mjs` on purpose: `build-kanji-ladder.mjs` has to import it at
 * run time and a `.mjs` cannot import a `.ts`. The types travel as JSDoc, so
 * the admin route and the tests still get them, and the alternative — a second
 * copy of these rules living in the build — is the one thing that must not
 * happen. `applyLadderOps` decides what a move means exactly once.
 *
 * Nothing is guessed. An op that would break an invariant the ladder promises
 * is refused by name and the build fails, which is the same choice
 * `release-take` makes: a script that silently did something reasonable would
 * be a curriculum nobody decided on.
 */

export const LADDER_OP_TYPES = { move: "move", add: "add", remove: "remove" };

/**
 * @typedef {"move" | "add" | "remove"} LadderOpType
 *
 * @typedef {object} LadderOp
 * @property {string} id
 * @property {LadderOpType} op
 * @property {"kanji"} kind        only kanji ops reshape the levels; radicals and words follow
 * @property {string} key          `kanji:語` — the same key `UkSubject` uses
 * @property {number | null} [fromLevel]
 * @property {number | null} [toLevel]
 * @property {string | null} [reason]
 * @property {string} [by]
 * @property {string} [at]
 *
 * @typedef {object} LadderLevelDraft
 * @property {number} level
 * @property {number} nLevel
 * @property {string[]} kanji
 *
 * @typedef {object} LadderOpRefusal
 * @property {string} id
 * @property {string} key
 * @property {string} reason
 */

export const LADDER_REFUSALS = {
  unknownKanji: "no kanji on the ladder has that key",
  levelOutOfRange: "that level is not on the ladder",
  wouldEmptyLevel: "the level it is leaving would have no kanji left",
  wouldOverfillLevel: "the level it is joining would be over the size limit",
  landsAfterItsBand: "it would land after the level its JLPT band is promised complete by",
  intoTheRadicalLevel: "level 1 teaches radicals and no kanji",
  alreadyPresent: "the ladder already teaches that kanji",
  noTarget: "an add or move needs a level to go to",
};

/**
 * The character a key names, or null when the key is not a kanji key.
 * @param {string} key
 * @returns {string | null}
 */
export function kanjiOf(key) {
  const [kind, ...rest] = key.split(":");
  const characters = rest.join(":");
  return kind === "kanji" && characters.length > 0 ? characters : null;
}

/**
 * A level may not grow past this. The ladder's own test caps a level at 30
 * kanji, and the whole point of our levels is that they are lighter than
 * WaniKani's — an admin who could quietly build a 60-kanji level would undo
 * the design without noticing.
 */
export const LADDER_MAX_KANJI_PER_LEVEL = 29;

/** @param {LadderLevelDraft[]} levels @param {string} kanji */
function levelHolding(levels, kanji) {
  return levels.find((level) => level.kanji.includes(kanji));
}

/**
 * The levels a JLPT band occupies, so a move cannot break the promise that
 * every N5 kanji is taught by level 10.
 * @param {LadderLevelDraft[]} levels @param {number} nLevel
 */
function bandRange(levels, nLevel) {
  const inBand = levels.filter((level) => level.nLevel === nLevel);
  if (inBand.length === 0) return null;
  return { first: inBand[0].level, last: inBand[inBand.length - 1].level };
}

/** @param {LadderLevelDraft[]} levels @param {LadderOp} op @returns {LadderOpRefusal | null} */
function applyMove(levels, op) {
  const kanji = kanjiOf(op.key);
  if (!kanji) return { id: op.id, key: op.key, reason: LADDER_REFUSALS.unknownKanji };

  const from = levelHolding(levels, kanji);
  if (!from) return { id: op.id, key: op.key, reason: LADDER_REFUSALS.unknownKanji };

  const target = op.toLevel;
  if (target === undefined || target === null) return { id: op.id, key: op.key, reason: LADDER_REFUSALS.noTarget };

  const to = levels.find((level) => level.level === target);
  if (!to) return { id: op.id, key: op.key, reason: LADDER_REFUSALS.levelOutOfRange };
  if (to.level === from.level) return null;

  if (from.kanji.length <= 1) return { id: op.id, key: op.key, reason: LADDER_REFUSALS.wouldEmptyLevel };
  if (to.kanji.length >= LADDER_MAX_KANJI_PER_LEVEL) {
    return { id: op.id, key: op.key, reason: LADDER_REFUSALS.wouldOverfillLevel };
  }

  /*
   * A move may go earlier than its band. It may not go later.
   *
   * This refused both directions, which read as symmetry and was not: the
   * ladder promises "every N2 kanji by level 50", so teaching one at 22 keeps
   * that promise perfectly and teaching one at 51 breaks it. Refusing the
   * early direction bought nothing and cost the only thing these ops were
   * wanted for - pulling a school year's characters forward so the exam
   * ladder can carry a grade milestone too. Eight characters would have given
   * it grade one at level 22; the rule said no to all eight.
   *
   * Radicals and vocabulary are placed from the final kanji levels, after
   * every op has been replayed, so a character arriving early still brings its
   * parts with it.
   */
  const band = bandRange(levels, from.nLevel);
  if (band && to.level > band.last) {
    return { id: op.id, key: op.key, reason: LADDER_REFUSALS.landsAfterItsBand };
  }

  /*
   * Level 1 is radicals alone on both ladders, and there is nowhere below it
   * for a kanji's parts to go. Read off the ladder rather than assumed: a
   * level 1 that already teaches kanji is a ladder built to a different shape,
   * and this rule has no business overruling it.
   */
  if (to.level === 1 && to.kanji.length === 0) {
    return { id: op.id, key: op.key, reason: LADDER_REFUSALS.intoTheRadicalLevel };
  }

  from.kanji = from.kanji.filter((entry) => entry !== kanji);
  to.kanji = [...to.kanji, kanji];
  return null;
}

/** @param {LadderLevelDraft[]} levels @param {LadderOp} op @returns {LadderOpRefusal | null} */
function applyRemove(levels, op) {
  const kanji = kanjiOf(op.key);
  if (!kanji) return { id: op.id, key: op.key, reason: LADDER_REFUSALS.unknownKanji };
  const from = levelHolding(levels, kanji);
  if (!from) return { id: op.id, key: op.key, reason: LADDER_REFUSALS.unknownKanji };
  if (from.kanji.length <= 1) return { id: op.id, key: op.key, reason: LADDER_REFUSALS.wouldEmptyLevel };
  from.kanji = from.kanji.filter((entry) => entry !== kanji);
  return null;
}

/** @param {LadderLevelDraft[]} levels @param {LadderOp} op @returns {LadderOpRefusal | null} */
function applyAdd(levels, op) {
  const kanji = kanjiOf(op.key);
  if (!kanji) return { id: op.id, key: op.key, reason: LADDER_REFUSALS.unknownKanji };
  if (levelHolding(levels, kanji)) return { id: op.id, key: op.key, reason: LADDER_REFUSALS.alreadyPresent };

  const target = op.toLevel;
  if (target === undefined || target === null) return { id: op.id, key: op.key, reason: LADDER_REFUSALS.noTarget };
  const to = levels.find((level) => level.level === target);
  if (!to) return { id: op.id, key: op.key, reason: LADDER_REFUSALS.levelOutOfRange };
  if (to.kanji.length >= LADDER_MAX_KANJI_PER_LEVEL) {
    return { id: op.id, key: op.key, reason: LADDER_REFUSALS.wouldOverfillLevel };
  }

  to.kanji = [...to.kanji, kanji];
  return null;
}

/**
 * Replays every op in order over a copy of the computed levels.
 *
 * A later op on the same key supersedes an earlier one simply by running after
 * it. Refusals are collected rather than thrown so the build can report all of
 * them at once instead of one per run.
 *
 * @param {readonly LadderLevelDraft[]} levels
 * @param {readonly LadderOp[]} ops
 * @returns {{ levels: LadderLevelDraft[], refused: LadderOpRefusal[] }}
 */
export function applyLadderOps(levels, ops) {
  const draft = levels.map((level) => ({ ...level, kanji: [...level.kanji] }));
  /** @type {LadderOpRefusal[]} */
  const refused = [];

  for (const op of ops) {
    const refusal =
      op.op === LADDER_OP_TYPES.move
        ? applyMove(draft, op)
        : op.op === LADDER_OP_TYPES.remove
          ? applyRemove(draft, op)
          : applyAdd(draft, op);
    if (refusal) refused.push(refusal);
  }

  return { levels: draft, refused };
}

/**
 * An overrides file that has lost its shape reads as no overrides, never as a
 * crash: the build must not be stopped by a file somebody hand-edited.
 * @param {string} raw
 * @returns {LadderOp[]}
 */
export function parseLadderOverrides(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.ops)) return [];
    return parsed.ops.filter(
      (op) =>
        typeof op?.id === "string" &&
        typeof op?.key === "string" &&
        Object.values(LADDER_OP_TYPES).includes(op.op),
    );
  } catch {
    return [];
  }
}
