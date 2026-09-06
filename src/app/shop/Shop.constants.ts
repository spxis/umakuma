import { GAME_CURRENCY_TYPES } from "@/lib/gameCurrencyDomain";

import { SHOP_CHARACTERS, type ShopItem } from "./Shop.types";

/** Copy for the shop page, in one map for the locale layer. */
export const SHOP_PAGE_COPY = {
  title: "Shop",
  subtitle: "Fun, goofy, entirely optional. Spend what Mochi, Oni and Kane bring you.",
  umaHeading: "For Uma",
  kumaHeading: "For Kuma",
  getIt: "Get it",
  gotIt: "Got it!",
  priceLabel: (amount: number, currencyName: string) => `${amount.toLocaleString("en-CA")} ${currencyName}`,
  comingSoonNote:
    "Nothing here is wired to a real balance yet - press Get it and see what happens.",
} as const;

/**
 * Sixteen cosmetic items, eight per mascot, priced across all three
 * currencies so the shop shows off the full set rather than leaning on one.
 * Rarer currency, smaller numbers: Kane prices run in single digits, Oni in
 * the tens and low hundreds, Mochi in the hundreds - so a price tag reads as
 * rare or plentiful before a member ever compares exchange rates.
 */
export const SHOP_ITEMS: ShopItem[] = [
  // Uma
  {
    id: "uma-horseshoe-necklace",
    character: SHOP_CHARACTERS.uma,
    name: "Horseshoe Necklace",
    emoji: "🧲",
    description: "Lucky. Shiny. Does absolutely nothing.",
    currency: GAME_CURRENCY_TYPES.mochi,
    price: 320,
  },
  {
    id: "uma-racing-goggles",
    character: SHOP_CHARACTERS.uma,
    name: "Racing Goggles",
    emoji: "🥽",
    description: "For very serious three-metre sprints.",
    currency: GAME_CURRENCY_TYPES.mochi,
    price: 480,
  },
  {
    id: "uma-flower-mane-clips",
    character: SHOP_CHARACTERS.uma,
    name: "Flower Mane Clips",
    emoji: "🌼",
    description: "A clip for every good hair day.",
    currency: GAME_CURRENCY_TYPES.mochi,
    price: 275,
  },
  {
    id: "uma-cowboy-hat",
    character: SHOP_CHARACTERS.uma,
    name: "Cowboy Hat",
    emoji: "🤠",
    description: "Yeehaw, but make it kanji flashcards.",
    currency: GAME_CURRENCY_TYPES.oni,
    price: 85,
  },
  {
    id: "uma-carrot-crown",
    character: SHOP_CHARACTERS.uma,
    name: "Carrot Crown",
    emoji: "👑",
    description: "Root vegetable. Royalty. Both, apparently.",
    currency: GAME_CURRENCY_TYPES.oni,
    price: 120,
  },
  {
    id: "uma-disco-horseshoes",
    character: SHOP_CHARACTERS.uma,
    name: "Disco Horseshoes",
    emoji: "🪩",
    description: "Clip-clop, but they glow.",
    currency: GAME_CURRENCY_TYPES.oni,
    price: 150,
  },
  {
    id: "uma-golden-saddle",
    character: SHOP_CHARACTERS.uma,
    name: "Golden Saddle",
    emoji: "🐴",
    description: "You have arrived. Sit accordingly.",
    currency: GAME_CURRENCY_TYPES.kane,
    price: 8,
  },
  {
    id: "uma-rainbow-mane-dye",
    character: SHOP_CHARACTERS.uma,
    name: "Rainbow Mane Dye",
    emoji: "🌈",
    description: "One very extra makeover.",
    currency: GAME_CURRENCY_TYPES.kane,
    price: 14,
  },
  // Kuma
  {
    id: "kuma-honey-pot-hat",
    character: SHOP_CHARACTERS.kuma,
    name: "Honey Pot Hat",
    emoji: "🍯",
    description: "Structurally a hat. Spiritually a snack.",
    currency: GAME_CURRENCY_TYPES.mochi,
    price: 340,
  },
  {
    id: "kuma-bee-backpack",
    character: SHOP_CHARACTERS.kuma,
    name: "Bee Backpack",
    emoji: "🐝",
    description: "Buzzes when you're not looking. Probably.",
    currency: GAME_CURRENCY_TYPES.mochi,
    price: 410,
  },
  {
    id: "kuma-bamboo-sunglasses",
    character: SHOP_CHARACTERS.kuma,
    name: "Bamboo Sunglasses",
    emoji: "🕶️",
    description: "Cool bear, zero UV protection.",
    currency: GAME_CURRENCY_TYPES.mochi,
    price: 260,
  },
  {
    id: "kuma-fishing-rod-prop",
    character: SHOP_CHARACTERS.kuma,
    name: "Fishing Rod Prop",
    emoji: "🎣",
    description: "Catches compliments, not fish.",
    currency: GAME_CURRENCY_TYPES.oni,
    price: 90,
  },
  {
    id: "kuma-salmon-plushie",
    character: SHOP_CHARACTERS.kuma,
    name: "Salmon Plushie",
    emoji: "🐟",
    description: "For emotional support and bragging rights.",
    currency: GAME_CURRENCY_TYPES.oni,
    price: 110,
  },
  {
    id: "kuma-winter-scarf",
    character: SHOP_CHARACTERS.kuma,
    name: "Winter Scarf",
    emoji: "🧣",
    description: "Handmade by absolutely no one, machine loved.",
    currency: GAME_CURRENCY_TYPES.oni,
    price: 135,
  },
  {
    id: "kuma-golden-claws",
    character: SHOP_CHARACTERS.kuma,
    name: "Golden Claws",
    emoji: "🐾",
    description: "Sharp. Shiny. Deeply unnecessary.",
    currency: GAME_CURRENCY_TYPES.kane,
    price: 9,
  },
  {
    id: "kuma-starry-night-cape",
    character: SHOP_CHARACTERS.kuma,
    name: "Starry Night Cape",
    emoji: "🌌",
    description: "For dramatic entrances only.",
    currency: GAME_CURRENCY_TYPES.kane,
    price: 16,
  },
];
