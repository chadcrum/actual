# Fork Notes

This document tracks custom modifications to Actual Budget for the mobile overview page feature, following AGENTS.md principles.

## Added Feature Flags

### enableOverviewPage

- **Type:** boolean (default: false)
- **Location:** `packages/loot-core/src/types/prefs.ts`
- **Default State:** `packages/desktop-client/src/hooks/useFeatureFlag.ts`
- **Purpose:** Enables mobile overview dashboard with budget summary
- **Rationale:** Provides high-level budget overview for mobile users; framework for future dashboard widgets
- **Settings UI:** `packages/desktop-client/src/components/settings/Experimental.tsx`

## Added Seams

### Mobile Navigation Extension Point

- **Location:** `packages/desktop-client/src/components/mobile/MobileNavTabs.tsx`
- **Type:** Conditional rendering based on feature flag
- **Implementation:**
  - Column count changes from 3 to 4 when flag enabled
  - Home button prepended to navTabs array when flag enabled
  - Icon size reduced from 22px to 20px for better 4-column fit
- **Rationale:** Allows adding navigation buttons without modifying core navigation structure

### Default Route Seam

- **Location:** `packages/desktop-client/src/components/FinancesApp.tsx`
- **Type:** Conditional route based on feature flag
- **Implementation:** Default route (`/`) redirects to `/overview` on mobile when flag enabled
- **Rationale:** Makes overview page default landing experience for mobile users

### Overview Page Route

- **Location:** `packages/desktop-client/src/components/FinancesApp.tsx`
- **Type:** New mobile-only route
- **Path:** `/overview`
- **Component:** `OverviewPage` from `packages/desktop-client/src/components/mobile/overview`
- **Rationale:** Dedicated route for overview dashboard, isolated from existing pages

## Core Changes

### New Hook: useBudgetSummary

- **Location:** `packages/desktop-client/src/hooks/useBudgetSummary.ts`
- **Type:** Additive
- **Purpose:** Aggregates budget data for current month across all categories
- **Dependencies:**
  - `useCategories()` - Get all categories
  - `useSheetValue()` - Read budget spreadsheet values
  - `useSyncedPref()` - Get budget type preference
  - `envelopeBudget` and `trackingBudget` bindings
- **Returns:**
  - `spent`: Total spent for current month (from spreadsheet total-spent)
  - `budgeted`: Total budgeted for current month (from spreadsheet total-budgeted)
  - `goalTarget`: Sum of all category goals (from category.goal)
  - `underfunded`: Amount needed to reach goals (goalTarget - budgeted if positive)
  - `overfunded`: Amount overfunded beyond goals (budgeted - goalTarget if positive)
- **Rationale:** Provides single source of budget summary data; reuses existing calculation logic

### New Component: OverviewPage

- **Location:** `packages/desktop-client/src/components/mobile/overview/OverviewPage.tsx`
- **Type:** Additive (mobile-only)
- **Purpose:** Container for dashboard widgets
- **Features:**
  - Renders mobile page header with title
  - Contains BudgetSummaryTable widget
  - Comment for future widget additions
  - Respects MOBILE_NAV_HEIGHT for padding
- **Rationale:** Extensible dashboard framework for future widgets

### New Component: BudgetSummaryTable

- **Location:** `packages/desktop-client/src/components/mobile/overview/BudgetSummaryTable.tsx`
- **Type:** Additive
- **Purpose:** Displays budget summary metrics in 2-column table
- **Features:**
  - Uses `useBudgetSummary()` hook for data
  - Uses `useFormat()` for currency formatting
  - Simple 2-column layout (label | value)
  - Shows: Spent, Budgeted, Goal Target, Underfunded, Overfunded
- **Rationale:** First widget in overview dashboard; simple presentation of aggregated data

### Export Module: overview/index.ts

- **Location:** `packages/desktop-client/src/components/mobile/overview/index.ts`
- **Type:** Additive
- **Purpose:** Centralized exports for overview components
- **Exports:** OverviewPage, BudgetSummaryTable

## Design Decisions

### Why Feature Flag Instead of Permanent Addition?

- Allows testing and iteration before upstreaming consideration
- Easy rollback if issues arise
- Follows AGENTS.md principle of flags gating extensions
- No impact on users until explicitly enabled

### Why Mobile-Only?

- Mobile users benefit most from quick overview screen
- Desktop has more screen space for detailed budget view
- Can extend to desktop later if valuable (flag name supports this)
- WideNotSupported wrapper prevents desktop rendering

### Why Reuse Existing Budget Calculations?

- DRY principle - single source of truth for budget data
- Reduces maintenance burden
- Ensures consistency with budget page
- Leverages battle-tested spreadsheet formulas

### Why Make Overview Default Landing Page?

- Overview provides best first impression of budget status
- Users can quickly see financial health without navigation
- Budget page still easily accessible via nav
- Only applies when flag is enabled and on mobile

### Why useSheetValue for Totals?

- Direct access to spreadsheet calculated values
- Respects both envelope and tracking budget types
- Always current (reactive to changes)
- Follows existing patterns in BudgetTable

### Why Sum Category Goals for Goal Target?

- Categories contain goal information
- Simple aggregation at component level
- Avoids complex spreadsheet cell references
- Falls back to 0 for categories without goals

## File Changes Summary

### Modified Files

1. `packages/loot-core/src/types/prefs.ts` - Added 'enableOverviewPage' to FeatureFlag type
2. `packages/desktop-client/src/hooks/useFeatureFlag.ts` - Added default state
3. `packages/desktop-client/src/components/FinancesApp.tsx` - Added route and imports
4. `packages/desktop-client/src/components/mobile/MobileNavTabs.tsx` - Added home button and dynamic columns
5. `packages/desktop-client/src/components/settings/Experimental.tsx` - Added feature toggle

### Created Files

1. `packages/desktop-client/src/hooks/useBudgetSummary.ts` - Budget data aggregation
2. `packages/desktop-client/src/components/mobile/overview/OverviewPage.tsx` - Main page component
3. `packages/desktop-client/src/components/mobile/overview/BudgetSummaryTable.tsx` - Budget summary table
4. `packages/desktop-client/src/components/mobile/overview/index.ts` - Module exports
5. `docs/plans/2025-12-31-mobile-overview-page-design.md` - Design document
6. `docs/plans/2025-12-31-mobile-overview-page.md` - Implementation plan

## Future Considerations

### Additional Widgets

Framework supports adding:

- Account balances overview
- Recent transactions
- Savings goals progress
- Net worth summary
- Spending trends

### Desktop Support

Flag name (`enableOverviewPage`) allows extending to desktop web client if valuable.

### Enhanced Calculations

More precise budget tracking could include:

- Per-category goal tracking
- Time-series data for trends
- Forecast calculations
- Custom metric definitions

### Performance Optimization

If many widgets added:

- Memoization of expensive calculations
- Lazy loading of widget data
- Pagination for transaction lists

### Upstreaming Potential

Navigation seam pattern could be useful to upstream Actual for plugin/extension support.

## Known Limitations

1. **Goal Tracking:** Overfunded/Underfunded calculations are simplified to total budgeted vs. total goals, not per-category
2. **Mobile Only:** Feature currently only renders on mobile width; WideNotSupported wrapper prevents desktop rendering
3. **Current Month Only:** Always shows current month data, no date selection UI yet
4. **Budget Type Dependent:** Uses user's selected budget type (envelope or tracking)

## Testing Notes

- Verify overview page loads when flag is enabled on mobile
- Confirm default route redirects to /overview (mobile only, flag enabled)
- Check that navigation has 4 columns when flag enabled
- Verify budget values match budget page totals
- Test with both envelope and tracking budget types
- Test on various mobile viewport sizes

## Maintenance Notes

- Test overview page after each upstream merge
- Verify budget calculations match budget page after upstream changes
- Check mobile navigation layout on various viewports
- Monitor for navigation performance issues (3 vs 4 columns)
- Update FORK_NOTES after any changes to this feature

## Warning Signs

If any of these occur, re-evaluate approach:

- Merge conflicts in MobileNavTabs or FinancesApp on upstream sync
- Feature flag causes deep branching in budget calculation code
- Removing flag requires large refactor
- Overview page becomes significantly slower than budget page

## Branches and Tags

- Feature branch: `feature/mobile-overview-page`
- Design document: `docs/plans/2025-12-31-mobile-overview-page-design.md`
- Implementation plan: `docs/plans/2025-12-31-mobile-overview-page.md`
