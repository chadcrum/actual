# Mobile Overview Page Design

**Date:** 2025-12-31
**Feature Flag:** `enableOverviewPage`
**Status:** Design Complete - Ready for Implementation

## Overview

Add an experimental mobile overview page to Actual Budget that serves as a dashboard with summary widgets. The page will be accessible via a new home button in the mobile navigation and will become the default landing page when enabled.

## Goals

- Provide a high-level budget summary for mobile users
- Create extensible dashboard framework for future widgets
- Maintain compatibility with upstream per AGENTS.md principles
- Use feature flags and seams for clean fork maintenance

## Feature Scope

### Phase 1 (Current)

- Mobile overview page with Budget Summary table
- Expanded mobile navigation (4 buttons per row instead of 3)
- Home button positioned far left
- Overview page as default landing page

### Future Phases

- Additional dashboard widgets (accounts, transactions, goals, etc.)
- Desktop web client support (flag name allows for this)

## Architecture

### Core Principles (per AGENTS.md)

1. **Feature flag gates extensions** - `enableOverviewPage` defaults to `false`
2. **Seams at layout boundaries** - Mobile navigation is the extension point
3. **Behavior in core, presentation in web** - Calculations in `loot-core`, UI in `@actual-app/web`
4. **Additive changes only** - No modifications to existing budget logic

### Component Structure

```
loot-core/
  └── src/
      ├── featureFlags.ts                    // Add enableOverviewPage flag
      └── client/data-hooks/budgets.ts       // Add useBudgetSummary() hook

packages/desktop-client/src/components/
  └── mobile/
      ├── MobileNavigation.tsx               // Add home button seam
      ├── MobileRoutes.tsx                   // Add /overview route
      └── overview/
          ├── index.ts
          ├── OverviewPage.tsx               // Main page container
          └── BudgetSummaryTable.tsx         // Budget Summary widget
```

## Feature Flag

**Location:** `packages/loot-core/src/types/prefs.ts`

Add to FeatureFlag type:

```ts
export type FeatureFlag =
  | 'goalTemplatesEnabled'
  | 'goalTemplatesUIEnabled'
  | 'actionTemplating'
  | 'formulaMode'
  | 'currency'
  | 'crossoverReport'
  | 'plugins'
  | 'forceReload'
  | 'increaseMobileBudgetTableFontSize'
  | 'enableOverviewPage';
```

Add to default state in `packages/desktop-client/src/hooks/useFeatureFlag.ts`:

```ts
const DEFAULT_FEATURE_FLAG_STATE: Record<FeatureFlag, boolean> = {
  // ... existing flags
  enableOverviewPage: false,
};
```

## Data Layer

### Budget Summary Hook

**Function:** `useBudgetSummary()`

**Returns:**

```ts
{
  spent: number;        // Total spent for current month
  budgeted: number;     // Total amount budgeted for current month
  goalTarget: number;   // Sum of all category goal targets for current month
  underfunded: number;  // Total amount needed to reach goals
  overfunded: number;   // Total overfunded across categories
}
```

**Implementation approach:**

- Reuse existing `useBudgetMonthCount()`, `useCategories()`, and budget calculation hooks
- Aggregate category-level data into totals
- Always use current month
- No new calculation logic—just aggregation of existing functions

## Mobile Navigation Changes

### Current State

- 3 buttons per row
- Icon size: ~22px

### Changes

1. **Grid layout:** Change from 3 to 4 columns when flag enabled
2. **Icon sizing:** Reduce to ~20px to fit 4 buttons comfortably
3. **Home button seam:**

```tsx
function MobileNavigation() {
  const overviewEnabled = useFeatureFlag('enableOverviewPage');

  return (
    <NavBar>
      {overviewEnabled && (
        <NavButton to="/overview" icon={<HomeIcon />} label="Overview" />
      )}
      <NavButton to="/budget" icon={<BudgetIcon />} label="Budget" />
      {/* ... other existing buttons */}
    </NavBar>
  );
}
```

**Button order (when enabled):**

1. Overview (home icon)
2. Budget
3. [Existing buttons continue...]

## Overview Page Component

### OverviewPage.tsx

**Responsibilities:**

- Main page container
- Renders page title
- Contains widget components (starting with BudgetSummaryTable)
- Uses existing mobile page layout patterns

### BudgetSummaryTable.tsx

**Responsibilities:**

- Fetch data via `useBudgetSummary()` hook
- Render 2-column table with title
- Format currency values

**Table structure:**

- **Title:** "Budget Summary" (above table)
- **Columns:** Label (left-aligned) | Value (right-aligned)
- **Rows:**
  1. Spent | $X,XXX.XX
  2. Budgeted | $X,XXX.XX
  3. Goal Target | $X,XXX.XX
  4. Underfunded | $X,XXX.XX
  5. Overfunded | $X,XXX.XX

**Styling:**

- Reuse existing mobile table components
- Match visual style of existing budget tables
- Basic padding, borders, typography
- Use `formatCurrency()` for values
- No color coding

## Routing

### Changes to FinancesApp.tsx

**New route:**

```tsx
<Route path="/overview" element={<OverviewPage />} />
```

**Default route logic:**

```tsx
function DefaultRoute() {
  const overviewEnabled = useFeatureFlag('enableOverviewPage');

  if (overviewEnabled) {
    return <Navigate to="/overview" replace />;
  }

  return <Navigate to="/budget" replace />; // Current default
}
```

## Success Criteria

- [ ] Feature flag implemented and defaulting to `false`
- [ ] `useBudgetSummary()` hook returns accurate aggregated data
- [ ] Mobile navigation displays 4 buttons per row when flag enabled
- [ ] Home button navigates to `/overview`
- [ ] Overview page is default landing page when flag enabled
- [ ] Budget Summary table displays all 5 metrics correctly
- [ ] All tests pass
- [ ] FORK_NOTES.md updated
- [ ] No merge conflicts with recent upstream changes
- [ ] Flag can be toggled without breaking existing functionality
