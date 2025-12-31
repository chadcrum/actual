# Pinned Categories Feature Design

**Date:** 2026-01-01
**Feature Flag:** `enableOverviewPage` (existing)
**Status:** Design Complete - Ready for Implementation

## Overview

Add category pinning functionality to the mobile overview page. Users can pin individual budget categories via a checkbox in the balance modal on the budget page. Pinned categories appear in a new "Pinned Categories" widget on the overview page, displayed below the Budget Summary table.

## Goals

- Provide quick access to key budget categories from the overview page
- Maintain flexibility with no limit on pinned categories
- Preserve budget page ordering in pinned categories display
- Follow AGENTS-chad-fork.md principles for sustainable fork maintenance
- Integrate seamlessly with existing overview page feature

## Feature Scope

### Core Functionality

- Pin/unpin individual budget categories (not groups)
- Display pinned categories in new widget on overview page
- Show category balance with goal-based color coding
- Persist pinned state across devices via user preferences
- Open balance modal when tapping pinned category

### User Flow

1. User navigates to budget page
2. Taps on category balance to open balance modal
3. Sees "Pin to Overview" checkbox at bottom of modal
4. Checks checkbox to pin category
5. Returns to overview page to see pinned category listed
6. Taps pinned category to reopen modal and view details or unpin

## Architecture

### Core Principles (per AGENTS-chad-fork.md)

1. **Additive, not modificative**
   - Add new preference for pinned category IDs
   - Add new widget component to overview page
   - Add checkbox to existing balance modal (single seam)
   - No changes to existing budget calculation logic

2. **Feature flag gating**
   - Uses existing `enableOverviewPage` flag
   - All pinned categories functionality only available when flag is enabled

3. **Data layer (loot-core) + Presentation (web)**
   - **loot-core**: Preference storage and retrieval for pinned category IDs
   - **@actual-app/web**: UI components for pinning and display

4. **Seam at layout boundary**
   - Overview page is already a seam point
   - Balance modal is an existing component boundary
   - New widget slots into existing overview page layout

### Component Structure

```
loot-core/
  └── src/
      └── types/
          └── prefs.ts                           // Add pinnedCategoryIds preference

packages/desktop-client/src/components/
  └── budget/
      └── hooks/
          └── usePinnedCategories.ts             // New hook for pin management
  └── mobile/
      ├── budget/
      │   └── BalanceMenu.tsx                    // Add pin checkbox (modify)
      └── overview/
          ├── OverviewPage.tsx                   // Add PinnedCategoriesTable (modify)
          └── PinnedCategoriesTable.tsx          // New widget component
```

## Data Layer

### Preference Storage

**Preference key**: `pinnedCategoryIds`
**Type**: `string[]` (array of category IDs)
**Location**: User preferences (syncs across devices)
**Default**: `[]` (empty array)

**Location**: `packages/loot-core/src/types/prefs.ts`

Add to the preferences type definition:

```ts
pinnedCategoryIds?: string[];
```

### Hook: `usePinnedCategories()`

**Location**: `packages/desktop-client/src/components/budget/hooks/usePinnedCategories.ts` (new file)

**Purpose**: Manage pinned category state and provide helper functions

**Returns**:

```ts
{
  pinnedCategoryIds: string[];                    // Array of pinned category IDs
  isPinned: (categoryId: string) => boolean;      // Check if category is pinned
  togglePin: (categoryId: string) => void;        // Pin/unpin a category
  getPinnedCategories: () => Category[];          // Get full category objects in display order
}
```

**Implementation approach**:

- Read `pinnedCategoryIds` from preferences using existing preference hooks
- `togglePin()` updates the preference (adds or removes category ID)
- `isPinned()` checks if category ID exists in pinned list
- `getPinnedCategories()` fetches category data using existing `useCategories()` hook, filters to pinned IDs, and maintains budget page order
- Leverages existing category ordering logic from budget page

### Category Order Preservation

The hook will use the existing category list from `useCategories()` which already respects user's custom ordering from the budget page. Simply filter this list to only include pinned categories, maintaining their relative order.

## UI Components

### Component 1: PinnedCategoriesTable Widget

**Location**: `packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.tsx` (new file)

**Responsibilities**:

- Fetch pinned categories using `usePinnedCategories()` hook
- Render 2-column table matching Budget Summary table style
- Handle click events to open balance modal
- Show empty state when no categories pinned

**Table structure**:

- **Title**: "Pinned Categories" (above table)
- **Columns**: Category Name (left-aligned) | Balance (right-aligned)
- **Rows**: One row per pinned category, ordered by budget page sequence

**Styling**:

- Reuse existing mobile table components from Budget Summary
- Match padding, borders, typography of Budget Summary table
- Balance values use `formatCurrency()` for formatting
- Goal-based color coding: green for fully funded, red for underfunded (matching budget page logic)
- Clickable rows with appropriate touch targets for mobile

**Empty state**:

```
Title: "Pinned Categories"
Message: "No pinned categories. Pin categories from the budget page to see them here."
```

**Click behavior**:

- Tapping a row opens the balance modal for that category
- Modal shows full category details with pin/unpin checkbox

### Component 2: Pin Checkbox in Balance Modal

**Location**: Modify existing balance modal component (likely `packages/desktop-client/src/components/mobile/budget/BalanceMenu.tsx` or similar)

**Change type**: Additive seam - insert new checkbox at bottom of modal

**Implementation**:

**1. Add checkbox below existing action buttons**:

```tsx
<Checkbox
  checked={isPinned(categoryId)}
  onChange={() => togglePin(categoryId)}
  label="Pin to Overview"
/>
```

**2. Position**:

- Below "Cover overspending" and "Rollover overspending" buttons
- Above modal close/dismiss area
- Consistent spacing with other modal elements

**3. Behavior**:

- Checkbox state reflects current pin status
- Clicking toggles pin state immediately
- No confirmation needed (simple toggle)
- Modal remains open after toggling (user can continue interacting)

**4. Conditional rendering**:

```tsx
const overviewEnabled = useFeatureFlag('enableOverviewPage');

{overviewEnabled && (
  <Checkbox ... />
)}
```

Only show the checkbox when the overview page feature is enabled.

## Overview Page Integration

**Location**: `packages/desktop-client/src/components/mobile/overview/OverviewPage.tsx`

**Modification**:

```tsx
<OverviewPage>
  <BudgetSummaryTable />
  <PinnedCategoriesTable />
</OverviewPage>
```

Simply add the new widget below the existing Budget Summary table. The widget handles its own empty state, so no conditional rendering needed at this level.

## Edge Cases & Considerations

### 1. Deleted Categories

- If a pinned category is deleted, the preference cleanup happens automatically
- `getPinnedCategories()` filters out IDs that don't match existing categories
- No stale data displayed

### 2. Category Reordering

- Pinned categories automatically reflect new order when user reorders budget page
- No special handling needed (uses live category list)

### 3. Modal Context

- Balance modal needs category context to know which category is being viewed
- Reuse existing modal state management from budget page
- When opened from overview page, pass category ID to modal

### 4. Performance

- Pinned categories list is typically small (no enforced limit, but users naturally keep it reasonable)
- Standard React re-rendering optimization applies
- No special memoization needed unless performance issues observed

### 5. Sync Conflicts

- Preference syncing handled by existing Actual sync mechanism
- Last-write-wins for `pinnedCategoryIds` preference (standard behavior)

### 6. No Limit on Pinned Categories

- Users can pin unlimited categories
- Provides maximum flexibility
- Widget will grow vertically as needed (standard scrolling behavior)

## Testing Strategy

### Unit Tests

- `usePinnedCategories()` hook:
  - Returns empty array when no categories pinned
  - `togglePin()` adds category ID to preferences
  - `togglePin()` removes category ID when already pinned
  - `isPinned()` correctly identifies pinned categories
  - `getPinnedCategories()` filters and orders correctly

### Integration Tests

- Pinning a category from budget page updates overview page
- Unpinning from balance modal removes from overview
- Clicking pinned category opens correct balance modal
- Empty state displays when no categories pinned
- Checkbox state reflects actual pin status

### Visual/Manual Tests

- Table formatting matches Budget Summary style
- Color coding matches budget page (fully funded = green, underfunded = red)
- Touch targets are appropriately sized for mobile
- Modal checkbox appears in correct position
- Preference syncs across devices (if multi-device testing available)

## Success Criteria

- [ ] `pinnedCategoryIds` preference added to type definitions
- [ ] `usePinnedCategories()` hook implemented and tested
- [ ] PinnedCategoriesTable widget displays on overview page
- [ ] Empty state shows when no categories pinned
- [ ] Checkbox appears at bottom of balance modal when flag enabled
- [ ] Toggling checkbox updates pinned state immediately
- [ ] Pinned categories display in budget page order
- [ ] Balance values show goal-based color coding
- [ ] Clicking pinned category opens balance modal
- [ ] Feature only available when `enableOverviewPage` flag is true
- [ ] All tests pass
- [ ] No console errors or warnings
- [ ] FORK_NOTES.md updated with new feature documentation

## Future Enhancements

Potential additions outside current scope:

- Drag-to-reorder pinned categories (custom order independent of budget page)
- Category group pinning support
- Additional metrics per pinned category (budgeted, spent, etc.)
- Quick actions on pinned categories (add transaction, adjust budget)
- Limit recommendations or warnings for UX purposes
