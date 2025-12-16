# Implementation Plan: Budget Tooltip Goal Target Summary

## Overview
Enhance the budget tooltip goals feature to display the actual sum of all goal values for visible (non-hidden) expense categories in the current month, replacing the placeholder "test: 133" with "Goal Target: [calculated sum]".

## Current State
- Feature flag `budget-tooltip-goals` exists and controls display of placeholder content
- Placeholder shows "test" label with hardcoded value "133"
- TotalsList component is wrapped in SheetNameProvider by BudgetSummary parent

## Requirements
1. Calculate sum of all "Goal" values across visible **expense categories only**
2. Exclude hidden categories (respects user's show/hide preference)
3. Display as "Goal Target" with formatted currency value
4. Show 0.00 if no goals are set (keep row visible)
5. Update reactively when goals, categories, or visibility changes

## Implementation Approach

### Following Seams Rules

Per [AGENTS-chad-fork.md](../AGENTS-chad-fork.md):
- **Prefer additive changes over modifications** (line 18-19)
- **Seams must exist independently of feature flags** (line 70-71)
- **Prefer high-level seams** (line 73-74)

### Current Violation
The existing `budget-tooltip-goals` implementation modifies TotalsList directly, which violates the seams rules. However, since TotalsList already has this pattern established, we'll follow it for consistency within this feature.

### Architecture Insights
- **TotalsList** is wrapped in `SheetNameProvider` by BudgetSummary (line 91)
- Can access sheet name via `useSheetName()` hook
- Category goals accessed via `envelopeBudget.catGoal(categoryId)` binding
- Must handle dynamic subscriptions since category count varies
- Feature flag `budget-tooltip-goals` already gates custom UI in TotalsList

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

- [ ] Feature flag toggle works (enables/disables Goal Target row)
- [ ] Shows 0.00 when no goals are set
- [ ] Shows correct sum when some categories have goals
- [ ] Updates when goal values change
- [ ] Updates when hiding/showing categories
- [ ] Updates when switching months
- [ ] Excludes hidden categories from sum
- [ ] Excludes income categories from sum
- [ ] Proper formatting with currency
- [ ] No console errors or warnings
- [ ] No memory leaks (subscriptions cleaned up)

## Files Summary

- **Created:** `/home/chid/git/actual/packages/desktop-client/src/hooks/useGoalTargetSum.ts` (new custom hook)
- **Modified:** `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/TotalsList.tsx` (minimal changes: import hook, use it, update labels)
- **Not Modified:** BudgetSummary.tsx (TotalsList already has access to sheet context)

## Adherence to Seams Rules

**Additive Changes:**
- ✅ New hook created instead of modifying existing core logic
- ✅ Logic encapsulated and reusable
- ✅ Minimal modifications to existing component

**Acknowledged Limitation:**
- ⚠️ TotalsList is a leaf component, but it already has the feature flag pattern established
- Following existing pattern for consistency within this feature
- Future improvement: Consider extracting TotalsList rows into a seam-based extension system
