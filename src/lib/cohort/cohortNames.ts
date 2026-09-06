import type { RandomSource } from "@/lib/gameRandom";

/**
 * Names for the simulated cohort, by country.
 *
 * The brief was members who do not stand out: real student names from the
 * places UmaKuma's members actually come from, written the way those people
 * write them online. So the pools are ordinary rather than exotic, the
 * Canadian list carries the francophone and immigrant names a Canadian class
 * does, the Vietnamese and Thai lists are in the romanised forms their owners
 * type into a sign-up box, and a third of the cohort goes by a handle rather
 * than a full name - because a leaderboard of thirty-two tidy "First Last"
 * entries is the thing that would look generated.
 *
 * Pure: every choice is made through the random source handed in, so a cohort
 * built from one seed is the same cohort every time.
 */

export const COHORT_COUNTRIES = ["CA", "US", "VN", "TH", "FR", "AU"] as const;
export type CohortCountry = (typeof COHORT_COUNTRIES)[number];

export function isCohortCountry(value: string): value is CohortCountry {
  return (COHORT_COUNTRIES as readonly string[]).includes(value);
}

type NamePool = { given: readonly string[]; family: readonly string[] };

const POOLS: Record<CohortCountry, NamePool> = {
  CA: {
    given: [
      "Emily", "Liam", "Olivia", "Noah", "Chloé", "Ethan", "Ava", "Lucas", "Sophie", "Nathan",
      "Maya", "Owen", "Isabelle", "Jacob", "Hannah", "Mathieu", "Priya", "Aiden", "Zoé", "Ryan",
      "Sarah", "Félix", "Mei", "Tyler", "Camille", "Ben",
    ],
    family: [
      "Tremblay", "Nguyen", "MacDonald", "Gagnon", "Chen", "Wilson", "Roy", "Singh", "Campbell",
      "Lavoie", "Patel", "Martin", "Kim", "Thompson", "Bouchard", "Fraser", "Leblanc", "Wong",
    ],
  },
  US: {
    given: [
      "Madison", "Jordan", "Tyler", "Sofia", "Ethan", "Olivia", "Brandon", "Ashley", "Marcus", "Emma",
      "Caleb", "Destiny", "Kevin", "Jasmine", "Austin", "Grace", "Isaiah", "Natalie", "Diego", "Hailey",
      "Andrew", "Alexis", "Trevor", "Megan",
    ],
    family: [
      "Johnson", "Ramirez", "Brooks", "Martinez", "Kim", "Williams", "Carter", "Nguyen", "Lopez",
      "Anderson", "Davis", "Garcia", "Hernandez", "Mitchell", "Robinson", "Torres", "Park", "Miller",
    ],
  },
  VN: {
    given: [
      "Minh Anh", "Bao Ngoc", "Hoang Nam", "Thu Ha", "Quang Huy", "Phuong Linh", "Duc Anh", "Khanh Vy",
      "Tuan Kiet", "Thanh Truc", "Gia Bao", "Ngoc Han", "Hai Dang", "My Duyen", "Anh Thu", "Trung Hieu",
    ],
    family: ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Vu", "Dang", "Bui", "Do", "Ho"],
  },
  TH: {
    given: [
      "Nattaporn", "Thanakrit", "Kanokwan", "Pimchanok", "Chayanon", "Suphatra", "Woraphon", "Ploy",
      "Nan", "Bam", "Fah", "Mint", "Kittipong", "Siriporn", "Anucha", "Praew",
    ],
    family: [
      "Chaiyasit", "Boonmee", "Srisuk", "Rattanaporn", "Wongsawat", "Phromma", "Kaewkla", "Suwan",
      "Thongchai", "Jaidee",
    ],
  },
  FR: {
    given: [
      "Camille", "Lucas", "Manon", "Théo", "Léa", "Hugo", "Chloé", "Nathan", "Inès", "Louis", "Jade",
      "Enzo", "Clara", "Mathis", "Sarah", "Raphaël", "Louna", "Adam", "Émilie", "Gabriel",
    ],
    family: [
      "Lefebvre", "Martin", "Dubois", "Bernard", "Moreau", "Petit", "Durand", "Leroy", "Garcia", "Roux",
      "Fournier", "Girard", "Lambert", "Bonnet", "Nguyen", "Mercier",
    ],
  },
  AU: {
    given: [
      "Jack", "Mia", "Lachlan", "Zoe", "Harper", "Riley", "Charlotte", "Cooper", "Ruby", "Tom", "Isla",
      "Ethan", "Amelia", "Hamish", "Chloe", "Bailey", "Matilda", "Oscar",
    ],
    family: [
      "Thompson", "Nguyen", "Murphy", "Williams", "Lee", "Walker", "Smith", "Taylor", "Papadopoulos",
      "Wilson", "Brown", "Kelly", "Ryan", "Chen", "Anderson", "O'Brien",
    ],
  },
};

/** How a member writes their own name where other members can read it. */
export const NAME_STYLES = ["full", "initial", "handle"] as const;
export type NameStyle = (typeof NAME_STYLES)[number];

/** Roughly what a sign-up page sees: most people use their name, a third a handle. */
function pickStyle(random: RandomSource): NameStyle {
  const roll = random();
  if (roll < 0.5) return "full";
  if (roll < 0.7) return "initial";
  return "handle";
}

/** Lower-case ASCII, the way a handle is typed. */
function ascii(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .toLowerCase();
}

export type InventedName = {
  given: string;
  family: string;
  /** What other members read. */
  displayName: string;
  style: NameStyle;
};

function pick<T>(items: readonly T[], random: RandomSource): T {
  return items[Math.floor(random() * items.length)]!;
}

/** One name from a country's pool, in one of the three styles. */
export function inventName(country: CohortCountry, random: RandomSource): InventedName {
  const pool = POOLS[country];
  const given = pick(pool.given, random);
  const family = pick(pool.family, random);
  const style = pickStyle(random);

  if (style === "full") return { given, family, style, displayName: `${given} ${family}` };
  if (style === "initial") return { given, family, style, displayName: `${given} ${family[0]}.` };

  const first = ascii(given).replace(/\s+/g, "");
  const last = ascii(family).replace(/\s+/g, "");
  const handles = [
    `${first}.${last[0]}`,
    `${first}${last[0]}`,
    `${first}_${String(Math.floor(random() * 90) + 10)}`,
    `${first}.${last}`,
    `${last}${first[0]}`,
  ];
  return { given, family, style, displayName: pick(handles, random) };
}

/** Where each pool is, so a session can be placed in the member's evening. */
export const COHORT_UTC_OFFSETS: Record<CohortCountry, readonly number[]> = {
  /* Pacific, Eastern and Central, in the summer offsets a September needs. */
  CA: [-7, -4, -4, -5],
  US: [-4, -4, -5, -7],
  VN: [7],
  TH: [7],
  FR: [2],
  AU: [10],
};
