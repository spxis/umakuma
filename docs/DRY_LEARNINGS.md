# DRY Learnings Log

Date: 2026-04-13

## What We Learned

1. Shared formatting logic should live in one place.
- Date/time and relative-time formatting had drifted across dashboard, leaderboard, level explorer, and admin UI.
- Small wording/rounding differences (for example `min` vs `minute`, and future-time handling) increase inconsistency risk.

2. Async blank states are a UX bug, not just a styling issue.
- Empty-state messages can appear while async requests are still in flight.
- Users read this as "there is no data" instead of "data is loading."

3. Safe DRY wins are incremental.
- Start with pure utility extraction (no behavioral branching changes).
- Then migrate call sites one by one and validate quickly.

## What We Applied

1. Added a shared time-format utility.
- File: `src/lib/timeFormat.ts`
- Includes:
  - `toTimestampMs`
  - `formatDateTimeShort`
  - `formatDateShort`
  - `formatRelativeFromNow`

2. Migrated selected high-duplication call sites.
- `src/app/leaderboard/lib/leaderboardUtils.ts`
- `src/app/users/[nickname]/UserDashboardTabs.tsx`
- `src/app/users/[nickname]/level-explorer/lib/levelExplorerDisplayDates.ts`
- `src/app/admin/AdminAccountsSection.tsx`

3. Fixed async blank-state confusion in Study Explorer.
- `src/app/users/[nickname]/study-explorer/components/StudyExplorer.tsx`
- `src/app/users/[nickname]/study-explorer/components/StudyExplorerPanel.tsx`
- Added explicit loading indicator when queue fetch is ongoing and no items are yet renderable.

## Next Safe DRY Targets

1. Shared localStorage helpers/hooks:
- `get/set` flag, enum, JSON, positive-int patterns.

2. Shared persisted-toggle hook:
- Collapse/open panel states across dashboard/leaderboard/study modal.

3. Shared URL tab/query sync hook:
- Tab state + query param + popstate behavior.
