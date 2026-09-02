/**
 * The facts a list carries about itself.
 *
 * Every field is optional because the surfaces know different amounts: a card
 * in your own lists knows the size and the dates, a public view knows the owner
 * too, and a live list has no owner and no copy count at all.
 */
export type ListMetaFacts = {
  itemCount?: number | null;
  /** Whose list it is; left out on your own lists, where it would say you. */
  ownerName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  /** How many people keep it without owning it. */
  subscriberCount?: number;
  copyCount?: number;
  shareCount?: number;
};
