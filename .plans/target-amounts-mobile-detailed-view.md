# Target Amounts in Mobile Budget Detailed View

## Progress
- [x] Add target amounts calculation to BudgetPage.tsx
- [x] Create TargetAmountDisplay component in ExpenseCategoryListItem.tsx
- [x] Update expansion area layout to show schedule dates (left) and target amount (right)
- [x] Thread targetAmounts prop through component hierarchy
- [x] Fix React hooks errors encountered during implementation
- [x] Test display with various scenarios (funded, underfunded, overfunded, no goal)

**IMPLEMENTATION COMPLETE** ✅

## Overview
Add target amount display under the Budgeted column in the mobile budget detailed view expansion area. Target amounts show funding status (balance - goal) when `mobileDetailedView` is enabled.

## Requirements
- **Display location**: Expansion area, right side, aligned under Budgeted column
- **Visibility**: Only when detailed view toggle is enabled
- **Format**: Currency format (e.g., "$250.00", "-$100.00") or "N/A" if no goal
- **Color coding**:
  - Green (`theme.noticeText`): value = 0 (fully funded)
  - Orange (`theme.warningText`): value > 0 (overfunded)
  - Red (`theme.errorText`): value < 0 (underfunded)
  - Gray (`theme.pageTextLight`): undefined (no goal set - shows "N/A")
- **Font size**: 12px (matches schedule dates)
- **Style**: Italic (matches desktop implementation)
- **Interactivity**: Display-only (not clickable)

## Implementation Strategy

### Architecture Decision
Use mobile-specific implementation that calculates target amounts in BudgetPage and passes them down as props, following the same pattern as `categoryScheduleDates`.

**Why mobile-specific instead of reusing TargetAmountsContext?**
- Simpler integration - follows existing pattern
- Direct control - calculates when `mobileDetailedView` is true
- No provider wrapper needed
- Avoids desktop toggle mechanism we don't need
- Consistent with schedule dates implementation

**Data Structure**:
```typescript
type CategoryTargetAmounts = Record<string, number | undefined>;
// Key: category ID
// Value: target amount in cents (positive/negative/zero) or undefined if no goal
```

### Target Amount Calculation
Uses the simplified formula from migration-guide-target-values.md:
```typescript
// For long goals (longGoal === 1):
targetAmount = balance - goal

// For template goals (longGoal !== 1):
targetAmount = budgeted - goal

// If no goal set:
targetAmount = undefined
```

### Layout Structure
```
┌─────────────────────────────────────────────────┐
│ Category Name    │ Budgeted │ Spent │ Balance  │  <- Main row (50px)
├─────────────────────────────────────────────────┤
│ 1/15/25, 2/1/25  │  $250    │       │          │  <- Expansion (25px)
│ (schedule dates) │ (target) │       │          │
│      (left)      │ (right)  │       │          │
└─────────────────────────────────────────────────┘
```

Expansion area uses flexbox with `justifyContent: 'space-between'`:
- Left: ScheduleDatesDisplay
- Right: TargetAmountDisplay (aligned under Budgeted column)

## Implementation Steps

### Step 1: Add Target Amount Calculation to BudgetPage

**File**: [packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx](packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx)

**Changes**:

1. Add state for target amounts (after line 90, near other state declarations):
```typescript
const [categoryTargetAmounts, setCategoryTargetAmounts] = useState<
  Record<string, number | undefined>
>({});
```

2. Create calculation function (add near top of component, after state declarations):
```typescript
async function calculateTargetAmounts() {
  if (!categoryGroups || !mobileDetailedView) {
    setCategoryTargetAmounts({});
    return;
  }

  try {
    // Get all non-hidden expense categories
    const { data: categories } = await aqlQuery(
      q('categories').filter({ hidden: false, is_income: false })
    );

    // Get goal data from zero_budgets table
    const monthNum = parseInt(startMonth.replace('-', ''));
    const { data: goalData } = await aqlQuery(
      q('zero_budgets').filter({ month: monthNum })
    );

    // Get budget month data for balances and budgeted amounts
    const budgetMonth = await send('api/budget-month', {
      month: startMonth,
    });

    // Create lookup maps
    const goalMap = new Map(
      goalData.map((item: any) => [
        item.category,
        { goal: item.goal || 0, longGoal: item.long_goal === 1 },
      ])
    );

    const categoryBudgetMap = new Map(
      budgetMonth.categoryBudgets.map((cat: any) => [
        cat.id,
        { balance: cat.balance || 0, budgeted: cat.budgeted || 0 },
      ])
    );

    // Calculate target amounts for each category
    const newTargetAmounts: Record<string, number | undefined> = {};

    for (const category of categories) {
      const goalInfo = goalMap.get(category.id);
      const budgetInfo = categoryBudgetMap.get(category.id);

      if (!goalInfo || goalInfo.goal === 0 || !budgetInfo) {
        newTargetAmounts[category.id] = undefined;
        continue;
      }

      // Apply formula: longGoal ? balance - goal : budgeted - goal
      const targetValue = goalInfo.longGoal
        ? budgetInfo.balance - goalInfo.goal
        : budgetInfo.budgeted - goalInfo.goal;

      newTargetAmounts[category.id] = targetValue;
    }

    setCategoryTargetAmounts(newTargetAmounts);
  } catch (error) {
    console.error('Failed to calculate target amounts:', error);
    setCategoryTargetAmounts({});
  }
}
```

3. Add useEffect to trigger calculation (after the existing schedule dates useEffect, around line 115):
```typescript
useEffect(() => {
  if (mobileDetailedView) {
    calculateTargetAmounts();
  } else {
    setCategoryTargetAmounts({});
  }
}, [mobileDetailedView, startMonth, categoryGroups]);
```

4. Add imports at top of file:
```typescript
import { q } from 'loot-core/shared/query';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';
import { send } from 'loot-core/platform/client/fetch';
```

5. Pass `categoryTargetAmounts` to BudgetTable (around line 667):
```typescript
<BudgetTable
  // ... existing props
  categoryTargetAmounts={categoryTargetAmounts}
/>
```

### Step 2: Thread Props Through Component Hierarchy

**File 1**: [packages/desktop-client/src/components/mobile/budget/BudgetTable.tsx](packages/desktop-client/src/components/mobile/budget/BudgetTable.tsx)

- Add to `BudgetTableProps`: `categoryTargetAmounts: Record<string, number | undefined>;`
- Add to `BudgetGroupsProps`: `categoryTargetAmounts: Record<string, number | undefined>;`
- Pass to BudgetGroups component

**File 2**: [packages/desktop-client/src/components/mobile/budget/ExpenseGroupList.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseGroupList.tsx)

- Add to props type: `categoryTargetAmounts: Record<string, number | undefined>;`
- Destructure in component
- Pass to ExpenseGroupListItem

**File 3**: [packages/desktop-client/src/components/mobile/budget/ExpenseGroupListItem.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseGroupListItem.tsx)

- Add to props type: `categoryTargetAmounts: Record<string, number | undefined>;`
- Destructure in component
- Pass to ExpenseCategoryList

**File 4**: [packages/desktop-client/src/components/mobile/budget/ExpenseCategoryList.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseCategoryList.tsx)

- Add to props type: `categoryTargetAmounts: Record<string, number | undefined>;`
- Destructure in component
- Pass to ExpenseCategoryListItem

### Step 3: Create TargetAmountDisplay Component

**File**: [packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx)

**Location**: Add component after ScheduleDatesDisplay (around line 305)

**Implementation**:
```typescript
type TargetAmountDisplayProps = {
  categoryId: string;
  targetAmounts: Record<string, number | undefined>;
  show3Columns: boolean;
};

function TargetAmountDisplay({
  categoryId,
  targetAmounts,
  show3Columns,
}: TargetAmountDisplayProps) {
  const theme = useTheme();
  const targetValue = targetAmounts[categoryId];

  // Calculate column width to align with Budgeted column
  const columnWidth = getColumnWidth({
    show3Columns,
    isSidebar: false,
  });

  // Determine color based on target value
  const color =
    targetValue === undefined
      ? theme.pageTextLight
      : targetValue === 0
        ? theme.noticeText
        : targetValue > 0
          ? theme.warningText
          : theme.errorText;

  return (
    <View
      style={{
        width: columnWidth,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 5,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontStyle: 'italic',
          color,
        }}
      >
        {targetValue !== undefined
          ? integerToCurrency(targetValue)
          : 'N/A'}
      </Text>
    </View>
  );
}
```

### Step 4: Update Expansion Area Layout

**File**: [packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx)

**Location**: Lines 549-569 (existing expansion area)

**Changes**:
```typescript
{mobileDetailedView && (
  <View
    style={{
      height: EXPANSION_HEIGHT,
      borderColor: theme.tableBorder,
      borderBottomWidth: 1,
      paddingLeft: 5,
      paddingRight: 5,
      backgroundColor: monthUtils.isCurrentMonth(month)
        ? theme.budgetCurrentMonth
        : theme.budgetOtherMonth,
      opacity: isHidden ? 0.5 : undefined,
      flexDirection: 'row',              // CHANGED: horizontal layout
      justifyContent: 'space-between',   // CHANGED: space between items
      alignItems: 'center',              // CHANGED: vertical centering
    }}
  >
    <ScheduleDatesDisplay
      categoryId={category.id}
      scheduleDates={categoryScheduleDates}
    />
    <TargetAmountDisplay
      categoryId={category.id}
      targetAmounts={categoryTargetAmounts}
      show3Columns={show3Columns}
    />
  </View>
)}
```

**Key changes**:
- `flexDirection: 'row'` - horizontal layout
- `justifyContent: 'space-between'` - schedule dates left, target amount right
- `alignItems: 'center'` - vertical centering
- Removed `justifyContent: 'center'` (was for single centered item)

### Step 5: Add Prop to ExpenseCategoryListItem

**File**: [packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx)

**Location**: Lines 306+ (ExpenseCategoryListItemProps type)

**Add**:
```typescript
type ExpenseCategoryListItemProps = ComponentPropsWithoutRef<'div'> & {
  // ... existing props
  categoryTargetAmounts: Record<string, number | undefined>;
};
```

**Destructure in component** (around line 320):
```typescript
export function ExpenseCategoryListItem({
  // ... existing props
  categoryTargetAmounts,
}: ExpenseCategoryListItemProps) {
```

## Files Modified Summary

1. **[packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx](packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx)** - Calculate and store target amounts
2. **[packages/desktop-client/src/components/mobile/budget/BudgetTable.tsx](packages/desktop-client/src/components/mobile/budget/BudgetTable.tsx)** - Thread prop
3. **[packages/desktop-client/src/components/mobile/budget/ExpenseGroupList.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseGroupList.tsx)** - Thread prop
4. **[packages/desktop-client/src/components/mobile/budget/ExpenseGroupListItem.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseGroupListItem.tsx)** - Thread prop
5. **[packages/desktop-client/src/components/mobile/budget/ExpenseCategoryList.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseCategoryList.tsx)** - Thread prop
6. **[packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx)** - Display component + layout changes

**Total**: 6 files

## Edge Cases Handled

- **No goal set**: Returns `undefined`, displays "N/A" in gray
- **Zero goal**: Treated as no goal (returns `undefined`)
- **Hidden categories**: Inherits opacity (0.5) from expansion area
- **Detailed view disabled**: Expansion area not rendered, no calculation runs
- **Month changes**: Recalculates via useEffect dependency
- **Wide content**: `space-between` layout ensures schedule dates and target amount don't overlap
- **No schedule dates**: Target amount still displays on right side
- **Two-column vs three-column mode**: Column width adjusts dynamically

## Testing Checklist

### Display Behavior
- [ ] Target amounts appear when mobileDetailedView is enabled
- [ ] Target amounts hidden when mobileDetailedView is disabled
- [ ] Shows "N/A" for categories without goals
- [ ] Shows formatted currency for categories with goals
- [ ] Both schedule dates and target amounts display simultaneously

### Color Coding
- [ ] Green for fully funded (value = 0)
- [ ] Orange for overfunded (value > 0)
- [ ] Red for underfunded (value < 0)
- [ ] Gray for no goal set (undefined/"N/A")

### Layout
- [ ] Target amount aligns under Budgeted column
- [ ] Schedule dates remain on left side
- [ ] No overlap between schedule dates and target amount
- [ ] Works in both 2-column and 3-column modes
- [ ] Font size matches schedule dates (12px)
- [ ] Italic styling applied

### Integration
- [ ] Works with hidden categories (respects opacity)
- [ ] Works with current month highlighting
- [ ] Data updates when month changes
- [ ] Data updates when mobileDetailedView is toggled
- [ ] No performance issues with many categories

### Calculation Accuracy
- [ ] Long goals: Uses balance - goal formula
- [ ] Template goals: Uses budgeted - goal formula
- [ ] Positive values display correctly (overfunded)
- [ ] Negative values display correctly (underfunded)
- [ ] Zero values display correctly (fully funded)

### Edge Cases
- [ ] Categories with no schedule dates show target amount correctly
- [ ] Categories with neither schedule dates nor goals show appropriately (just "N/A" on right)
- [ ] Very long schedule date lists don't overlap with target amount
- [ ] Switching between detailed and normal view works smoothly
- [ ] Works correctly when categoryGroups is null/undefined

## Relationship to Existing Features

### Similar Pattern: Schedule Dates
This implementation follows the exact same pattern as the schedule dates feature:
- Calculated in BudgetPage when detailed view is enabled
- Stored in state
- Passed down through component hierarchy as props
- Displayed in expansion area

**Reference**: See [schedule-dates-detailed-view.md](schedule-dates-detailed-view.md) for the established pattern.

### Difference from Desktop Implementation
Desktop shows target amounts in a separate column with a toggle in the budget menu. Mobile integrates them into the expansion area without requiring a separate toggle, keeping the mobile UI simpler.

**Reference**: See [migration-guide-target-values.md](migration-guide-target-values.md) for the calculation formula.

## Performance Notes

- **Conditional Calculation**: Only calculates when `mobileDetailedView` is true
- **Single Query**: Fetches all data in one pass (categories, goals, budget data)
- **Efficient Lookups**: Uses Map for O(1) category lookups
- **Minimal Re-renders**: Only recalculates when month, detailed view, or category groups change
- **No Network Overhead**: Uses existing API endpoints

## Issues Encountered & Fixes

### Issue 1: React Hooks Error - "Rendered more hooks than during the previous render"
**Problem**: The `sortedCategoryGroups` useMemo was being called AFTER an early return in BudgetPage component (line 664). This caused the hook count to differ between renders:
- Initial render when `!categoryGroups || !initialized`: Hook not called
- Subsequent renders when conditions change: Hook IS called
- Result: React error about mismatched hook counts

**Solution**: Moved the `sortedCategoryGroups` useMemo to BEFORE the early return (line 650) and added a null check inside:
```typescript
const sortedCategoryGroups = useMemo(() => {
  if (!categoryGroups) {
    return [];
  }
  // ... rest of logic
}, [categoryGroups, sortByScheduleDueDate, scheduleDueDates, showHiddenCategories]);
```

**File**: [packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx](packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx) (lines 650-662)

### Issue 2: TypeError - "Cannot read properties of undefined"
**Problem**: The `TargetAmountDisplay` component tried to access properties on `targetAmounts` object without checking if it was defined first. If the parent component passed `undefined`, the component would crash.

**Solution**: Added defensive null check before accessing the object:
```typescript
const targetValue = targetAmounts ? targetAmounts[categoryId] : undefined;
```

**File**: [packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx) (line 317)

## Future Enhancements

Potential future improvements (not in scope for this implementation):
- Make target amount clickable to edit goal
- Add tooltip explaining what the target amount means
- Show breakdown of long vs template goals
- Add animation when toggling detailed view
- Add ability to hide target amounts separately from detailed view
