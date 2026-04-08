# Large File Refactor Plan (Revised)

## Objectives

- Reduce component size and cognitive load while preserving all current behavior.
- Stabilize explorer and leaderboard contracts before UI extraction.
- Ship in small, reversible PR slices with explicit verification gates.

## Scope

In scope:
- Level explorer refactor.
- JLPT explorer refactor.
- Leaderboard table refactor.
- Shared type/helper extraction needed to support those refactors.

Out of scope:
- Visual redesign.
- API schema changes.
- New product behavior.

## Current Hotspots

- `src/app/users/[nickname]/LevelExplorer.tsx` (~2300+ LOC)
- `src/app/LeaderboardTable.tsx` (~700+ LOC)
- `src/app/users/[nickname]/JlptExplorer.tsx` (~700+ LOC)

## Extraction Strategy

Work in thin vertical slices with stable contracts: extract shared types/utilities first, then state/data logic, then presentational components. Avoid behavior changes in refactor PRs.

## Phase 0: Baseline and Behavioral Contract Lock

- Capture a behavior matrix for current UX:
	- URL param sync and browser back/forward behavior.
	- localStorage hydration and persistence behavior.
	- Cross-tab search event flow and completion events.
	- Detail panel placement rules in responsive grids.
- Add a temporary refactor checklist to PR template text (or this plan) and use it on each slice.

Acceptance criteria:
- Written behavior matrix exists and is reviewed.
- Manual baseline scenarios are documented and reproducible.

Verification:
- `pnpm lint`
- `pnpm build`
- Manual baseline run on desktop and mobile widths.

### Phase 0 Baseline Behavior Matrix (PR1)

Use this checklist before and after each PR slice.

| Area | Scenario | Expected Result | Status |
| --- | --- | --- | --- |
| Level Explorer URL | Open deep link with `tab=level`, `levels`, `subject`, `srs`, `type`, `jlpt`, `review`, `sticky` | UI state matches URL on first render | [ ] |
| Level Explorer History | Change multiple filters, then browser Back/Forward | State restores correctly in sequence | [ ] |
| Level Explorer Persistence | Set SRS/JLPT/review filters, reload page | Persisted filters rehydrate unless URL overrides | [ ] |
| Level Explorer Search | Trigger search from shared bar, clear query | Results, selection, and badges update consistently | [ ] |
| Level Detail Placement | Select cards across different grid columns (desktop/mobile) | Detail panel inserts at correct row boundary | [ ] |
| Related Navigation | Open related item jump (radicals, visually similar, vocab) | Target level/item selected and visible | [ ] |
| JLPT URL | Open deep link with `tab=jlpt`, `findJlpt`, `jlptKanji` | Query and selected detail are restored | [ ] |
| JLPT Search Events | Switch tabs with active query | Correct scope receives search event | [ ] |
| Leaderboard Expansion | Expand/collapse rows, refresh page | Expanded row state persists for valid rows | [ ] |
| Leaderboard Panels | Toggle item spread/level progress panels | Panel open/closed state persists after reload | [ ] |
| Leaderboard Mobile/Desktop | Validate same account on desktop and mobile widths | Data parity across both layouts | [ ] |

Notes:
- Record any mismatches as follow-up bugfix PRs, not in refactor PRs.
- Keep this matrix updated as behavior contracts are clarified.

## Phase 1: Shared Domain Types and Pure Utilities First

- Extract duplicate types and pure helpers used by multiple files before UI splits.
- Consolidate repeated model guards/formatters only when behavior is identical.
- Keep exports stable and migrate call sites incrementally.

Acceptance criteria:
- No runtime behavior changes.
- All affected call sites compile against shared types/utilities.
- Diff is mostly moves and import rewiring.

Verification:
- `pnpm lint`
- `pnpm build`
- Smoke test leaderboard page and user explorer page.

## Phase 2: Level Explorer State and Data Engine Split

- Extract state and persistence engine from `LevelExplorer.tsx`:
	- URL parse/write.
	- localStorage read/write keys and hydration.
	- Selection/filter transitions.
- Extract data/filter/search engine:
	- Search matching.
	- Filter pipelines and counts.
	- Level loading orchestration wrappers.
- Keep current UI markup in place during this phase.

Acceptance criteria:
- URL and localStorage behavior is unchanged.
- Search results/counts and level-loading behavior are unchanged.
- Browser back/forward restores equivalent state.

Verification:
- `pnpm lint`
- `pnpm build`
- Manual scenarios:
	- Deep link with levels/subject/srs/type/jlpt/review/sticky.
	- Search + clear + back navigation.
	- Sticky merge on/off transitions.
	- Related-item jump across levels.

## Phase 3: Level Explorer Presentational Split

- Extract pure presentational components after state engine is stable:
	- Filter header.
	- Grid card.
	- Detail panel.
	- Related reference card renderers.
- Keep container responsible for orchestration only.

Acceptance criteria:
- Visual parity for cards/detail/filter sections.
- Selection and detail insertion behavior remains unchanged.
- Container owns orchestration, children are mostly props-in/render-out.

Verification:
- `pnpm lint`
- `pnpm build`
- Manual comparison of representative levels and subject types.

## Phase 4: JLPT Explorer Split

- Extract JLPT filter/search state helpers and pure selectors.
- Extract JLPT card and detail panel components.
- Preserve URL coupling behavior and custom-event search contract.

Acceptance criteria:
- `findJlpt` and `jlptKanji` URL behavior unchanged.
- JLPT search and matching semantics unchanged.
- Card/detail behavior and insertion point parity maintained.

Verification:
- `pnpm lint`
- `pnpm build`
- Manual scenarios:
	- Query via shared search bar.
	- Toggle sticky levels and N-level filters.
	- Select/deselect detail and browser back/forward.

## Phase 5: Leaderboard Split

- Extract row view-model helpers from table component.
- Split desktop row, mobile card, and expanded details panel.
- Keep sorting/display semantics unchanged.

Acceptance criteria:
- Desktop and mobile layouts render equivalent data.
- Expanded state persistence behavior unchanged.
- Delta and JLPT completion displays remain consistent.

Verification:
- `pnpm lint`
- `pnpm build`
- Manual desktop/mobile checks with expand/collapse persistence.

## Phase 6: Hardening and Cleanup

- Remove dead code and temporary compatibility wrappers.
- Normalize naming and module boundaries.
- Update architecture/refactor docs with final module map.

Acceptance criteria:
- No TODO placeholders remain in refactor paths.
- All checks pass and manual scenario checklist passes.
- Final file-size and responsibility targets are met.

Verification:
- `pnpm lint`
- `pnpm build`
- Full manual sanity pass on home, user explorer, and API-powered level loading.

## Rollback Strategy

- Use one feature area per PR slice and avoid mixed concerns.
- If regression appears:
	- Revert the latest PR slice only.
	- Keep prior extracted pure modules if they are behavior-neutral and verified.
	- Re-run baseline behavior matrix before resuming.
- No data migrations or API contract changes during this refactor, so rollback remains code-only.

## Definition of Done

- All phases complete with acceptance criteria satisfied.
- `pnpm lint` and `pnpm build` pass on each merged slice.
- Manual behavior matrix passes for:
	- Explorer URL/state persistence.
	- Shared search event flow.
	- Level/JLPT detail insertion behavior.
	- Leaderboard desktop/mobile/expanded states.
- `LevelExplorer.tsx`, `JlptExplorer.tsx`, and `LeaderboardTable.tsx` are orchestration-first containers with extracted pure modules/components.
- Refactor documentation is updated with final file map and ownership boundaries.

## Suggested PR Slicing Strategy

1. PR1: Baseline matrix + no-op guard rails + initial shared type module introduction.
2. PR2: Level explorer URL/localStorage state extraction only.
3. PR3: Level explorer search/filter/selectors extraction only.
4. PR4: Level explorer UI split (filters + card + detail) with no logic changes.
5. PR5: JLPT selectors/state extraction.
6. PR6: JLPT UI split (filters + card + detail).
7. PR7: Leaderboard view-model extraction and desktop/mobile/details split.
8. PR8: Cleanup, dead-code removal, and doc finalization.
