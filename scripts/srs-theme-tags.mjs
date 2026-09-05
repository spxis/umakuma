/**
 * What each theme is *about*, so a member can be asked five questions instead
 * of scrolling ninety cards.
 *
 * These sit beside the ratings and the renames rather than in `src/`, and they
 * are emitted into `srsThemes.json` by `build-srs-themes.mjs`, because they are
 * the same kind of thing: a judgement about a theme that its rung table does
 * not carry. Keeping every per-theme judgement in one place is what stops the
 * set drifting — a theme added to the brainstorm and rebuilt shows up here as
 * untagged, and the build prints it.
 *
 * **Not derived from the name at runtime.** "Bounty Hunter" is a spaceship
 * theme and "Gate Hunter" is not; "Cave Raider" has nothing to do with caving
 * as a hobby. String matching would get both wrong and nobody would notice,
 * because a wrong tag only shows up as a slightly odd suggestion.
 *
 * The one tag that *is* computed is the script mix, and it is computed from
 * the rung terms themselves — how much of the writing is katakana rather than
 * kanji and kana — which is a fact about the data, not a guess about a name.
 */

/** Why a member came to Japanese. */
export const DRAW_TAGS = ["anime", "games", "travel", "work", "language", "family"];

/** Where they would rather spend an afternoon. */
export const SETTING_TAGS = ["dojo", "city-night", "spaceship", "mountain-temple", "office", "stadium"];

/** How they like to win. */
export const STYLE_TAGS = ["discipline", "cleverness", "power", "kindness", "turning-up"];

/** Computed from the rung terms, never hand-set. */
export const SCRIPT_TAGS = ["all-japanese", "mixed-script", "english-friendly"];

/** What a member can put off the table. Also what an age band puts off it for them. */
export const AVOID_TAGS = ["violence", "underworld", "adult-content"];

export const ALL_TAGS = [...DRAW_TAGS, ...SETTING_TAGS, ...STYLE_TAGS, ...SCRIPT_TAGS, ...AVOID_TAGS];

/**
 * Hand-written, one line per theme.
 *
 * A theme may carry several tags from the same question — Sumo is a dojo and a
 * stadium, Spycraft is anime and family — because the questions ask what a
 * member likes, not what a theme is exclusively. Overlap is the whole scoring
 * mechanism, so a theme that honestly answers three questions should say so.
 *
 * `violence` is a preference and stays one: a fifteen-year-old is allowed the
 * corps ranks and the demon corps, and forcing the filter on them would take
 * away the themes their band exists to permit. `underworld` and `adult-content`
 * are the two that an age band forces off the table.
 */
export const THEME_TAGS = {
  "academic-system": ["work", "language", "office", "discipline", "turning-up"],
  "amusement-park": ["travel", "family", "turning-up"],
  "anime-pilgrimage": ["anime", "travel", "mountain-temple", "turning-up"],
  "arcade-rhythm-gamer": ["games", "city-night", "discipline", "turning-up"],
  "a-silent-voice": ["anime", "kindness"],
  "attack-on-titan": ["anime", "discipline", "power", "violence"],
  "avatar-the-last-airbender": ["anime", "family", "dojo", "mountain-temple", "kindness", "discipline"],
  bleach: ["anime", "power", "discipline"],
  bosozoku: ["city-night", "power", "underworld", "violence"],
  "brazilian-jiu-jitsu-bjj": ["dojo", "discipline", "cleverness", "turning-up"],
  catholicism: ["mountain-temple", "kindness", "discipline", "turning-up"],
  "classical-orchestra": ["discipline", "turning-up", "kindness"],
  "code-geass": ["anime", "cleverness", "power", "violence"],
  "cowboy-bebop": ["anime", "spaceship", "cleverness", "violence"],
  "death-note": ["anime", "city-night", "cleverness", "violence"],
  "demon-slayer": ["anime", "dojo", "discipline", "power", "violence"],
  "doctor-who": ["spaceship", "cleverness", "kindness"],
  "donkey-kong": ["games", "family", "power", "turning-up"],
  "elden-ring": ["games", "power", "turning-up", "violence"],
  "final-fantasy": ["games", "cleverness", "power"],
  frieren: ["anime", "cleverness", "kindness", "turning-up"],
  "fullmetal-alchemist": ["anime", "cleverness", "discipline", "violence"],
  "gacha-game-spender": ["games", "power", "turning-up", "adult-content"],
  "geisha-hanamachi": ["travel", "language", "city-night", "discipline", "kindness"],
  "ghost-in-the-shell": ["anime", "city-night", "cleverness", "violence"],
  "gokudo-yakuza": ["city-night", "power", "underworld", "violence"],
  "gundam-iron-blooded-orphans": ["anime", "spaceship", "power", "violence"],
  "gunpla-builder": ["anime", "games", "discipline", "turning-up"],
  haikyu: ["anime", "stadium", "turning-up", "discipline"],
  "hajime-no-ippo": ["anime", "dojo", "stadium", "discipline", "power"],
  "high-school-baseball": ["stadium", "turning-up", "discipline"],
  "hunter-x-hunter": ["anime", "cleverness", "power", "violence"],
  "idol-otaku-wotagei": ["anime", "city-night", "turning-up"],
  "imperial-court": ["language", "work", "office", "cleverness", "discipline"],
  "j-pop-artist-idol": ["city-night", "stadium", "turning-up"],
  "japanese-audiophile-gear": ["discipline", "turning-up"],
  "japanese-buddhism": ["language", "travel", "mountain-temple", "discipline", "kindness"],
  "japanese-trains": ["travel", "discipline", "turning-up"],
  judo: ["dojo", "discipline", "cleverness", "turning-up"],
  "jujutsu-kaisen": ["anime", "power", "cleverness", "violence"],
  kaidan: ["language", "mountain-temple", "cleverness", "violence"],
  kendo: ["dojo", "discipline", "turning-up"],
  "like-a-dragon-yakuza": ["games", "city-night", "power", "underworld", "violence"],
  "made-in-abyss": ["anime", "cleverness", "turning-up", "violence"],
  "marvel-cinematic-universe": ["power", "cleverness"],
  "mega-man-x": ["games", "power", "cleverness"],
  "mizushobai-kabukicho": ["city-night", "cleverness", "underworld", "adult-content"],
  "mushroom-hero": ["games", "family", "turning-up", "kindness"],
  mushishi: ["anime", "travel", "mountain-temple", "kindness", "cleverness"],
  "mushoku-tensei": ["anime", "cleverness", "power"],
  "my-hero-academia": ["anime", "kindness", "power", "turning-up"],
  naruto: ["anime", "dojo", "turning-up", "power"],
  obake: ["language", "mountain-temple", "power", "violence"],
  "one-piece": ["anime", "power", "kindness", "turning-up"],
  "one-punch-man": ["anime", "power", "turning-up"],
  onmyodo: ["language", "mountain-temple", "cleverness", "discipline"],
  "parasyte-the-maxim": ["anime", "cleverness", "power", "violence"],
  "pocket-monster-tamer": ["games", "family", "kindness", "cleverness", "turning-up"],
  "psycho-pass": ["anime", "city-night", "cleverness", "violence"],
  "pure-audio-otaku": ["discipline", "turning-up"],
  "riichi-mahjong": ["games", "city-night", "cleverness", "turning-up"],
  salaryman: ["work", "office", "turning-up", "discipline"],
  samurai: ["dojo", "discipline", "power"],
  "shinkansen-rolling-stock": ["travel", "discipline", "power"],
  "shinkansen-service-names": ["travel", "discipline", "power"],
  "shinobi-ninja": ["dojo", "cleverness", "discipline", "violence"],
  "shinsengumi": ["dojo", "discipline", "power", "violence"],
  "shinto-priesthood": ["language", "travel", "mountain-temple", "discipline", "kindness"],
  "slam-dunk": ["anime", "stadium", "turning-up", "discipline"],
  "solo-leveling": ["anime", "games", "power", "violence"],
  "sonic-the-hedgehog": ["games", "family", "power", "turning-up"],
  "spy-x-family": ["anime", "family", "cleverness", "kindness"],
  "star-trek": ["spaceship", "cleverness", "kindness", "turning-up"],
  "star-wars": ["spaceship", "discipline", "power"],
  "stargate-sg-1": ["spaceship", "cleverness", "turning-up"],
  "stationery-shop": ["work", "office", "turning-up", "kindness"],
  "steins-gate": ["anime", "games", "city-night", "cleverness"],
  sumo: ["dojo", "stadium", "power", "discipline", "turning-up"],
  "sushi-kitchen": ["travel", "work", "discipline", "turning-up"],
  "tea-ceremony": ["travel", "language", "mountain-temple", "discipline", "kindness"],
  "the-legend-of-zelda": ["games", "cleverness", "kindness", "turning-up"],
  "the-lord-of-the-rings": ["kindness", "turning-up"],
  "tokyo-ghoul": ["anime", "city-night", "power", "violence"],
  toradora: ["anime", "kindness"],
  "traditional-artisan-shokunin": ["work", "travel", "discipline", "turning-up"],
  "train-spotter-s-holy-grail": ["travel", "turning-up", "cleverness"],
  wanikani: ["language", "turning-up", "discipline"],
  "x-men": ["power", "cleverness"],
  "yokai-folklore": ["language", "travel", "mountain-temple", "power", "violence"],
  "yoshiwara-oiran": ["city-night", "discipline", "cleverness", "underworld", "adult-content"],
};

/**
 * How much of a theme's writing is katakana — the loanword script.
 *
 * Kanji and kana on one side, katakana and Latin on the other. A member who
 * asks for English-friendly words means the ladder that reads ハンター and
 * S級, not the one that reads 下忍 and 中忍; hiragana belongs with the kanji,
 * because のぞみ is no more approachable to a beginner than 希望 is.
 */
const SCRIPT_THRESHOLDS = { englishFriendly: 0.5, mixed: 0.2 };

function scriptClassOf(codePoint) {
  if (codePoint >= 0x4e00 && codePoint <= 0x9fff) return "japanese";
  if (codePoint >= 0x3041 && codePoint <= 0x309f) return "japanese";
  if ((codePoint >= 0x30a1 && codePoint <= 0x30fa) || codePoint === 0x30fc) return "loan";
  if ((codePoint >= 0x41 && codePoint <= 0x5a) || (codePoint >= 0x61 && codePoint <= 0x7a)) return "loan";
  if (codePoint >= 0x30 && codePoint <= 0x39) return "loan";
  return null;
}

/** The one computed tag: which script question this theme answers. */
export function scriptTagFor(levels) {
  let japanese = 0;
  let loan = 0;
  for (const level of levels) {
    /* Level 0 is the same 未着手 on every theme and would flatten the score. */
    if (level.level === 0) continue;
    for (const character of level.term) {
      const kind = scriptClassOf(character.codePointAt(0));
      if (kind === "japanese") japanese += 1;
      else if (kind === "loan") loan += 1;
    }
  }
  const total = japanese + loan;
  const share = total === 0 ? 0 : loan / total;
  if (share >= SCRIPT_THRESHOLDS.englishFriendly) return "english-friendly";
  if (share >= SCRIPT_THRESHOLDS.mixed) return "mixed-script";
  return "all-japanese";
}
