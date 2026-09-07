import { GAME_CURRENCY_TYPES, type GameCurrencyType } from "@/lib/gameCurrencyDomain";

/**
 * The faces each currency mascot can pull.
 *
 * Every mascot and every reaction is one master in `src/images/currency/`,
 * and `pnpm currency:build` writes the whole family for each into
 * `public/assets/currency/`: the base SVG, a dark-outline variant, optical
 * sizes at 18-64 in both, and transparent PNGs at 128-2048. This module is the
 * list of what exists, so a surface asks for `mochi` pulling `love` rather
 * than spelling a path; `gameCurrencyReactions.test.ts` fails if a master or a
 * built file is missing for anything named here, or built for anything that
 * is not.
 *
 * Nothing awards or shows a reaction yet. The economy that will is being
 * designed separately; this is the vocabulary it will read from.
 */
export const GAME_CURRENCY_REACTIONS = {
  [GAME_CURRENCY_TYPES.mochi]: ["laugh", "cool", "love"],
  [GAME_CURRENCY_TYPES.oni]: ["curious", "smug", "rocket"],
  [GAME_CURRENCY_TYPES.kane]: ["shocked", "party", "deadpan"],
} as const satisfies Record<GameCurrencyType, readonly string[]>;

export type GameCurrencyReaction<T extends GameCurrencyType = GameCurrencyType> =
  (typeof GAME_CURRENCY_REACTIONS)[T][number];

/** Optical sizes the build writes as sized SVGs; below 18 the faces do not read. */
export const CURRENCY_ASSET_OPTICAL_SIZES = [18, 24, 32, 48, 64] as const;
export type CurrencyAssetOpticalSize = (typeof CURRENCY_ASSET_OPTICAL_SIZES)[number];

/** Raster sizes the build renders, transparent, from the base SVG. */
export const CURRENCY_ASSET_PNG_SIZES = [128, 256, 512, 1024, 2048] as const;
export type CurrencyAssetPngSize = (typeof CURRENCY_ASSET_PNG_SIZES)[number];

export const CURRENCY_ASSET_BASE_PATH = "/assets/currency";

type CurrencyAssetOptions = {
  /** An optical size; omit for the 128-unit base drawing. */
  size?: CurrencyAssetOpticalSize;
  /** Lifted outline for dark surfaces. */
  dark?: boolean;
};

function assetName(currency: GameCurrencyType, reaction?: string): string {
  return reaction ? `${currency}-${reaction}` : currency;
}

function svgPath(name: string, { size, dark }: CurrencyAssetOptions): string {
  const parts = [name];
  if (size !== undefined) parts.push(String(size));
  if (dark) parts.push("dark");
  return `${CURRENCY_ASSET_BASE_PATH}/${parts.join("-")}.svg`;
}

/** The mascot itself, as the shop and legend draw it. */
export function currencyIconPath(currency: GameCurrencyType, options: CurrencyAssetOptions = {}): string {
  return svgPath(assetName(currency), options);
}

/** The mascot pulling one of its faces. */
export function currencyReactionPath<T extends GameCurrencyType>(
  currency: T,
  reaction: GameCurrencyReaction<T>,
  options: CurrencyAssetOptions = {},
): string {
  return svgPath(assetName(currency, reaction), options);
}

/** A transparent raster of the mascot or a face, for surfaces that cannot take an SVG. */
export function currencyPngPath(
  currency: GameCurrencyType,
  size: CurrencyAssetPngSize,
  reaction?: GameCurrencyReaction,
): string {
  return `${CURRENCY_ASSET_BASE_PATH}/${assetName(currency, reaction)}-${size}.png`;
}

/** Every asset name the build is expected to have produced a family for. */
export function listCurrencyAssetNames(): string[] {
  return (Object.keys(GAME_CURRENCY_REACTIONS) as GameCurrencyType[]).flatMap((currency) => [
    assetName(currency),
    ...GAME_CURRENCY_REACTIONS[currency].map((reaction) => assetName(currency, reaction)),
  ]);
}

/** Every file the build writes for one asset name, relative to the currency directory. */
export function listCurrencyAssetFiles(name: string): string[] {
  const files = [`${name}.svg`, `${name}-dark.svg`];
  for (const size of CURRENCY_ASSET_OPTICAL_SIZES) files.push(`${name}-${size}.svg`, `${name}-${size}-dark.svg`);
  for (const size of CURRENCY_ASSET_PNG_SIZES) files.push(`${name}-${size}.png`);
  return files;
}
