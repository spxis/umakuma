"use client";

import Image from "next/image";
import { useState } from "react";

import { GAME_CURRENCY_DISPLAY } from "@/lib/gameCurrencyDomain";

import { SHOP_PAGE_COPY } from "./Shop.constants";
import type { ShopItem } from "./Shop.types";

type Props = {
  item: ShopItem;
};

/**
 * One catalogue tile: emoji, name, description, and a price tag that draws
 * the item's own currency icon rather than a generic coin.
 *
 * "Get it" has nothing to spend against yet, so it does the honest thing
 * instead of pretending to charge a balance that does not exist: it flips to
 * a confirmed state for a moment, the way a wishlist button would, rather
 * than claiming a purchase went through.
 */
export default function ShopItemCard({ item }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const currency = GAME_CURRENCY_DISPLAY[item.currency];

  return (
    <li className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-center">
      <span className="text-4xl" aria-hidden="true">
        {item.emoji}
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-black text-foreground">{item.name}</p>
        <p className="text-xs text-foreground/60">{item.description}</p>
      </div>
      <div className="mt-auto flex w-full items-center justify-between gap-2 pt-1">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-muted px-2.5 py-1 text-xs font-black tabular-nums text-foreground">
          <Image src={currency.icon} alt="" width={18} height={18} aria-hidden="true" />
          {item.price.toLocaleString("en-CA")}
        </span>
        <button
          type="button"
          onClick={() => setConfirmed(true)}
          disabled={confirmed}
          className="inline-flex h-8 shrink-0 items-center rounded-full bg-hot px-3 text-[11px] font-black uppercase tracking-[0.08em] text-white transition hover:brightness-95 disabled:cursor-default disabled:bg-accent-2 disabled:opacity-90"
        >
          {confirmed ? SHOP_PAGE_COPY.gotIt : SHOP_PAGE_COPY.getIt}
        </button>
      </div>
    </li>
  );
}
