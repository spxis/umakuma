import type { GameCurrencyType } from "@/lib/gameCurrencyDomain";

/** Which mascot a shop item is themed for. */
export const SHOP_CHARACTERS = {
  uma: "uma",
  kuma: "kuma",
} as const;

export type ShopCharacter = (typeof SHOP_CHARACTERS)[keyof typeof SHOP_CHARACTERS];

export const SHOP_CHARACTER_VALUES: ShopCharacter[] = [SHOP_CHARACTERS.uma, SHOP_CHARACTERS.kuma];

export function isShopCharacter(value: string | null | undefined): value is ShopCharacter {
  return (SHOP_CHARACTER_VALUES as readonly string[]).includes(value ?? "");
}

/**
 * One catalogue entry.
 *
 * Cosmetic and goofy, priced in exactly one currency each - no exchange-rate
 * maths, since nothing here is wired to a real balance yet. `emoji` stands in
 * for item art, which does not exist yet; the mascot renders once per page as
 * the character's own art, not once per item.
 */
export type ShopItem = {
  id: string;
  character: ShopCharacter;
  name: string;
  emoji: string;
  description: string;
  currency: GameCurrencyType;
  price: number;
};
