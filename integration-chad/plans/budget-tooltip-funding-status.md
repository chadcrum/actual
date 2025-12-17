# Implementation: Budget Tooltip Funding Status Summaries

## Status: READY FOR IMPLEMENTATION

## Overview

Add two new goal-related summaries to the budget tooltip:

1. **Underfunded Sum**: Sum of shortfall amounts (absolute values) across all underfunded categories
2. **Overfunded Sum**: Sum of excess amounts across all overfunded categories

This extends the existing `budget-tooltip-goals` feature (see [budget-tooltip-goal-target-summary.md](./budget-tooltip-goal-target-summary.md)).

## Requirements (User Confirmed)

- ✅ Use existing `budget-tooltip-goals` feature flag
- ✅ Show absolute values for underfunded amounts
- ✅ Color coding:
  - Underfunded > 0: Yellow (`theme.warningText`)
  - Overfunded > 0: Light red (`theme.errorText`)
- ✅ Follow the existing pattern from `budget-tooltip-goal-target-summary.md`
- ✅ Comply with [AGENTS-chad-fork.md](../AGENTS-chad-fork.md) seam + feature flag rules
- ✅ Use the same architecture: hook → component → container → TotalsList composition pattern

## Architecture Pattern (AGENTS Compliant)

Following [AGENTS-chad-fork.md](../AGENTS-chad-fork.md) principles:

### Seam Location (Lines 70-74 of AGENTS-chad-fork.md)

✅ **High-level seams at boundary/container components**:

- Feature flag checks in `BudgetSummary`, `ToBudgetAmount`, `EnvelopeBudgetSummaryModal`
- NOT in leaf component (`TotalsList`)
- Follows "prefer high-level seams" principle

### Composition Pattern (Lines 18-19, 21-22 of AGENTS-chad-fork.md)

✅ **Additive changes via composition**:

- New pure presentational components created separately
- Passed down as ReactNode props
- No modifications to core presentation logic
- Easy to remove (delete props from 3 call sites)

### Feature Flag Usage (Lines 40-43 of AGENTS-chad-fork.md)

✅ **Flags gate extensions, not rewrites**:

- Same flag as related feature (`budget-tooltip-goals`)
- Defaults to `false`
- No behavior change when disabled

## Funding Status Calculation Logic

From [BalanceWithCarryover.tsx](../../packages/desktop-client/src/components/budget/BalanceWithCarryover.tsx):

```typescript
// For each category with a goal:
const difference = longGoal === 1
  ? balance - goal      // Long-term goals (compare balance to goal)
  : budgeted - goal;    // Template goals (compare budgeted to goal)

// Categorize:
if (difference < 0) → Underfunded (shortfall)
if (difference > 0) → Overfunded (excess)
if (difference === 0) → Fully funded
```

Required spreadsheet bindings per category:

- `envelopeBudget.catGoal(categoryId)` - Goal target amount
- `envelopeBudget.catBudgeted(categoryId)` - Budgeted amount
- `envelopeBudget.catBalance(categoryId)` - Balance/leftover amount
- `envelopeBudget.catLongGoal(categoryId)` - Long goal flag (1 or 0)

## Files Summary

### New Files (5):

1. `/home/chid/git/actual/packages/desktop-client/src/hooks/useGoalFundingStatus.ts`
2. `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/UnderfundedRow.tsx`
3. `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/UnderfundedLabel.tsx`
4. `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/OverfundedRow.tsx`
5. `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/OverfundedLabel.tsx`

### Modified Files (4):

1. `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/TotalsList.tsx`
2. `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/BudgetSummary.tsx`
3. `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/ToBudgetAmount.tsx`
4. `/home/chid/git/actual/packages/desktop-client/src/components/modals/EnvelopeBudgetSummaryModal.tsx`

## Implementation Todo List

### ✅ Task 1: Create useGoalFundingStatus Hook

**File**: `/home/chid/git/actual/packages/desktop-client/src/hooks/useGoalFundingStatus.ts`

**Pattern**: Based on [useGoalTargetSum.ts](../../packages/desktop-client/src/hooks/useGoalTargetSum.ts)

**Key Differences**:

- Return object: `{ underfunded: number, overfunded: number }`
- Subscribe to 4 bindings per category (goal, budgeted, balance, longGoal)
- Store complex state: `Record<categoryId, { goal, budgeted, balance, longGoal }>`
- Calculate differences and aggregate into two sums

**Implementation**:

```typescript
import { useEffect, useMemo, useState } from 'react';
import * as monthUtils from 'loot-core/shared/months';
import { useCategories } from './useCategories';
import { useLocalPref } from './useLocalPref';
import { useSpreadsheet } from './useSpreadsheet';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

type CategoryFundingData = {
  goal: number;
  budgeted: number;
  balance: number;
  longGoal: number;
};

type FundingStatus = {
  underfunded: number;
  overfunded: number;
};

/**
 * Calculates underfunded and overfunded sums for visible expense categories.
 *
 * @param month The month string (e.g., "2024-01") to calculate funding status for
 * @returns Object with underfunded and overfunded sums
 */
export function useGoalFundingStatus(month: string): FundingStatus {
  const sheetName = monthUtils.sheetForMonth(month);
  const spreadsheet = useSpreadsheet();
  const categories = useCategories();
  const [showHiddenCategories] = useLocalPref('budget.showHiddenCategories');

  // Calculate visible expense category IDs (same as useGoalTargetSum)
  const visibleCategoryIds = useMemo(() => {
    return categories.grouped
      .filter(group => !group.is_income) // Only expense groups
      .filter(group => showHiddenCategories || !group.hidden) // Filter hidden groups
      .flatMap(group => group.categories || [])
      .filter(cat => showHiddenCategories || !cat.hidden) // Filter hidden categories
      .map(cat => cat.id);
  }, [categories.grouped, showHiddenCategories]);

  // Track funding data for each visible category
  const [categoryData, setCategoryData] = useState<Record<string, CategoryFundingData>>({});

  // Subscribe to all required values for all visible categories
  useEffect(() => {
    if (!sheetName || visibleCategoryIds.length === 0) {
      setCategoryData({});
      return;
    }

    const unbinds: (() => void)[] = [];

    visibleCategoryIds.forEach(categoryId => {
      // Subscribe to goal
      unbinds.push(
        spreadsheet.bind(
          sheetName,
          envelopeBudget.catGoal(categoryId),
          (result) => {
            setCategoryData(prev => ({
              ...prev,
              [categoryId]: {
                ...prev[categoryId],
                goal: typeof result.value === 'number' ? result.value : 0,
                budgeted: prev[categoryId]?.budgeted ?? 0,
                balance: prev[categoryId]?.balance ?? 0,
                longGoal: prev[categoryId]?.longGoal ?? 0,
              }
            }));
          }
        )
      );

      // Subscribe to budgeted
      unbinds.push(
        spreadsheet.bind(
          sheetName,
          envelopeBudget.catBudgeted(categoryId),
          (result) => {
            setCategoryData(prev => ({
              ...prev,
              [categoryId]: {
                goal: prev[categoryId]?.goal ?? 0,
                budgeted: typeof result.value === 'number' ? result.value : 0,
                balance: prev[categoryId]?.balance ?? 0,
                longGoal: prev[categoryId]?.longGoal ?? 0,
              }
            }));
          }
        )
      );

      // Subscribe to balance
      unbinds.push(
        spreadsheet.bind(
          sheetName,
          envelopeBudget.catBalance(categoryId),
          (result) => {
            setCategoryData(prev => ({
              ...prev,
              [categoryId]: {
                goal: prev[categoryId]?.goal ?? 0,
                budgeted: prev[categoryId]?.budgeted ?? 0,
                balance: typeof result.value === 'number' ? result.value : 0,
                longGoal: prev[categoryId]?.longGoal ?? 0,
              }
            }));
          }
        )
      );

      // Subscribe to longGoal
      unbinds.push(
        spreadsheet.bind(
          sheetName,
          envelopeBudget.catLongGoal(categoryId),
          (result) => {
            setCategoryData(prev => ({
              ...prev,
              [categoryId]: {
                goal: prev[categoryId]?.goal ?? 0,
                budgeted: prev[categoryId]?.budgeted ?? 0,
                balance: prev[categoryId]?.balance ?? 0,
                longGoal: typeof result.value === 'number' ? result.value : 0,
              }
            }));
          }
        )
      );
    });

    // Clean up data for categories no longer visible
    setCategoryData(prev => {
      const updated: Record<string, CategoryFundingData> = {};
      Object.entries(prev).forEach(([id, data]) => {
        if (visibleCategoryIds.includes(id)) {
          updated[id] = data;
        }
      });
      return updated;
    });

    return () => unbinds.forEach(unbind => unbind());
  }, [visibleCategoryIds, sheetName, spreadsheet]);

  // Calculate underfunded and overfunded sums
  return useMemo(() => {
    let underfunded = 0;
    let overfunded = 0;

    Object.values(categoryData).forEach(data => {
      // Only process categories with goals set
      if (data.goal > 0) {
        // Calculate difference based on goal type (same logic as BalanceWithCarryover)
        const difference = data.longGoal === 1
          ? data.balance - data.goal      // Long-term goals: compare balance
          : data.budgeted - data.goal;    // Template goals: compare budgeted

        if (difference < 0) {
          // Underfunded: add absolute value of shortfall
          underfunded += Math.abs(difference);
        } else if (difference > 0) {
          // Overfunded: add excess amount
          overfunded += difference;
        }
        // difference === 0 is "fully funded" - not tracked separately
      }
    });

    return { underfunded, overfunded };
  }, [categoryData]);
}
```

**Checklist**:

- [ ] Create file with proper imports
- [ ] Implement state management for 4 values per category
- [ ] Subscribe to all 4 spreadsheet bindings per category
- [ ] Calculate differences using BalanceWithCarryover logic
- [ ] Aggregate underfunded (absolute value) and overfunded sums
- [ ] Handle null/undefined values with coalescing
- [ ] Clean up subscriptions properly
- [ ] Only include categories where goal > 0

---

### ✅ Task 2: Create UnderfundedRow Component

**File**: `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/UnderfundedRow.tsx`

**Pattern**: Based on [GoalTargetRow.tsx](../../packages/desktop-client/src/components/budget/envelope/budgetsummary/GoalTargetRow.tsx)

**Implementation**:

```typescript
import React from 'react';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';

import { useFormat } from '@desktop-client/hooks/useFormat';
import { useGoalFundingStatus } from '@desktop-client/hooks/useGoalFundingStatus';

type UnderfundedRowProps = {
  month: string;
};

export function UnderfundedRow({ month }: UnderfundedRowProps) {
  const format = useFormat();
  const { underfunded } = useGoalFundingStatus(month);

  return (
    <Block
      style={{
        fontWeight: 600,
        color: underfunded > 0 ? theme.warningText : undefined,
      }}
    >
      {format(underfunded, 'financial')}
    </Block>
  );
}
```

**Checklist**:

- [ ] Create file with proper imports
- [ ] Call `useGoalFundingStatus` hook
- [ ] Destructure `underfunded` from hook result
- [ ] Apply `theme.warningText` color when `underfunded > 0`
- [ ] Format value as 'financial'

---

### ✅ Task 3: Create UnderfundedLabel Component

**File**: `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/UnderfundedLabel.tsx`

**Pattern**: Based on [GoalTargetLabel.tsx](../../packages/desktop-client/src/components/budget/envelope/budgetsummary/GoalTargetLabel.tsx)

**Implementation**:

```typescript
import React from 'react';
import { Trans } from 'react-i18next';

import { Block } from '@actual-app/components/block';

export function UnderfundedLabel() {
  return (
    <Block>
      <Trans>Underfunded</Trans>
    </Block>
  );
}
```

**Checklist**:

- [ ] Create file with proper imports
- [ ] Use `<Trans>` component for i18n
- [ ] Label text: "Underfunded"

---

### ✅ Task 4: Create OverfundedRow Component

**File**: `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/OverfundedRow.tsx`

**Pattern**: Based on [GoalTargetRow.tsx](../../packages/desktop-client/src/components/budget/envelope/budgetsummary/GoalTargetRow.tsx)

**Implementation**:

```typescript
import React from 'react';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';

import { useFormat } from '@desktop-client/hooks/useFormat';
import { useGoalFundingStatus } from '@desktop-client/hooks/useGoalFundingStatus';

type OverfundedRowProps = {
  month: string;
};

export function OverfundedRow({ month }: OverfundedRowProps) {
  const format = useFormat();
  const { overfunded } = useGoalFundingStatus(month);

  return (
    <Block
      style={{
        fontWeight: 600,
        color: overfunded > 0 ? theme.errorText : undefined,
      }}
    >
      {format(overfunded, 'financial')}
    </Block>
  );
}
```

**Checklist**:

- [ ] Create file with proper imports
- [ ] Call `useGoalFundingStatus` hook
- [ ] Destructure `overfunded` from hook result
- [ ] Apply `theme.errorText` color when `overfunded > 0`
- [ ] Format value as 'financial'

---

### ✅ Task 5: Create OverfundedLabel Component

**File**: `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/OverfundedLabel.tsx`

**Pattern**: Based on [GoalTargetLabel.tsx](../../packages/desktop-client/src/components/budget/envelope/budgetsummary/GoalTargetLabel.tsx)

**Implementation**:

```typescript
import React from 'react';
import { Trans } from 'react-i18next';

import { Block } from '@actual-app/components/block';

export function OverfundedLabel() {
  return (
    <Block>
      <Trans>Overfunded</Trans>
    </Block>
  );
}
```

**Checklist**:

- [ ] Create file with proper imports
- [ ] Use `<Trans>` component for i18n
- [ ] Label text: "Overfunded"

---

### ✅ Task 6: Update TotalsList Component

**File**: `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/TotalsList.tsx`

**Changes**:

1. **Update TotalsListProps type** (around line 15):

```typescript
type TotalsListProps = {
  prevMonthName: string;
  month: string;
  style?: CSSProperties;
  goalTargetRow?: ReactNode;
  goalTargetLabel?: ReactNode;
  underfundedRow?: ReactNode;      // ADD
  underfundedLabel?: ReactNode;    // ADD
  overfundedRow?: ReactNode;       // ADD
  overfundedLabel?: ReactNode;     // ADD
};
```

2. **Update function parameters** (around line 23):

```typescript
export function TotalsList({
  prevMonthName,
  month,
  style,
  goalTargetRow,
  goalTargetLabel,
  underfundedRow,    // ADD
  underfundedLabel,  // ADD
  overfundedRow,     // ADD
  overfundedLabel,   // ADD
}: TotalsListProps) {
```

3. **Add rows to value column** (around line 48, after `{goalTargetRow}`):

```typescript
<View style={{ textAlign: 'right', marginRight: 10, minWidth: 50 }}>
  {goalTargetRow}
  {underfundedRow}   {/* ADD */}
  {overfundedRow}    {/* ADD */}
  <Tooltip ...>
    ...
  </Tooltip>
  ...
</View>
```

4. **Add labels to label column** (around line 133, after `{goalTargetLabel}`):

```typescript
<View>
  {goalTargetLabel}
  {underfundedLabel}  {/* ADD */}
  {overfundedLabel}   {/* ADD */}
  <Block>
    <Trans>Available funds</Trans>
  </Block>
  ...
</View>
```

**Checklist**:

- [ ] Add 4 new props to `TotalsListProps` type
- [ ] Add 4 new parameters to function destructuring
- [ ] Render `underfundedRow` and `overfundedRow` in value column (after goalTargetRow)
- [ ] Render `underfundedLabel` and `overfundedLabel` in label column (after goalTargetLabel)

---

### ✅ Task 7: Update BudgetSummary Component

**File**: `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/BudgetSummary.tsx`

**Changes**:

1. **Add imports** (around line 19):

```typescript
import { GoalTargetLabel } from './GoalTargetLabel';
import { GoalTargetRow } from './GoalTargetRow';
import { UnderfundedLabel } from './UnderfundedLabel';   // ADD
import { UnderfundedRow } from './UnderfundedRow';       // ADD
import { OverfundedLabel } from './OverfundedLabel';     // ADD
import { OverfundedRow } from './OverfundedRow';         // ADD
import { ToBudget } from './ToBudget';
```

2. **Update TotalsList call** (around line 284):

```typescript
<TotalsList
  prevMonthName={prevMonthName}
  month={month}
  style={{
    marginBottom: expanded ? 17 : 0,
  }}
  goalTargetRow={
    isBudgetTooltipGoalsEnabled ? <GoalTargetRow month={month} /> : undefined
  }
  goalTargetLabel={
    isBudgetTooltipGoalsEnabled ? <GoalTargetLabel /> : undefined
  }
  underfundedRow={                                                      // ADD
    isBudgetTooltipGoalsEnabled ? <UnderfundedRow month={month} /> : undefined
  }
  underfundedLabel={                                                    // ADD
    isBudgetTooltipGoalsEnabled ? <UnderfundedLabel /> : undefined
  }
  overfundedRow={                                                       // ADD
    isBudgetTooltipGoalsEnabled ? <OverfundedRow month={month} /> : undefined
  }
  overfundedLabel={                                                     // ADD
    isBudgetTooltipGoalsEnabled ? <OverfundedLabel /> : undefined
  }
/>
```

**Checklist**:

- [ ] Add 4 new import statements
- [ ] Add 4 new props to TotalsList call
- [ ] Conditionally render based on `isBudgetTooltipGoalsEnabled` (same flag)
- [ ] Pass `month` prop to row components

---

### ✅ Task 8: Update ToBudgetAmount Component

**File**: `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/ToBudgetAmount.tsx`

**Changes**:

1. **Add imports** (around line 11):

```typescript
import { GoalTargetLabel } from './GoalTargetLabel';
import { GoalTargetRow } from './GoalTargetRow';
import { UnderfundedLabel } from './UnderfundedLabel';   // ADD
import { UnderfundedRow } from './UnderfundedRow';       // ADD
import { OverfundedLabel } from './OverfundedLabel';     // ADD
import { OverfundedRow } from './OverfundedRow';         // ADD
import { TotalsList } from './TotalsList';
```

2. **Update TotalsList call** (around line 72):

```typescript
<TotalsList
  prevMonthName={prevMonthName}
  month={month}
  style={{
    padding: '6px 10px',
  }}
  goalTargetRow={
    isBudgetTooltipGoalsEnabled ? <GoalTargetRow month={month} /> : undefined
  }
  goalTargetLabel={
    isBudgetTooltipGoalsEnabled ? <GoalTargetLabel /> : undefined
  }
  underfundedRow={                                                      // ADD
    isBudgetTooltipGoalsEnabled ? <UnderfundedRow month={month} /> : undefined
  }
  underfundedLabel={                                                    // ADD
    isBudgetTooltipGoalsEnabled ? <UnderfundedLabel /> : undefined
  }
  overfundedRow={                                                       // ADD
    isBudgetTooltipGoalsEnabled ? <OverfundedRow month={month} /> : undefined
  }
  overfundedLabel={                                                     // ADD
    isBudgetTooltipGoalsEnabled ? <OverfundedLabel /> : undefined
  }
/>
```

**Checklist**:

- [ ] Add 4 new import statements
- [ ] Add 4 new props to TotalsList call
- [ ] Conditionally render based on `isBudgetTooltipGoalsEnabled` (same flag)
- [ ] Pass `month` prop to row components

---

### ✅ Task 9: Update EnvelopeBudgetSummaryModal Component

**File**: `/home/chid/git/actual/packages/desktop-client/src/components/modals/EnvelopeBudgetSummaryModal.tsx`

**Changes**:

1. **Add imports** (around line 13):

```typescript
import { GoalTargetLabel } from '@desktop-client/components/budget/envelope/budgetsummary/GoalTargetLabel';
import { GoalTargetRow } from '@desktop-client/components/budget/envelope/budgetsummary/GoalTargetRow';
import { UnderfundedLabel } from '@desktop-client/components/budget/envelope/budgetsummary/UnderfundedLabel';   // ADD
import { UnderfundedRow } from '@desktop-client/components/budget/envelope/budgetsummary/UnderfundedRow';       // ADD
import { OverfundedLabel } from '@desktop-client/components/budget/envelope/budgetsummary/OverfundedLabel';     // ADD
import { OverfundedRow } from '@desktop-client/components/budget/envelope/budgetsummary/OverfundedRow';         // ADD
import { ToBudgetAmount } from '@desktop-client/components/budget/envelope/budgetsummary/ToBudgetAmount';
```

2. **Update TotalsList call** (around line 172):

```typescript
<TotalsList
  prevMonthName={prevMonthName}
  month={month}
  style={{
    marginTop: 13,
  }}
  goalTargetRow={
    isBudgetTooltipGoalsEnabled ? <GoalTargetRow month={month} /> : undefined
  }
  goalTargetLabel={
    isBudgetTooltipGoalsEnabled ? <GoalTargetLabel /> : undefined
  }
  underfundedRow={                                                      // ADD
    isBudgetTooltipGoalsEnabled ? <UnderfundedRow month={month} /> : undefined
  }
  underfundedLabel={                                                    // ADD
    isBudgetTooltipGoalsEnabled ? <UnderfundedLabel /> : undefined
  }
  overfundedRow={                                                       // ADD
    isBudgetTooltipGoalsEnabled ? <OverfundedRow month={month} /> : undefined
  }
  overfundedLabel={                                                     // ADD
    isBudgetTooltipGoalsEnabled ? <OverfundedLabel /> : undefined
  }
/>
```

**Checklist**:

- [ ] Add 4 new import statements (note: full path with `@desktop-client`)
- [ ] Add 4 new props to TotalsList call
- [ ] Conditionally render based on `isBudgetTooltipGoalsEnabled` (same flag)
- [ ] Pass `month` prop to row components

---

## Edge Cases Handled

1. **No categories have goals**: Both sums will be 0
2. **All categories hidden**: Sums reflect only visible categories (likely 0)
3. **User toggles show/hide**: Subscriptions update automatically via `visibleCategoryIds` dependency
4. **Categories added/removed**: `useEffect` handles subscription cleanup and recreation
5. **Month changes**: New `sheetName` triggers new subscriptions for the new month
6. **Goal/budgeted/balance values are null/undefined**: Coalesced to 0 in state updates (`?? 0`)
7. **Feature flag disabled**: Entire section hidden via existing conditional rendering in containers
8. **Income categories**: Explicitly excluded (same filter as `useGoalTargetSum`)
9. **Categories without goals**: Skipped in calculation (check `goal > 0`)
10. **Long goals vs template goals**: Both types handled correctly using same logic as BalanceWithCarryover

## Performance Considerations

- Each category requires 4 spreadsheet subscriptions instead of 1
- For 20 visible expense categories: 80 subscriptions created
- Spreadsheet engine handles batching and optimization
- `useMemo` prevents unnecessary recalculations of sums
- State updates are batched by React
- Subscriptions only recreate when `visibleCategoryIds` changes
- Hook is called twice per container (once for UnderfundedRow, once for OverfundedRow), but React should deduplicate the hook calls

## Testing Checklist

- [ ] Feature flag toggle works (enable/disable shows/hides rows)
- [ ] Shows correct underfunded sum (absolute values)
- [ ] Shows correct overfunded sum
- [ ] Yellow color (`theme.warningText`) applied when underfunded > 0
- [ ] Red color (`theme.errorText`) applied when overfunded > 0
- [ ] Updates when goal values change
- [ ] Updates when budgeted amounts change
- [ ] Updates when balance changes
- [ ] Updates when hiding/showing categories
- [ ] Updates when switching months
- [ ] Excludes hidden categories from calculations
- [ ] Excludes income categories from calculations
- [ ] Excludes categories without goals (goal = 0 or null)
- [ ] Handles long goals correctly (uses balance in calculation)
- [ ] Handles template goals correctly (uses budgeted in calculation)
- [ ] Proper currency formatting for both values
- [ ] No console errors or warnings
- [ ] No memory leaks (subscriptions cleaned up properly)
- [ ] Works in all 3 locations: BudgetSummary tooltip, ToBudget tooltip, EnvelopeBudgetSummaryModal

## AGENTS Compliance Verification

Per [AGENTS-chad-fork.md](../AGENTS-chad-fork.md):

✅ **Line 15-16: Upstream is source of truth**

- Flag defaults to `false` (inherited from existing flag)
- No behavior change when disabled

✅ **Line 18-19: Prefer additive changes**

- 5 new files created
- Only 4 existing files modified minimally
- No rewrites of existing logic

✅ **Line 21-22: Flags gate extensions, not rewrites**

- Feature flag enables additional UI components
- Does not fork code paths
- Container components decide what to render

✅ **Line 24-25: Seams are intentional and documented**

- Single explicit seam at container/boundary level
- Documented in this plan file

✅ **Line 27-28: Behavior in core, presentation in web**

- Calculation logic in hook (loot-core pattern)
- UI components in desktop-client
- Feature flag inherited from existing flag system

✅ **Line 70-71: Seams must exist independently of flags**

- TotalsList accepts optional props (seam exists regardless of flag)
- Containers decide what to pass

✅ **Line 73-74: Prefer high-level seams**

- Seam at container/boundary components
- NOT in leaf component (TotalsList)

## Success Criteria

Implementation is complete when:

1. All 5 new files created with correct code
2. All 4 existing files updated with minimal changes
3. Feature flag toggles the new rows on/off
4. Underfunded sum shows absolute values with yellow color
5. Overfunded sum shows with red color
6. All calculations match BalanceWithCarryover logic
7. No console errors or warnings
8. All edge cases handled correctly
9. AGENTS compliance verified
10. Code follows existing patterns exactly
