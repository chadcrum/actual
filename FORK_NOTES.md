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

### New Hook: usePinnedCategories

- **Location:** `packages/desktop-client/src/components/budget/hooks/usePinnedCategories.ts`
- **Type:** Additive
- **Purpose:** Manages pinned category preferences for the overview page
- **Features:**
  - Stores pinned category IDs in `pinnedCategoryIds` synced preference
  - Serializes/deserializes as JSON string (required by synced pref storage)
  - Provides `isPinned()` function to check if a category is pinned
  - Provides `togglePin()` function to add/remove categories from pinned list
  - Provides `getPinnedCategories()` to get full category objects in budget page order
- **Storage Format:** JSON string array (e.g., `["cat-1","cat-2"]`)
- **Error Handling:** Gracefully handles JSON parse failures, returns empty array
- **Rationale:** Centralized preference management; serialization necessary for synced pref system

### New Component: PinnedCategoriesTable

- **Location:** `packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.tsx`
- **Type:** Additive
- **Purpose:** Displays user's pinned categories in overview page
- **Features:**
  - Uses `usePinnedCategories()` hook to retrieve pinned categories
  - Shows category name and balance for each pinned category
  - Color-codes balance: green if funded (>= goal), red if underfunded (< goal)
  - Clickable rows that trigger balance menu modal
  - Empty state message when no categories are pinned
  - Maintains budget page category order
- **Props:**
  - `onCategoryClick: (categoryId: string) => void` - Handler when category row clicked
- **Rationale:** Provides quick access to important categories; visual status indicator helps users prioritize

### New Component: PinToOverviewCheckbox

- **Location:** `packages/desktop-client/src/components/modals/PinToOverviewCheckbox.tsx`
- **Type:** Additive (integrated into balance menu modal)
- **Purpose:** Checkbox UI for pinning/unpinning categories to overview
- **Features:**
  - Checkbox with label "Pin to Overview"
  - Uses `usePinnedCategories()` hook to manage state
  - Integrated at bottom of balance menu modal
  - Controlled component reflecting current pin state
- **Props:**
  - `categoryId: string` - Category being pinned/unpinned
  - `theme: { pillBorder, menuItemText }` - Theme colors
- **Rationale:** Intuitive UI for users to control overview display; placed near category details for context

### Integration Points: OverviewPage

- **Location:** `packages/desktop-client/src/components/mobile/overview/OverviewPage.tsx`
- **Modified:** Imports and renders PinnedCategoriesTable
- **Features:**
  - Renders PinnedCategoriesTable after BudgetSummaryTable
  - Handles `onCategoryClick` by dispatching balance menu modal
  - Passes current month and budget type to modal
- **Rationale:** Complete overview showing both summary and user-selected categories

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

### Pinned Categories Feature Architecture

**Why Synced Preference for Storage?**

- Users want pinned categories to persist across devices
- Synced preferences automatically sync via cloud
- Fits existing Actual Budget preference system
- No new storage mechanism required

**Why JSON Serialization?**

- Synced preference system stores all values as strings
- JSON format is standard, human-readable if debugging
- Parsed at hook level, not scattered across components
- Type-safe through TypeScript and error handling

**Why Hook-Based Pattern?**

- `usePinnedCategories` centralizes all pin logic
- Easy to reuse across multiple UI surfaces
- Separates preference management from presentation
- Testable independently from components

**Why Checkbox in Balance Menu?**

- Users naturally open balance menu to manage categories
- Proximity to category details provides context
- Minimal UI disruption (single checkbox)
- Follows existing Actual Budget modal patterns

**Why Color-Coded Balance in Table?**

- Visual indicator helps users prioritize underfunded categories
- Green (funded) vs Red (underfunded) is intuitive
- No additional configuration needed
- Motivates users to pin important goals

**Why Maintain Budget Page Order?**

- Consistency with main budget interface
- Users already familiar with category organization
- Avoids complexity of custom sorting
- Automatic if users pin sequentially

## File Changes Summary

### Modified Files

1. `packages/loot-core/src/types/prefs.ts` - Added 'enableOverviewPage' to FeatureFlag type; added 'pinnedCategoryIds' to SyncedPrefs
2. `packages/desktop-client/src/hooks/useFeatureFlag.ts` - Added default state
3. `packages/desktop-client/src/components/FinancesApp.tsx` - Added route and imports
4. `packages/desktop-client/src/components/mobile/MobileNavTabs.tsx` - Added home button and dynamic columns
5. `packages/desktop-client/src/components/settings/Experimental.tsx` - Added feature toggle
6. `packages/desktop-client/src/components/mobile/overview/OverviewPage.tsx` - Added PinnedCategoriesTable import and rendering

### Created Files

1. `packages/desktop-client/src/hooks/useBudgetSummary.ts` - Budget data aggregation
2. `packages/desktop-client/src/components/mobile/overview/OverviewPage.tsx` - Main page component
3. `packages/desktop-client/src/components/mobile/overview/BudgetSummaryTable.tsx` - Budget summary table
4. `packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.tsx` - Pinned categories display
5. `packages/desktop-client/src/components/mobile/overview/index.ts` - Module exports
6. `packages/desktop-client/src/components/budget/hooks/usePinnedCategories.ts` - Pinned category state management
7. `packages/desktop-client/src/components/modals/PinToOverviewCheckbox.tsx` - Pin checkbox UI
8. `packages/desktop-client/src/components/budget/hooks/usePinnedCategories.test.ts` - Hook unit tests
9. `packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.test.tsx` - Component unit tests
10. `packages/desktop-client/src/components/mobile/overview/PinnedCategories.integration.test.tsx` - Integration tests
11. `docs/plans/2025-12-31-mobile-overview-page-design.md` - Design document
12. `docs/plans/2025-12-31-mobile-overview-page.md` - Implementation plan

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

## Pinned Categories: For Future Maintainers

### How JSON Serialization Works

The `pinnedCategoryIds` preference demonstrates a pattern for storing complex data in the synced preference system:

1. **Storing:** When pinning a category, `usePinnedCategories` calls `JSON.stringify(newPinnedIds)` to convert the array to a string
2. **Retrieving:** The raw string is read from `useSyncedPref('pinnedCategoryIds')`
3. **Parsing:** `useMemo` deserializes with `JSON.parse()`, handling errors gracefully
4. **Updating:** Changes trigger re-serialization and save via `savePinnedCategoryIds()`

This pattern can be reused for any complex preference data:

- Favorite accounts list
- Custom sort orders
- Widget configuration objects
- User dashboard layouts

### How to Add Similar Features

If adding new pin-able items or user preferences:

1. Add preference name to `SyncedPrefs` type in `packages/loot-core/src/types/prefs.ts`
2. Create a custom hook following `usePinnedCategories` pattern:
   - Use `useSyncedPref()` to get/save preference
   - Parse JSON in `useMemo` with error handling
   - Expose helper functions for operations
3. Create presentation component using the hook
4. Integrate component where users need the UI
5. Add tests for both hook logic and component rendering

### Important Notes for Maintenance

**JSON Parse Errors:** The hook gracefully handles JSON parse failures by returning an empty array. This prevents crashes if the preference gets corrupted. Users will just see an empty state, which is safe.

**Category Existence:** `getPinnedCategories()` filters categories; if a pinned ID no longer exists, it's silently removed from display. No cleanup needed - the stale ID remains in the preference but doesn't break anything.

**Order Preservation:** Pinned categories maintain budget page order, not pin order. This means sorting categories on the budget page automatically resorts the pinned categories too.

**Cross-Device Sync:** Pinned categories sync via the normal synced preference mechanism. Test with multiple devices to ensure sync works as expected.

**Performance:** The hook uses `useMemo` and `useCallback` to prevent unnecessary re-renders. If many categories are pinned (100+), consider profiling to verify acceptable performance.

## Known Limitations

1. **Goal Tracking:** Overfunded/Underfunded calculations are simplified to total budgeted vs. total goals, not per-category
2. **Mobile Only:** Feature currently only renders on mobile width; WideNotSupported wrapper prevents desktop rendering
3. **Current Month Only:** Always shows current month data, no date selection UI yet
4. **Budget Type Dependent:** Uses user's selected budget type (envelope or tracking)
5. **Pinned Categories Order:** Pinned categories follow budget page order, not customizable pin order

## Testing Notes

### Overview Page

- Verify overview page loads when flag is enabled on mobile
- Confirm default route redirects to /overview (mobile only, flag enabled)
- Check that navigation has 4 columns when flag enabled
- Verify budget values match budget page totals
- Test with both envelope and tracking budget types
- Test on various mobile viewport sizes

### Pinned Categories

- Open balance menu modal and verify "Pin to Overview" checkbox appears
- Pin a category and verify it appears in PinnedCategoriesTable on overview
- Unpin a category and verify it's removed from PinnedCategoriesTable
- Verify empty state message appears when no categories are pinned
- Pin multiple categories and verify they maintain budget page order
- Click a pinned category row and verify balance menu opens for that category
- Verify pinned categories sync across devices (requires multi-device testing)
- Test with categories that have goals vs. no goals
- Verify color coding: green for funded categories, red for underfunded
- Test pinning/unpinning rapidly to verify hook handles state changes correctly
- Delete a pinned category on budget page and verify it gracefully disappears from overview

## Maintenance Notes

- Test overview page after each upstream merge
- Verify budget calculations match budget page after upstream changes
- Check mobile navigation layout on various viewports
- Monitor for navigation performance issues (3 vs 4 columns)
- After upstream merges affecting balance menu modal: verify PinToOverviewCheckbox still renders and works
- Check that `pinnedCategoryIds` preference is preserved across upgrades
- Verify synced preference system still handles JSON serialization correctly
- Test pinned categories after category system changes (renaming, deleting, merging)
- Monitor console for JSON parse errors in usePinnedCategories hook
- Update FORK_NOTES after any changes to this feature

## Warning Signs

If any of these occur, re-evaluate approach:

- Merge conflicts in MobileNavTabs or FinancesApp on upstream sync
- Merge conflicts in balance menu modal affecting PinToOverviewCheckbox integration
- Feature flag causes deep branching in budget calculation code
- Removing flag requires large refactor
- Overview page becomes significantly slower than budget page
- JSON serialization issues occur with pinned categories preference
- Multiple error messages about "Failed to parse pinnedCategoryIds preference" in console
- Pinned categories don't sync across devices after upstream changes to preference system

## Branches and Tags

- Feature branch: `feature/mobile-overview-page`
- Design document: `docs/plans/2025-12-31-mobile-overview-page-design.md`
- Implementation plan: `docs/plans/2025-12-31-mobile-overview-page.md`
