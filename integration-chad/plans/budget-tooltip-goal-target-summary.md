# Implementation: Budget Tooltip Goal Target Summary

## Status: ✅ COMPLETE (Refactored for AGENTS Compliance)

## Overview

Successfully implemented goal target summary in budget tooltip, replacing hardcoded placeholder "test: 133" with actual sum of goal values for visible (non-hidden) expense categories.

**Update (Post-Refactoring):** After initial implementation, the feature was refactored to move the seam from a leaf component (TotalsList) to boundary/container components (BudgetSummary, ToBudgetAmount, EnvelopeBudgetSummaryModal) to achieve full compliance with AGENTS-chad-fork.md principles. The functionality remains identical, but the architecture now follows best practices for maintainability, testability, and upstream compatibility.

## What Was Done

- Created `useGoalTargetSum` custom hook to encapsulate goal calculation logic
- Modified TotalsList and all its calling components to accept and pass month prop
- Display formatted Goal Target value that updates reactively when goals/visibility changes
- Properly excluded hidden categories and income categories from calculation

## Key Implementation Details

### Architecture Solution

Instead of using the SheetNameProvider context (which proved unreliable), the implementation passes the `month` prop down through the component hierarchy:

1. `BudgetSummary` receives `month` → passes to `TotalsList`
2. `TotalsList` receives `month` → passes to `GoalTargetRow`
3. `GoalTargetRow` passes `month` to `useGoalTargetSum` hook
4. Hook uses `monthUtils.sheetForMonth(month)` to construct sheet name directly

This bypasses context dependency issues and ensures the month is always available.

### Components Modified

- **useGoalTargetSum.ts** (new): Custom hook for goal calculation
- **TotalsList.tsx**: Added `month` prop, uses hook, creates GoalTargetRow/GoalTargetLabel components
- **BudgetSummary.tsx**: Added `month={month}` to TotalsList
- **EnvelopeBudgetSummaryModal.tsx**: Added `month={month}` to TotalsList
- **ToBudgetAmount.tsx**: Added `month` prop, passes to TotalsList in tooltip
- **ToBudget.tsx**: Added `month={month}` when calling ToBudgetAmount

## Requirements Met

1. ✅ Calculate sum of all "Goal" values across visible **expense categories only**
2. ✅ Exclude hidden categories (respects user's show/hide preference)
3. ✅ Display as "Goal Target" with formatted currency value
4. ✅ Show 0.00 if no goals are set (keep row visible)
5. ✅ Update reactively when goals, categories, or visibility changes

## Gotchas Encountered & Solutions

### 1. SheetNameProvider Context Not Accessible

**Problem**: Initial approach tried to use `useSheetName()` context hook directly in GoalTargetRow. This failed because the hook couldn't access the context in some rendering paths, resulting in null sheetName.

**Solution**: Changed approach to accept `month` as a prop and construct the sheet name directly using `monthUtils.sheetForMonth(month)`. This eliminated the context dependency and made the data flow explicit.

### 2. Missing TotalsList Usage Location

**Problem**: Build succeeded but app crashed with `Cannot read properties of undefined (reading 'replace')` because `month` was undefined when calling `sheetForMonth(month)`.

**Root Cause**: Found three places where TotalsList was used, but only two were passing `month`. The third location was in **ToBudgetAmount.tsx** (used in tooltip over "To Budget" amount).

**Solution**: Traced the component hierarchy and added `month` prop to ToBudgetAmount, then had ToBudget pass `month` to it.

### 3. Component Prop Threading

**Problem**: Props needed to flow through multiple component layers (BudgetSummary → TotalsList → GoalTargetRow → useGoalTargetSum, and separately ToBudget → ToBudgetAmount → TotalsList).

**Solution**: Systematically added `month` prop to:

- TotalsListProps type
- GoalTargetRow component props
- ToBudgetAmountProps type
- All call sites that render these components

## Implementation Approach

### Following Seams Rules (Refactored)

Per [AGENTS-chad-fork.md](../AGENTS-chad-fork.md):

- **Prefer additive changes over modifications** (line 18-19) ✅
- **Seams must exist independently of feature flags** (line 70-71) ✅
- **Prefer high-level seams** (line 73-74) ✅

### Architecture Solution (Refactored)

The implementation was refactored to move the seam from a leaf component to boundary/container components:

**Before (violated principles):**

- Feature flag check in TotalsList (leaf component)
- Goal components embedded conditionally in TotalsList
- Mixed presentation and business logic

**After (AGENTS compliant):**

- Feature flag checks moved to container components (BudgetSummary, ToBudgetAmount, EnvelopeBudgetSummaryModal)
- Goal components (GoalTargetRow, GoalTargetLabel) are separate, pure presentational components
- TotalsList accepts goal components as optional props via composition pattern
- Clear separation between container logic and presentation

### Architecture Pattern

Uses **composition via props** pattern (similar to CellValue in the codebase):

- Container components check feature flag and decide what to render
- Pass goal components down to presentational TotalsList via props
- TotalsList remains a pure presentational component
- No feature flag knowledge in presentation layer

### Technical Implementation

- **GoalTargetRow.tsx**: Pure component that calls `useGoalTargetSum(month)` hook
- **GoalTargetLabel.tsx**: Pure component displaying "Goal Target" label
- **TotalsList.tsx**: Accepts `goalTargetRow` and `goalTargetLabel` as optional ReactNode props
- **Container Components**: BudgetSummary, ToBudgetAmount, EnvelopeBudgetSummaryModal each:
  - Call `useFeatureFlag('budget-tooltip-goals')`
  - Conditionally render and pass goal components to TotalsList

### Implementation Strategy

**Calculation Pattern:**

1. Create custom hook `useGoalTargetSum()` to encapsulate logic
2. Calculate visible expense category IDs (memoized)
3. Subscribe to each category's goal value via spreadsheet
4. Store goal values in state map `{ [categoryId]: goalValue }`
5. Sum goal values from the map (memoized)
6. Return total for display

**UI Pattern:**

- Follow existing pattern in TotalsList (feature flag guards custom content)
- Replace hardcoded "test: 133" with calculated goal target sum

## Files to Modify

### 1. New Hook: useGoalTargetSum.ts

**Path:** `/home/chid/git/actual/packages/desktop-client/src/hooks/useGoalTargetSum.ts`

**Purpose:** Encapsulate goal calculation logic in a reusable hook

```typescript
import { useEffect, useMemo, useState } from 'react';

import { useCategories } from './useCategories';
import { useLocalPref } from './useLocalPref';
import { useSheetName } from './useSheetName';
import { useSpreadsheet } from './useSpreadsheet';

import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

/**
 * Calculates the sum of all goal values for visible expense categories in the current month.
 *
 * @returns The total sum of goal values across all visible expense categories
 */
export function useGoalTargetSum(): number {
  const sheetName = useSheetName();
  const spreadsheet = useSpreadsheet();
  const categories = useCategories();
  const [showHiddenCategories] = useLocalPref('budget.showHiddenCategories');

  // Calculate visible expense category IDs
  const visibleCategoryIds = useMemo(() => {
    return categories.grouped
      .filter(group => !group.is_income) // Only expense groups
      .filter(group => showHiddenCategories || !group.hidden) // Filter hidden groups
      .flatMap(group => group.categories || [])
      .filter(cat => showHiddenCategories || !cat.hidden) // Filter hidden categories
      .map(cat => cat.id);
  }, [categories.grouped, showHiddenCategories]);

  // Track goal values for each visible category
  const [goalValues, setGoalValues] = useState<Record<string, number>>({});

  // Subscribe to goal values for all visible categories
  useEffect(() => {
    if (!sheetName || visibleCategoryIds.length === 0) {
      setGoalValues({});
      return;
    }

    const unbinds = visibleCategoryIds.map(categoryId => {
      return spreadsheet.bind(
        sheetName,
        envelopeBudget.catGoal(categoryId),
        (result) => {
          setGoalValues(prev => ({
            ...prev,
            [categoryId]: result.value ?? 0
          }));
        }
      );
    });

    // Clean up goals for categories no longer visible
    setGoalValues(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        if (!visibleCategoryIds.includes(id)) {
          delete updated[id];
        }
      });
      return updated;
    });

    return () => unbinds.forEach(unbind => unbind());
  }, [visibleCategoryIds, sheetName, spreadsheet]);

  // Calculate total goal sum
  return useMemo(() => {
    return Object.values(goalValues).reduce((sum, val) => sum + val, 0);
  }, [goalValues]);
}
```

### 2. TotalsList.tsx

**Path:** `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/TotalsList.tsx`

**Changes:**

#### A. Add Import (after line 15)

```typescript
import { useGoalTargetSum } from '@desktop-client/hooks/useGoalTargetSum';
```

#### B. Use Hook (after line 24, inside component function)

```typescript
const goalTargetSum = useGoalTargetSum();
```

#### C. Replace Hardcoded Value (line 44)

**Replace:**

```typescript
<Block style={{ fontWeight: 600 }}>133</Block>
```

**With:**

```typescript
<Block style={{ fontWeight: 600 }}>
  {format(goalTargetSum, 'financial')}
</Block>
```

#### D. Replace Hardcoded Label (line 140)

**Replace:**

```typescript
<Block>test</Block>
```

**With:**

```typescript
<Block>
  <Trans>Goal Target</Trans>
</Block>
```

## Edge Cases Handled

1. **No categories have goals**: Shows "0.00"
2. **All categories hidden**: Sum reflects only visible categories (likely 0.00)
3. **User toggles show/hide**: `visibleCategoryIds` updates, triggering new subscriptions
4. **Categories added/removed**: `useEffect` dependencies ensure subscriptions update
5. **Month changes**: New `sheetName` triggers new subscriptions for the new month
6. **Goal values are null/undefined**: Coalesced to 0 in state updates (`?? 0`)
7. **Feature flag disabled**: Entire section hidden via existing conditional rendering
8. **No sheet name**: Early return prevents subscriptions if context not available
9. **Income categories**: Explicitly excluded from the sum

## Technical Details

### Why This Approach?

- **React hooks rules**: Can't use hooks in loops, so we use `useEffect` with manual subscriptions
- **Reactive updates**: Spreadsheet subscriptions ensure UI updates when goals change
- **Performance**: Memoization prevents unnecessary recalculations
- **Clean subscriptions**: Proper cleanup in `useEffect` return prevents memory leaks

### Data Flow

1. User action (hide category, change goal, switch month)
2. Categories or sheet context updates
3. `visibleCategoryIds` recalculates (memoized)
4. `useEffect` runs, creates new subscriptions
5. Each goal change triggers callback updating `goalValues` state
6. `totalGoals` recalculates (memoized) when `goalValues` changes
7. UI re-renders with new sum

### Performance Considerations

- Uses `useMemo` for `visibleCategoryIds` and `totalGoals` to prevent recalculations
- Spreadsheet subscriptions are efficient and batched by the spreadsheet engine
- State updates are batched by React
- Only re-subscribes when category visibility changes

## Testing Checklist

- [x] Feature flag toggle works (enables/disables Goal Target row)
- [x] Shows correct sum when categories have goals
- [x] Updates when goal values change (reactive subscriptions)
- [x] Updates when hiding/showing categories
- [x] Updates when switching months
- [x] Excludes hidden categories from sum
- [x] Excludes income categories from sum
- [x] Proper formatting with currency
- [x] No console errors (removed debug logs)
- [x] No memory leaks (subscriptions cleaned up in useEffect return)

## Files Summary (Refactored)

**New Files (2):**

- `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/GoalTargetRow.tsx` (pure component displaying goal value)
- `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/GoalTargetLabel.tsx` (pure component displaying label)

**Modified Files (5):**

- `/home/chid/git/actual/packages/desktop-client/src/hooks/useGoalTargetSum.ts` (fixed TypeScript types, improved reliability)
- `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/TotalsList.tsx` (accepts goal components as optional props)
- `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/BudgetSummary.tsx` (added feature flag check and prop passing)
- `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/ToBudgetAmount.tsx` (added feature flag check and prop passing)
- `/home/chid/git/actual/packages/desktop-client/src/components/modals/EnvelopeBudgetSummaryModal.tsx` (added feature flag check and prop passing)

**Documentation Updated:**

- `integration-chad/FORK_NOTES.md` (updated budget-tooltip-goals section with refactored architecture details)

## Adherence to Seams Rules (Refactored)

**Architecture Compliance:**

- ✅ Seam at boundary/container level (BudgetSummary, ToBudgetAmount, EnvelopeBudgetSummaryModal)
- ✅ NOT in leaf component (TotalsList is now pure presentation)
- ✅ Follows "prefer high-level seams" principle
- ✅ Feature flag checks at container level, not in presentation layer
- ✅ Composition via props pattern (established pattern in codebase)

**Additive Changes:**

- ✅ New components (GoalTargetRow, GoalTargetLabel) created separately
- ✅ Calculation logic encapsulated in reusable hook (useGoalTargetSum)
- ✅ Minimal modifications to TotalsList (only accepts optional props)
- ✅ Container components enhanced, not rewritten
- ✅ No changes to core logic

**Code Quality:**

- ✅ Clear separation of concerns (containers vs. presentation)
- ✅ Easy to test (TotalsList has no feature flag dependencies)
- ✅ Easy to remove (delete props from 3 call sites)
- ✅ Upstream behavior preserved (flag defaults to false)
- ✅ TypeScript type-safe (all types properly defined)

**AGENTS Principles Met:**

- ✅ Upstream is source of truth (flag defaults false)
- ✅ Prefer additive changes (composition via props)
- ✅ Flags gate extensions (checked at boundary)
- ✅ Seams are intentional (explicit at container level)
- ✅ Behavior in core, UI in web (desktop-client only)
- ✅ No scattered edits (centralized in containers)
