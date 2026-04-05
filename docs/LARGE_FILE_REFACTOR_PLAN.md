# Large File Refactor Plan

## Goals

- Reduce file size and cognitive load in explorer components.
- Keep behavior and URL/state persistence stable during extraction.
- Ship incrementally with production-safe checkpoints.

## Current Hotspots

- `src/app/users/[nickname]/LevelExplorer.tsx` (~2300+ LOC)
- `src/app/LeaderboardTable.tsx` (~700+ LOC)
- `src/app/users/[nickname]/JlptExplorer.tsx` (~700+ LOC)

## Extraction Strategy

Work in thin vertical slices: extract one UI section at a time with typed props and no behavior changes in the same commit.

## Phase 1: Level Explorer Core Split

### 1. Extract URL/filter state

Create `src/app/users/[nickname]/levelExplorerState.ts`:
- URL parse/write helpers
- filter types/constants
- localStorage key helpers

Acceptance:
- Reload preserves filter/selection/search behavior exactly.

### 2. Extract filtering/search engine

Create `src/app/users/[nickname]/levelExplorerSearch.ts`:
- `itemMatchesSearch`
- filtered-item selectors
- search result sorting and level set derivation

Acceptance:
- Search results count and selected level behavior unchanged.

### 3. Extract filter header UI

Create `src/app/users/[nickname]/LevelExplorerFilters.tsx`:
- level chips
- SRS/type/JLPT/review timing controls
- collapsed/expanded section

Acceptance:
- Button layout and counts unchanged.
- Clicking any control still clears drilldown where intended.

### 4. Extract grid card UI

Create `src/app/users/[nickname]/LevelSubjectCard.tsx`:
- single card rendering
- status badges
- selected-state indicator

Acceptance:
- Card visuals identical on light/dark theme.

### 5. Extract detail panel UI

Create `src/app/users/[nickname]/LevelSubjectDetail.tsx`:
- metadata section
- meaning/reading explanation boxes
- relation panel composition via existing `LevelRelatedPanels`

Acceptance:
- Drilldown parity with current implementation.

Target outcome:
- `LevelExplorer.tsx` reduced to orchestration container, <900 LOC.

## Phase 2: JLPT Explorer Split

### 1. Extract detail panels

Create `src/app/users/[nickname]/JlptDetailPanels.tsx`:
- readings/metadata cards
- dictionary notes
- used-in-words list

### 2. Extract card grid item

Create `src/app/users/[nickname]/JlptKanjiCard.tsx`:
- heading + badge + status + reading summary

### 3. Extract JLPT filter/search header

Create `src/app/users/[nickname]/JlptExplorerFilters.tsx`:
- N-level toggles
- WK membership filters
- sticky mode

Target outcome:
- `JlptExplorer.tsx` <350 LOC.

## Phase 3: Leaderboard Table Split

### 1. Extract row view models

Create `src/app/leaderboardViewModel.ts`:
- score/status formatting
- rank helpers

### 2. Extract row components

Create:
- `src/app/LeaderboardRowDesktop.tsx`
- `src/app/LeaderboardRowMobile.tsx`

### 3. Extract expandable details

Create `src/app/LeaderboardRowDetails.tsx`.

Target outcome:
- `LeaderboardTable.tsx` <350 LOC.

## Guardrails

- Preserve public prop contracts unless extraction requires new types.
- No visual redesign while splitting; only structure changes.
- Keep each extraction commit build-green.
- Add tiny snapshot checks where practical for pure format helpers.

## Suggested Commit Sequence

1. state helpers + wire in LevelExplorer
2. search helpers + wire in LevelExplorer
3. filter header component
4. card component
5. detail component
6. JLPT split (filters/cards/detail)
7. leaderboard split
