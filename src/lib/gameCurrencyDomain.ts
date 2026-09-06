/**
 * The three currencies Uma and Kuma get fed with.
 *
 * Not one currency skinned three ways - three mascots
 * (`public/assets/currency/`), each a different treat worth a different
 * amount. Mochi and Oni are food; Kane is money, which is why it is both the
 * rarest drop and worth the most per unit. Nothing awards these yet - no
 * review, game or check-in writes to a balance - so this is the shared vocabulary
 * a future earning system and the shop both read from, not a wired economy.
 */
export const GAME_CURRENCY_TYPES = {
  mochi: "mochi",
  oni: "oni",
  kane: "kane",
} as const;

export type GameCurrencyType = (typeof GAME_CURRENCY_TYPES)[keyof typeof GAME_CURRENCY_TYPES];

export const GAME_CURRENCY_VALUES: GameCurrencyType[] = [
  GAME_CURRENCY_TYPES.mochi,
  GAME_CURRENCY_TYPES.oni,
  GAME_CURRENCY_TYPES.kane,
];

export function isGameCurrencyType(value: string | null | undefined): value is GameCurrencyType {
  return (GAME_CURRENCY_VALUES as readonly string[]).includes(value ?? "");
}

/**
 * Display info and relative worth for each currency.
 *
 * `dropWeight` is how often a random award would pick this one (the three
 * sum to 100) - used by `pickRandomGameCurrency` below, not by anything live
 * yet. `perUnitValue` is what one unit is worth against the others, which is
 * why Kane's shop prices run in the single digits while Mochi's run in the
 * hundreds: the currency that is rare should look rare on a price tag, not
 * just in how often it drops.
 */
export const GAME_CURRENCY_DISPLAY: Record<
  GameCurrencyType,
  {
    name: string;
    tier: "Common" | "Uncommon" | "Rare";
    dropWeight: number;
    perUnitValue: number;
    icon: string;
    iconDark: string;
    blurb: string;
  }
> = {
  [GAME_CURRENCY_TYPES.mochi]: {
    name: "Mochi",
    tier: "Common",
    dropWeight: 60,
    perUnitValue: 1,
    icon: "/assets/currency/mochi.svg",
    iconDark: "/assets/currency/mochi-dark.svg",
    blurb: "An everyday treat - the most common drop.",
  },
  [GAME_CURRENCY_TYPES.oni]: {
    name: "Oni",
    tier: "Uncommon",
    dropWeight: 30,
    perUnitValue: 8,
    icon: "/assets/currency/oni.svg",
    iconDark: "/assets/currency/oni-dark.svg",
    blurb: "A rarer treat, worth more per unit than Mochi.",
  },
  [GAME_CURRENCY_TYPES.kane]: {
    name: "Kane",
    tier: "Rare",
    dropWeight: 10,
    perUnitValue: 40,
    icon: "/assets/currency/kane.svg",
    iconDark: "/assets/currency/kane-dark.svg",
    blurb: "Money, not a treat - the rarest drop, and worth the most.",
  },
};

/**
 * Picks one currency at random, weighted by `dropWeight`.
 *
 * The shape a future "you earned a reward" call site slots into. Nothing
 * calls this yet - no route awards currency today - so it is exercised only
 * by its own unit test until that day comes.
 */
export function pickRandomGameCurrency(random: () => number = Math.random): GameCurrencyType {
  const roll = random() * 100;
  let cumulative = 0;
  for (const type of GAME_CURRENCY_VALUES) {
    cumulative += GAME_CURRENCY_DISPLAY[type].dropWeight;
    if (roll < cumulative) return type;
  }
  return GAME_CURRENCY_TYPES.kane;
}
