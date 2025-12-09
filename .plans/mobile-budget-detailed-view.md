# Detailed View Toggle for Mobile Budget

## Overview
Add a "Detailed View" toggle option to the envelope budget month Actions menu that expands expense category rows from 50px to 75px. The toggle state persists across sessions using local preferences.

## Requirements
- Add toggle option to month Actions menu (envelope budget only)
- Persist toggle state across sessions
- Expand expense category rows from 50px to 75px when enabled
- Expansion area (25px) initially empty, ready for future content
- All expense category rows expand/collapse together
- Only affects expense categories (not income or group headers)

## Implementation Strategy

### State Management
Follow the `sortByScheduleDueDate` pattern using `useLocalPref('budget.mobileDetailedView')`:
- Store preference in localStorage with budget ID prefix
- Default to `false` for backward compatibility
- Manage state in `EnvelopeBudgetMonthMenuModal.tsx`
- Pass through component hierarchy to `ExpenseCategoryListItem.tsx`

### Data Flow
```
EnvelopeBudgetMonthMenuModal (state)
  → BudgetMonthMenu (menu item)

BudgetPage (read pref)
  → BudgetTable
  → BudgetGroups
  → ExpenseGroupList
  → ExpenseGroupListItem
  → ExpenseCategoryList
  → ExpenseCategoryListItem (render expansion)
```

## Files to Modify

### 1. Add Type Definition
**File**: [packages/loot-core/src/types/prefs.ts](packages/loot-core/src/types/prefs.ts)

Add to `LocalPrefs` type (after `'mobile.showSpentColumn'`):
```typescript
'budget.mobileDetailedView': boolean;
```

### 2. State Management in Modal
**File**: [packages/desktop-client/src/components/modals/EnvelopeBudgetMonthMenuModal.tsx](packages/desktop-client/src/components/modals/EnvelopeBudgetMonthMenuModal.tsx)

- Add state hook: `useLocalPref('budget.mobileDetailedView')`
- Add toggle handler: `onToggleMobileDetailedView`
- Pass props to `BudgetMonthMenu`: `mobileDetailedView` and `onToggleMobileDetailedView`

### 3. Add Menu Item
**File**: [packages/desktop-client/src/components/budget/envelope/budgetsummary/BudgetMonthMenu.tsx](packages/desktop-client/src/components/budget/envelope/budgetsummary/BudgetMonthMenu.tsx)

- Add props: `mobileDetailedView` and `onToggleMobileDetailedView`
- Add switch case: `'toggle-mobile-detailed-view'`
- Add menu item with toggle:
```typescript
{
  name: 'toggle-mobile-detailed-view',
  text: t('Detailed view'),
  toggle: mobileDetailedView,
}
```

### 4. Read Preference
**File**: [packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx](packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx)

- Read preference: `useLocalPref('budget.mobileDetailedView')`
- Pass to `BudgetTable`: `mobileDetailedView={mobileDetailedView ?? false}`

### 5-8. Thread Props Through Hierarchy
Update these files to accept and pass `mobileDetailedView` prop:

- [packages/desktop-client/src/components/mobile/budget/BudgetTable.tsx](packages/desktop-client/src/components/mobile/budget/BudgetTable.tsx)
- [packages/desktop-client/src/components/mobile/budget/ExpenseGroupList.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseGroupList.tsx)
- [packages/desktop-client/src/components/mobile/budget/ExpenseGroupListItem.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseGroupListItem.tsx)
- [packages/desktop-client/src/components/mobile/budget/ExpenseCategoryList.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseCategoryList.tsx)

Add to props type, destructure, and pass to child components.

### 9. Implement Row Expansion
**File**: [packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx](packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx)

Key changes:
1. Add `mobileDetailedView` prop
2. Calculate dynamic height: `const EXPANSION_HEIGHT = 25;`
3. Wrap content in column flex container
4. Conditionally remove border from main row when expanded
5. Add expansion area below main row:

```typescript
<View style={{ flexDirection: 'column' }}>
  <View style={{
    height: ROW_HEIGHT,
    borderBottomWidth: mobileDetailedView ? 0 : 1,
    // ... other styles
  }}>
    {/* Existing row content */}
  </View>

  {mobileDetailedView && (
    <View style={{
      height: EXPANSION_HEIGHT,
      borderBottomWidth: 1,
      // Match main row styling
    }}>
      {/* Empty for now */}
    </View>
  )}
</View>
```

## Visual Design
- Main row stays at 50px height
- Expansion area adds 25px below (total 75px)
- Border moves from main row to expansion area when enabled
- Expansion area inherits background color and opacity from main row
- Empty expansion area ready for future content

## Scope & Edge Cases
- **Envelope budget only**: Tracking budget uses different modal, unaffected
- **Expense categories only**: Income categories and group headers unchanged
- **Desktop unaffected**: Changes are mobile-specific
- **Hidden categories**: Expansion area respects opacity setting
- **Current month**: Expansion area maintains highlight color
- **Performance**: Preference in dependencies triggers re-render when toggled

## Testing Checklist
- [ ] Toggle appears in envelope budget month Actions menu
- [ ] Toggle state persists across page refreshes
- [ ] Expense category rows expand to 75px when enabled (50px when disabled)
- [ ] Expansion area is empty
- [ ] Border appears at bottom of expansion area (not main row)
- [ ] Income categories unaffected
- [ ] Group headers unaffected
- [ ] Tracking budget unaffected
- [ ] Desktop budget unaffected
- [ ] Hidden categories show with reduced opacity
- [ ] Current month highlighting works correctly

## Files Modified Summary
Total: 10 files
- 1 type definition file
- 2 menu-related files (modal + menu component)
- 1 page file (BudgetPage)
- 5 component hierarchy files (BudgetTable → ExpenseCategoryListItem)
- 1 rendering file (ExpenseCategoryListItem)
