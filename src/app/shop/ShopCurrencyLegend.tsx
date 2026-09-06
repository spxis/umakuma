import Image from "next/image";

import { GAME_CURRENCY_DISPLAY, GAME_CURRENCY_VALUES } from "@/lib/gameCurrencyDomain";

/**
 * The three currencies, named once at the top of the shop.
 *
 * Not a wallet - there is no balance to show yet - just enough context that
 * a price tag reading "9 Kane" a few rows down does not need a tooltip.
 */
export default function ShopCurrencyLegend() {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {GAME_CURRENCY_VALUES.map((type) => {
        const currency = GAME_CURRENCY_DISPLAY[type];
        return (
          <li
            key={type}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3"
          >
            <Image src={currency.icon} alt="" width={40} height={40} aria-hidden="true" />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-black text-foreground">
                {currency.name}
                <span className="rounded-full border border-line bg-surface-muted px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.06em] text-foreground/60">
                  {currency.tier}
                </span>
              </p>
              <p className="truncate text-xs text-foreground/60">{currency.blurb}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
