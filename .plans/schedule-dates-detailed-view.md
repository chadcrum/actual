# Display Schedule Template Dates in Mobile Budget Detailed View

## Progress
- [x] Add `fetchCategoryScheduleDates()` to useScheduleDueDates.ts
- [x] Update BudgetPage.tsx to fetch and store schedule dates
- [x] Thread categoryScheduleDates prop through component hierarchy
- [x] Implement schedule dates display in ExpenseCategoryListItem

**IMPLEMENTATION COMPLETE** ✅

## Overview
Add schedule template due dates under category names in the mobile budget detailed view. Dates display in the 25px expansion area when `mobileDetailedView` is enabled.

## Requirements
- **Display location**: Under category name in expansion area
- **Visibility**: Only when detailed view toggle is enabled
- **Date format**: MM/DD/YY (e.g., "12/9/25")
- **Sorting**: Soonest first (left to right), considering year
- **Limit**: Display 2 schedules maximum, show "..." if more exist
- **Font size**: 12px (smaller than category name's 16px)
- **Color**: `theme.pageTextSubdued`

## Implementation Strategy

### Architecture Decision
Extend existing schedule data fetching in BudgetPage to include all schedule dates (not just earliest). Pass data down component tree as new prop `categoryScheduleDates`.

**Data Structure**:
```typescript
type ScheduleDateInfo = {
  scheduleId: string;
  scheduleName: string;
  nextDate: string; // YYYY-MM-DD format
};

type CategoryScheduleDates = Map<string, ScheduleDateInfo[]>;
```

### Data Flow
```
BudgetPage (fetch data, store in state)
  → BudgetTable
  → ExpenseGroupList
  → ExpenseGroupListItem
  → ExpenseCategoryList
  → ExpenseCategoryListItem (display dates in expansion area)
```

### Why This Approach?
- **Performance**: Single batch query (no per-category queries)
- **Efficient**: Leverages existing `fetchScheduleDueDates()` pattern
- **Clean**: Follows existing prop threading pattern (like `mobileDetailedView`)
- **Independent**: Works without feature flags

## Implementation Steps

### 1. Create Data Fetching Function ✅

**File**: [packages/desktop-client/src/hooks/useScheduleDueDates.ts](packages/desktop-client/src/hooks/useScheduleDueDates.ts)

**Status**: COMPLETE - Added `fetchCategoryScheduleDates()` and `ScheduleDateInfo` type

### 2. Fetch Data in BudgetPage

**File**: [packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx](packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx)

**Changes**:

1. Add state after line 90:
```typescript
const [categoryScheduleDates, setCategoryScheduleDates] = useState<
  Map<string, ScheduleDateInfo[]>
>(new Map());
```

2. Update useEffect (lines 106-114) to fetch both maps:
```typescript
useEffect(() => {
  if (sortByScheduleDueDate && categoryGroups) {
    Promise.all([
      fetchScheduleDueDates(categoryGroups),
      fetchCategoryScheduleDates(categoryGroups),
    ]).then(([dueDates, scheduleDates]) => {
      setScheduleDueDates(dueDates);
      setCategoryScheduleDates(scheduleDates);
    });
  } else {
    setScheduleDueDates(new Map());
    setCategoryScheduleDates(new Map());
  }
}, [sortByScheduleDueDate, categoryGroups]);
```

3. Import the new function at top of file:
```typescript
import {
  fetchScheduleDueDates,
  fetchCategoryScheduleDates,
  type ScheduleDateInfo,
} from '@desktop-client/hooks/useScheduleDueDates';
```

4. Pass `categoryScheduleDates` to BudgetTable (around line 646):
```typescript
<BudgetTable
  // ... existing props
  categoryScheduleDates={categoryScheduleDates}
/>
```

### 3. Thread Props Through Component Hierarchy

**File 1**: [packages/desktop-client/src/components/mobile/budget/BudgetTable.tsx](packages/desktop-client/src/components/mobile/budget/BudgetTable.tsx)

- Add to `BudgetTableProps` (line ~334): `categoryScheduleDates: Map<string, ScheduleDateInfo[]>;`
- Add to `BudgetGroupsProps` (line ~244): `categoryScheduleDates: Map<string, ScheduleDateInfo[]>;`
- Pass to BudgetGroups component (line ~450)

**File 2**: [packages/desktop-client/src/components/mobile/budget/ExpenseGroupList.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseGroupList.tsx)

- Add to props type (line ~21): `categoryScheduleDates: Map<string, ScheduleDateInfo[]>;`
- Destructure in component
- Pass to ExpenseGroupListItem (line ~162)

**File 3**: [packages/desktop-client/src/components/mobile/budget/ExpenseGroupListItem.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseGroupListItem.tsx)

- Add to props type (line ~33): `categoryScheduleDates: Map<string, ScheduleDateInfo[]>;`
- Destructure in component
- Pass to ExpenseCategoryList (line ~105)

**File 4**: [packages/desktop-client/src/components/mobile/budget/ExpenseCategoryList.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseCategoryList.tsx)

- Add to props type (line ~18): `categoryScheduleDates: Map<string, ScheduleDateInfo[]>;`
- Destructure in component
- Pass to ExpenseCategoryListItem (line ~141)

### 4. Display Schedule Dates in ExpenseCategoryListItem

**File**: [packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx)

**Changes**:

1. Add to props type (line ~220): `categoryScheduleDates: Map<string, ScheduleDateInfo[]>;`

2. Add helper function near top of file:
```typescript
function formatScheduleDate(dateString: string): string {
  // Convert YYYY-MM-DD to MM/DD/YY
  const [year, month, day] = dateString.split('-');
  const shortYear = year.slice(2); // Get last 2 digits
  return `${parseInt(month)}/${parseInt(day)}/${shortYear}`;
}
```

3. Add component to render schedule dates:
```typescript
function ScheduleDatesDisplay({
  categoryId,
  scheduleDates,
  theme,
}: {
  categoryId: string;
  scheduleDates: Map<string, ScheduleDateInfo[]>;
  theme: Theme;
}) {
  const schedules = scheduleDates.get(categoryId) || [];

  if (schedules.length === 0) {
    return null;
  }

  const MAX_DISPLAY = 2;
  const displaySchedules = schedules.slice(0, MAX_DISPLAY);
  const hasMore = schedules.length > MAX_DISPLAY;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingTop: 2,
      }}
    >
      {displaySchedules.map((schedule, index) => (
        <Text
          key={schedule.scheduleId}
          style={{
            fontSize: 12,
            color: theme.pageTextSubdued,
          }}
        >
          {formatScheduleDate(schedule.nextDate)}
          {index < displaySchedules.length - 1 ? ',' : ''}
        </Text>
      ))}
      {hasMore && (
        <Text
          style={{
            fontSize: 12,
            color: theme.pageTextSubdued,
          }}
        >
          ...
        </Text>
      )}
    </View>
  );
}
```

4. Update expansion area (lines 448-464):
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
      justifyContent: 'center', // ADD: Center content vertically
    }}
  >
    <ScheduleDatesDisplay
      categoryId={category.id}
      scheduleDates={categoryScheduleDates}
      theme={theme}
    />
  </View>
)}
```

## Type Exports

Ensure `ScheduleDateInfo` type is exported from useScheduleDueDates.ts so it can be imported in other files:

```typescript
export type ScheduleDateInfo = {
  scheduleId: string;
  scheduleName: string;
  nextDate: string;
};
```

## Edge Cases Handled

- **No schedules**: Returns null, displays nothing
- **Null next_date**: Filtered during data processing
- **Deleted schedules**: Filtered by `tombstone: false` query
- **Hidden categories**: Inherits opacity (0.5) from expansion area
- **Year boundaries**: String sort on YYYY-MM-DD handles correctly (e.g., "2025-12-30" < "2026-01-05")
- **Detailed view disabled**: Entire expansion area not rendered

## Testing Checklist

- [ ] Category with 0 schedules: Displays nothing
- [ ] Category with 1 schedule: Displays single date (e.g., "12/9/25")
- [ ] Category with 2 schedules: Displays both dates with comma (e.g., "12/9/25, 12/25/25")
- [ ] Category with 3+ schedules: Displays first 2 dates + "..." (e.g., "12/9/25, 12/25/25, ...")
- [ ] Year boundary: Dates sort correctly (e.g., "12/30/25, 1/5/26")
- [ ] Detailed view toggle: Dates appear/disappear when toggled
- [ ] Hidden categories: Dates show with 50% opacity
- [ ] Current month highlighting: Background color correct
- [ ] Long category names: Layout doesn't break with dates displayed

## Files Modified Summary

**Critical files** (core implementation):
1. [packages/desktop-client/src/hooks/useScheduleDueDates.ts](packages/desktop-client/src/hooks/useScheduleDueDates.ts) - Add `fetchCategoryScheduleDates()` and type ✅
2. [packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx](packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx) - Fetch and store data
3. [packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx) - Display dates

**Threading files** (prop pass-through):
4. [packages/desktop-client/src/components/mobile/budget/BudgetTable.tsx](packages/desktop-client/src/components/mobile/budget/BudgetTable.tsx)
5. [packages/desktop-client/src/components/mobile/budget/ExpenseGroupList.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseGroupList.tsx)
6. [packages/desktop-client/src/components/mobile/budget/ExpenseGroupListItem.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseGroupListItem.tsx)
7. [packages/desktop-client/src/components/mobile/budget/ExpenseCategoryList.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseCategoryList.tsx)

**Total**: 7 files

## Performance Notes

- **Single batch query**: `fetchCategoryScheduleDates()` uses one database query for all schedules
- **Efficient data structure**: Map lookup is O(1) per category
- **Conditional rendering**: Only renders when `mobileDetailedView` is enabled
- **Pre-sorted data**: Dates sorted once during fetch, not on every render
