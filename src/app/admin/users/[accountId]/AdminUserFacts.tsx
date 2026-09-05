import type { AdminAccountDetail } from "@/lib/adminAccountDetail.types";

import { ADMIN_USER_DETAIL_COPY as COPY, ADMIN_USER_DETAIL_STYLES as S } from "./AdminUserDetail.constants";
import { accountFacts } from "./adminUserDetail.helpers";

/**
 * The account as it stands, read-only.
 *
 * A definition list rather than a table: these are twenty-odd labelled values,
 * not rows of one kind of thing, and `dl` is what a screen reader announces
 * correctly at any width. The grid collapses to one column on a phone, where
 * two columns of long timestamps become unreadable before they become narrow.
 */
export default function AdminUserFacts({ account }: { account: AdminAccountDetail }) {
  return (
    <section className={S.card}>
      <h2 className={S.heading}>{COPY.facts.heading}</h2>
      <p className={S.blurb}>{COPY.facts.blurb}</p>

      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {accountFacts(account).map((fact) => (
          <div key={fact.label} className="min-w-0 border-b border-line/60 pb-1.5">
            <dt className={S.label}>{fact.label}</dt>
            <dd className="mt-0.5 break-words text-[13px] font-semibold text-foreground">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
