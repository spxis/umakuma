import type { AdminAccountDetail, AdminActivitySummary, AdminRestStanding } from "@/lib/adminAccountDetail.types";

import { ADMIN_USER_DETAIL_COPY as COPY, ADMIN_USER_DETAIL_STYLES as S } from "./AdminUserDetail.constants";
import { activityFacts, vacationState } from "./adminUserDetail.helpers";

/**
 * How a member is actually getting on, as against what their row says.
 *
 * The away notice sits at the top of the card rather than in the grid below
 * it, because it is the one fact that changes how everything under it should
 * be read: a streak that has not counted today and a member who is in Japan
 * are not the same worry, and an admin scanning the page needs to know which
 * one they are looking at before they read the numbers.
 */
export default function AdminUserActivity({
  account,
  activity,
  rest,
}: {
  account: AdminAccountDetail;
  activity: AdminActivitySummary;
  rest: AdminRestStanding;
}) {
  const vacation = vacationState(rest);

  return (
    <section className={S.card}>
      <h2 className={S.heading}>{COPY.activity.heading}</h2>
      <p className={S.blurb}>{COPY.activity.blurb}</p>

      {vacation.status === "home" ? null : (
        <div
          className={`mt-3 rounded-xl border px-3 py-2 ${
            vacation.status === "overdue"
              ? "border-amber-300 bg-amber-50"
              : "border-sky-300 bg-sky-50"
          }`}
        >
          <p
            className={`text-[12px] font-black ${
              vacation.status === "overdue" ? "text-amber-800" : "text-sky-800"
            }`}
          >
            {vacation.heading}
          </p>
          {vacation.lines.map((line) => (
            <p
              key={line}
              className={`mt-0.5 text-[11px] font-semibold ${
                vacation.status === "overdue" ? "text-amber-800" : "text-sky-800"
              }`}
            >
              {line}
            </p>
          ))}
        </div>
      )}

      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {activityFacts(account, activity, rest).map((fact) => (
          <div key={fact.label} className="min-w-0 border-b border-line/60 pb-1.5">
            <dt className={S.label}>{fact.label}</dt>
            <dd className="mt-0.5 break-words text-[13px] font-semibold text-foreground">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
