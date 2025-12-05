# Implementation Plan: Sort Categories by Schedule Due Date

## Summary

Add a persistent, toggleable option to sort budget categories by schedule due dates within their groups.

**What's being added**:

- New menu item: "Sort by schedule due date" in the Category dropdown (3-dot menu)
- Categories with schedule templates sort first by earliest due date
- Categories without schedules maintain original order, appear after scheduled ones
- Hidden categories always at end
- Preference persists across sessions

**Implementation approach**: Frontend-only sorting, no backend/database changes

## Overview

Add a toggleable option in the budget page category dropdown menu to sort categories by their linked schedule due dates. Categories will sort within their groups, with scheduled categories appearing first (by earliest due date) followed by non-scheduled categories (by original sort_order), and hidden categories always at the end.

## User Requirements Confirmed

- **Persistent**: Sort preference saved across sessions ✓
- **Within Groups**: Categories only sort within their own group ✓
- **Without Schedules**: Maintain current sort_order, appear after scheduled ones ✓
- **Multiple Schedules**: Use earliest due date ✓
- **Sort Direction**: Always ascending (earliest first) ✓
- **UI**: Toggleable option in dropdown menu ✓
- **Hidden Categories**: Always at end ✓

## Implementation Approach

Frontend-only solution using existing patterns:

- Store preference using `useLocalPref` (budget-scoped, persisted in localStorage)
- Fetch schedule data when sorting is enabled
- Apply sorting logic before rendering (in Budget component)
- Maintain all existing group structures and behaviors

---

## Files to Create

### 1. `/home/chid/git/actual/packages/desktop-client/src/hooks/useScheduleDueDates.ts` (NEW)

**Purpose**: Custom hook to fetch schedule next_date for categories with schedule templates

**Key Logic**:

```typescript
// Returns Map<categoryId, earliestNextDate | null>
export function useScheduleDueDates(
  categoryGroups: CategoryGroupEntity[],
  enabled: boolean,
): Map<string, string | null>;
```

**Implementation Steps**:

1. Extract all categories from all groups (flatten the structure)
2. For each category, parse `goal_def` JSON field to get Template[] array
3. Filter templates where `type === 'schedule'` to get ScheduleTemplate[]
4. Collect all unique schedule names
5. Use AQL query to fetch schedules by name in a single batch:

   ```typescript
   import { q } from 'loot-core/shared/query';
   import { aqlQuery } from '@desktop-client/queries/aqlQuery';

   const schedules = await aqlQuery(
     q('schedules')
       .filter({ name: { $oneof: scheduleNames }, tombstone: 0 })
       .select(['id', 'name', 'next_date']),
   );
   ```

6. Build Map: categoryId → earliest next_date (if category has multiple schedules, use earliest)
7. Use `useMemo` to cache results based on categoryGroups and enabled flag
8. Handle errors gracefully (malformed JSON, missing schedules, etc.)

**Error Handling**:

- Invalid goal_def JSON: Catch parse error, treat as no schedule
- Missing schedule: Return null for that category
- Null next_date: Return null for that category

---

### 2. `/home/chid/git/actual/packages/desktop-client/src/components/budget/sortCategories.ts` (NEW)

**Purpose**: Pure function to sort categories within groups by schedule due date

**Key Logic**:

```typescript
export function sortCategoriesByScheduleDueDate(
  categoryGroups: CategoryGroupEntity[],
  scheduleDueDates: Map<string, string | null>,
  showHiddenCategories: boolean,
): CategoryGroupEntity[];
```

**Algorithm for Each Group**:

1. Separate categories into buckets:
   - Hidden categories (if showHiddenCategories is true)
   - Scheduled categories (has next_date in map)
   - Non-scheduled categories (null or missing from map)

2. Sort scheduled categories:

   ```typescript
   scheduledCategories.sort((a, b) => {
     const dateA = scheduleDueDates.get(a.id)!;
     const dateB = scheduleDueDates.get(b.id)!;
     // If dates are equal, fall back to sort_order for stability
     if (dateA === dateB) {
       return (a.sort_order ?? 0) - (b.sort_order ?? 0);
     }
     // String comparison works for YYYY-MM-DD format
     return dateA.localeCompare(dateB);
   });
   ```

3. Keep non-scheduled in original order:

   ```typescript
   nonScheduledCategories.sort(
     (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
   );
   ```

4. Combine: `[scheduled, nonScheduled, hidden]`

5. Return new group objects with sorted categories array

**Key Constraints**:

- Never mix categories across groups
- Maintain group order (income vs expense separation)
- Preserve original categoryGroups structure (immutable approach)

---

## Files to Modify

### 3. `/home/chid/git/actual/packages/loot-core/src/types/prefs.ts`

**Location**: Line 75 (inside `LocalPrefs` type definition)

**Change**: Add new preference key after line 80:

```typescript
export type LocalPrefs = Partial<{
  'ui.showClosedAccounts': boolean;
  'expand-splits': boolean;
  'budget.collapsed': string[];
  'budget.summaryCollapsed': boolean;
  'budget.showHiddenCategories': boolean;
  'budget.sortByScheduleDueDate': boolean; // NEW
  'budget.startMonth': string;
  // ... rest
}>;
```

**Rationale**: Follows existing pattern for budget display preferences

---

### 4. `/home/chid/git/actual/packages/desktop-client/src/components/budget/index.tsx`

**Purpose**: Integrate sorting logic into main Budget component

**Changes**:

**4a. Add imports** (after line 19):

```typescript
import { useScheduleDueDates } from '@desktop-client/hooks/useScheduleDueDates';
import { sortCategoriesByScheduleDueDate } from './sortCategories';
```

**4b. Add preference hook** (after line 52):

```typescript
const { grouped: categoryGroups } = useCategories();
const [sortByScheduleDueDate] = useLocalPref('budget.sortByScheduleDueDate');
const [showHiddenCategories] = useLocalPref('budget.showHiddenCategories');
```

**4c. Fetch schedule data** (after preference hooks):

```typescript
const scheduleDueDates = useScheduleDueDates(
  categoryGroups,
  sortByScheduleDueDate ?? false,
);
```

**4d. Apply sorting with memoization** (after schedule data fetch):

```typescript
const displayCategoryGroups = useMemo(() => {
  if (sortByScheduleDueDate && scheduleDueDates) {
    return sortCategoriesByScheduleDueDate(
      categoryGroups,
      scheduleDueDates,
      showHiddenCategories ?? false,
    );
  }
  return categoryGroups;
}, [
  categoryGroups,
  sortByScheduleDueDate,
  scheduleDueDates,
  showHiddenCategories,
]);
```

**4e. Update props passed to AutoSizingBudgetTable** (lines 156-172 and 183-199):
Add `categoryGroups={displayCategoryGroups}` to the props for both budget types:

```typescript
<AutoSizingBudgetTable
  type={budgetType}
  categoryGroups={displayCategoryGroups}  // NEW
  prewarmStartMonth={startMonth}
  // ... rest of props
/>
```

---

### 5. `/home/chid/git/actual/packages/desktop-client/src/components/budget/DynamicBudgetTable.tsx`

**Purpose**: Thread categoryGroups prop from Budget to BudgetTable

**Changes**:

**5a. Update type definition** (line 34-37):

```typescript
type DynamicBudgetTableProps = {
  width: number;
  height: number;
  categoryGroups: CategoryGroupEntity[]; // NEW
} & AutoSizingBudgetTableProps;
```

**5b. Also add to AutoSizingBudgetTableProps** (need to check where this is defined):
If `AutoSizingBudgetTableProps` is defined in this file, add `categoryGroups` to it.
If it's imported, we'll need to update its source.

**5c. Forward prop to BudgetTable** (around line 105-130):
Pass `categoryGroups={categoryGroups}` to the `BudgetTable` component.

**Note**: Need to read more of this file to see the full component structure.

---

### 6. `/home/chid/git/actual/packages/desktop-client/src/components/budget/BudgetTable.tsx`

**Purpose**: Accept and use categoryGroups prop instead of calling useCategories() hook

**Changes**:

**6a. Update type definition** (line 30):

```typescript
type BudgetTableProps = {
  type: string;
  categoryGroups: CategoryGroupEntity[]; // NEW
  prewarmStartMonth: string;
  // ... rest
};
```

**6b. Accept prop in function** (line 56-72):

```typescript
export function BudgetTable(props: BudgetTableProps) {
  const {
    type,
    categoryGroups,  // NEW - destructure from props
    prewarmStartMonth,
    // ... rest
  } = props;
```

**6c. Remove or modify useCategories() call** (line 74):
Option 1 - Remove entirely:

```typescript
// REMOVED: const { grouped: categoryGroups = [] } = useCategories();
```

Option 2 - Keep as fallback (safer for backwards compatibility):

```typescript
const { grouped: categoryGroupsFromHook = [] } = useCategories();
const effectiveCategoryGroups = categoryGroups ?? categoryGroupsFromHook;
// Then use effectiveCategoryGroups throughout the component
```

**Recommendation**: Option 2 for safety during initial implementation.

---

### 7. `/home/chid/git/actual/packages/desktop-client/src/components/budget/BudgetTotals.tsx`

**Purpose**: Add UI toggle for sort preference

**Changes**:

**7a. Import preference hook** (after line 22):

```typescript
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';
```

**7b. Add state for sort preference** (after line 38):

```typescript
const [sortByScheduleDueDate, setSortByScheduleDueDatePref] = useLocalPref(
  'budget.sortByScheduleDueDate',
);
```

**7c. Add handler in onMenuSelect** (inside the function at line 155, after line 162):

```typescript
} else if (type === 'sortBySchedule') {
  setSortByScheduleDueDatePref(!sortByScheduleDueDate);
}
```

**7d. Add menu item** (in items array at line 165, before closing bracket at line 178):

```typescript
{
  name: 'sortBySchedule',
  text: sortByScheduleDueDate
    ? t('Disable schedule sorting')
    : t('Sort by schedule due date'),
},
```

**UI Behavior**: Menu item text changes based on current state (enabled/disabled)

---

## Category Data Flow (Resolved)

**Current Flow**:

- `Budget` component calls `useCategories()` to get categories (index.tsx:52)
- `BudgetTable` component **also** calls `useCategories()` independently (BudgetTable.tsx:74)
- Categories are NOT passed as props from parent to child

**Solution: Pass Categories as Props**
We need to pass sorted categories from Budget → DynamicBudgetTable → BudgetTable as a prop.

### Additional Changes Required:

**File**: `/home/chid/git/actual/packages/desktop-client/src/components/budget/DynamicBudgetTable.tsx`

- Add `categoryGroups` to `AutoSizingBudgetTableProps` type (around line 34)
- Forward the prop to `BudgetTable` component

**File**: `/home/chid/git/actual/packages/desktop-client/src/components/budget/BudgetTable.tsx`

- Add `categoryGroups` to `BudgetTableProps` type (line 30)
- Accept the prop in function signature (line 56)
- **Remove** or keep as fallback the `useCategories()` hook call (line 74)
- Use passed `categoryGroups` prop instead of hook result

**Why this approach**:

- Clean and explicit data flow
- No need for additional React Context
- Follows existing pattern (BudgetTable already receives many props)
- Allows parent to control the data (sorted or unsorted)

---

## Implementation Order

1. **Add preference type** (prefs.ts)
2. **Create useScheduleDueDates hook** (useScheduleDueDates.ts)
3. **Create sorting utility** (sortCategories.ts)
4. **Thread categoryGroups prop**:
   - Update DynamicBudgetTable.tsx type and forwarding
   - Update BudgetTable.tsx to accept and use prop
5. **Integrate into Budget component** (index.tsx)
6. **Add UI toggle** (BudgetTotals.tsx)
7. **Manual testing** (verify sorting works correctly)

---

## Testing Scenarios

### Basic Functionality

1. **Enable sorting**: Toggle menu option, verify categories reorder by schedule date
2. **Disable sorting**: Toggle off, verify categories return to original sort_order
3. **Persistence**: Refresh page, verify preference is remembered

### Edge Cases

4. **Mixed categories**: Group with scheduled + non-scheduled categories
   - Verify scheduled appear first (sorted by date)
   - Verify non-scheduled appear after (by sort_order)
5. **Multiple schedules per category**: Category with 2+ schedule templates
   - Verify uses earliest date for sorting
6. **Hidden categories**: Toggle hidden categories on
   - Verify they always appear at end (both sorted and unsorted modes)
7. **Group boundaries**: Schedules in different groups
   - Verify categories never cross group boundaries
   - Verify each group sorts independently
8. **Income group**: Add schedule templates to income categories
   - Verify sorting works same as expense groups
9. **Missing/invalid data**:
   - Category references non-existent schedule
   - Category has malformed goal_def JSON
   - Schedule has null next_date
   - Verify graceful handling (treat as non-scheduled)

### Performance

10. **Large budget**: 50+ categories
    - Verify no lag when toggling sort
    - Check browser console for errors

---

## Data Structures Reference

### ScheduleTemplate (from goal_def)

```typescript
{
  type: 'schedule',
  name: string,        // Links to schedule by name
  priority: number,
  directive: 'template',
  full?: boolean,
  adjustment?: number
}
```

### ScheduleEntity

```typescript
{
  id: string,
  name: string,
  next_date: string,   // YYYY-MM-DD format
  completed: boolean,
  tombstone: boolean
}
```

### CategoryEntity

```typescript
{
  id: string,
  name: string,
  goal_def: string,    // JSON string: Template[]
  sort_order: number,
  hidden: boolean,
  group: string        // category group id
}
```

---

## Notes

- **No backend changes**: All sorting happens in frontend
- **No database modifications**: Never touch sort_order field
- **Immutable approach**: Return new objects, don't mutate originals
- **Graceful degradation**: If schedule data fails to load, fall back to original order
- **Performance**: Single batch query for all schedules (not per-category)
- **Localized changes**: Feature is isolated to budget page, doesn't affect other views

---

## Open Questions for Implementation

1. ~~**Category data flow**: How do child components access category data?~~ **RESOLVED** - Pass as props through component tree
2. **Menu item styling**: Should we use a different menu item style (e.g., checkbox) to show state? - Current approach uses dynamic text (enabled/disabled)
3. **Loading state**: Should we show loading indicator while fetching schedule data? - Probably not needed (fast query)
4. **Error handling UI**: Should we show error message if schedule fetch fails? - Fail silently and fall back to unsorted

These minor questions can be resolved during implementation based on testing.

---

## Quick Reference: All Files Changed

### New Files (2)

1. `/home/chid/git/actual/packages/desktop-client/src/hooks/useScheduleDueDates.ts` - Hook to fetch schedule due dates
2. `/home/chid/git/actual/packages/desktop-client/src/components/budget/sortCategories.ts` - Sorting utility function

### Modified Files (5)

1. `/home/chid/git/actual/packages/loot-core/src/types/prefs.ts` - Add preference type
2. `/home/chid/git/actual/packages/desktop-client/src/components/budget/index.tsx` - Apply sorting logic
3. `/home/chid/git/actual/packages/desktop-client/src/components/budget/DynamicBudgetTable.tsx` - Thread prop
4. `/home/chid/git/actual/packages/desktop-client/src/components/budget/BudgetTable.tsx` - Accept prop
5. `/home/chid/git/actual/packages/desktop-client/src/components/budget/BudgetTotals.tsx` - Add UI toggle

**Total changes**: 2 new files, 5 modified files
