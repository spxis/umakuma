import Link from "next/link";
import { getServerSession } from "next-auth";

import MemberPageHeader from "@/app/shared/MemberPageHeader";
import PublicPageHeader from "@/app/shared/PublicPageHeader";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { DASHBOARD_PAGE_HEADERS } from "@/app/users/[nickname]/dashboardPageHeaders";
import { authOptions } from "@/lib/auth";

import { loadXpEarnRows } from "../lib/xpEarnServer";
import { XP_EARN_COPY as copy } from "../xpBoardCopy";

export const dynamic = "force-dynamic";

export const metadata = { title: `${copy.title} — UmaKuma` };

/**
 * Every way to earn XP, with what each one pays.
 *
 * The page a member opens to ask "why did I get three XP for that", and the
 * one SPX had as How to Gain XP. Generated from `XpType` rather than written
 * out, because the prices are data an admin can retune from the site and a
 * hand-written list would be wrong the first time somebody did.
 *
 * Public: how the site works is not a member's private business, and somebody
 * deciding whether to join should be able to read it.
 */
export default async function XpEarnPage() {
  await getServerSession(authOptions);
  const rows = await loadXpEarnRows();

  return (
    <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
      <PublicPageHeader />

      <main className={`${PAGE_WIDTH.reading} space-y-4`}>
        <MemberPageHeader
          icon={DASHBOARD_PAGE_HEADERS.stats.icon}
          title={copy.title}
          subtitle={copy.subtitle}
          actions={
            <Link
              href="/xp"
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-black text-foreground hover:text-accent"
            >
              {copy.back}
            </Link>
          }
        />

        <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold leading-relaxed text-foreground/75">{copy.blurb}</p>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-foreground/60">
            {copy.capNote}
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-black text-foreground">{copy.count(rows.length)}</h2>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm font-semibold text-foreground/60">{copy.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[30rem] text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">
                    <th className="pb-2" scope="col">{copy.columns.what}</th>
                    <th className="pb-2 text-right" scope="col">{copy.columns.amount}</th>
                    <th className="pb-2 text-right" scope="col">{copy.columns.cap}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 align-top">
                        <span className="block font-bold text-foreground">{row.label}</span>
                        <span className="block text-[11px] font-semibold text-foreground/60">
                          {row.note}
                        </span>
                      </td>
                      <td className="py-2 text-right align-top font-black tabular-nums text-foreground">
                        {row.amount.toLocaleString()}
                      </td>
                      <td className="py-2 text-right align-top text-xs font-semibold tabular-nums text-foreground/60">
                        {row.dailyCap === null ? copy.uncapped : copy.capped(row.dailyCap)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
