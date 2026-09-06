import type { Metadata } from "next";

import PublicPageHeader from "@/app/shared/PublicPageHeader";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";

import { SHOP_CHARACTERS } from "./Shop.types";
import { SHOP_ITEMS, SHOP_PAGE_COPY } from "./Shop.constants";
import ShopCurrencyLegend from "./ShopCurrencyLegend";
import ShopItemCard from "./ShopItemCard";

export const metadata: Metadata = {
  title: "Shop — UmaKuma",
  description: SHOP_PAGE_COPY.subtitle,
};

/**
 * A catalogue for the currencies, before there is anything to spend.
 *
 * Public like the subject pages and Maps: it names a thing about the site
 * rather than a member's own state, so it needs no sign-in to browse. The
 * items are cosmetic and the currencies are not wired to any balance yet -
 * this exists so the mascots have somewhere to be spent once they can be.
 */
export default function ShopPage() {
  const umaItems = SHOP_ITEMS.filter((item) => item.character === SHOP_CHARACTERS.uma);
  const kumaItems = SHOP_ITEMS.filter((item) => item.character === SHOP_CHARACTERS.kuma);

  return (
    <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
      <PublicPageHeader />
      <section className="mb-3 rounded-2xl border border-line bg-surface/90 p-4 sm:p-6">
        <h1 className="text-xl font-black text-foreground sm:text-2xl">{SHOP_PAGE_COPY.title}</h1>
        <p className="mt-1 text-sm text-foreground/70">{SHOP_PAGE_COPY.subtitle}</p>
      </section>

      <div className="mb-6">
        <ShopCurrencyLegend />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-black text-foreground">{SHOP_PAGE_COPY.umaHeading}</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {umaItems.map((item) => (
            <ShopItemCard key={item.id} item={item} />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-black text-foreground">{SHOP_PAGE_COPY.kumaHeading}</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {kumaItems.map((item) => (
            <ShopItemCard key={item.id} item={item} />
          ))}
        </ul>
      </section>

      <p className="mt-6 text-center text-xs text-foreground/60">{SHOP_PAGE_COPY.comingSoonNote}</p>
    </div>
  );
}
