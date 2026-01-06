# Planning Page Component

## Overview

The Planning Page is a feature that allows users to review budget goals and toggle categories to see their budget impact. It provides a comprehensive view of goal targets with visual indicators for overfunded and underfunded categories.

## Components

### Planning.tsx
Main component that renders the Planning page header and layout.

**Features:**
- Page title: "Budget Planning"
- Description text explaining the feature
- Integrates with PlanningTable component

### PlanningTable.tsx
Core component that displays the interactive planning table with categories and groups.

**Features:**
- Header row with column titles (Category, Overfunded, Underfunded, Goal Target)
- Summary row showing totals for all selected categories
- Group rows that are collapsible and show group summaries
- Category rows with individual goal information
- Checkbox toggles for selecting/deselecting categories and groups
- Master checkbox to toggle all categories at once

**Styling:**
- Responsive table layout using flexbox
- Theme-based colors (notice text for overfunded, error text for underfunded)
- Smooth opacity transitions when toggling categories
- Collapsible groups with visual indicators (▶/▼)

### CategoryRow.tsx
Renders individual category rows in the planning table.

**Props:**
- `categoryName: string` - Name of the category
- `overfunded: number` - Amount over the goal
- `underfunded: number` - Amount under the goal
- `goalTarget: number | null` - The target goal amount
- `isSelected: boolean` - Whether the category is selected
- `onToggle: () => void` - Callback when checkbox is clicked

**Display:**
- Checkbox for selection
- Category name with proper indentation
- Overfunded amount (shown in notice color, dash if zero)
- Underfunded amount (shown in error color, dash if zero)
- Goal target (shown as dash if not set)
- Faded appearance when deselected (opacity: 0.4)

### GroupRow.tsx
Renders group header rows that can be collapsed/expanded.

**Props:**
- `groupName: string` - Name of the category group
- `categories: Array<{...}>` - Categories in the group
- `selectedCategories: { [id: string]: boolean }` - Selection state
- `checkboxState: 'checked' | 'unchecked' | 'indeterminate'` - Group checkbox state
- `onToggle: () => void` - Callback to toggle all categories in group
- `isCollapsed: boolean` - Whether group is expanded or collapsed
- `onToggleCollapse: () => void` - Callback to toggle collapse state

**Features:**
- Collapse/expand indicator (▶/▼)
- Summary calculations for group (overfunded, underfunded, goal target)
- Indeterminate checkbox state when partially selected
- Click anywhere on row to collapse/expand
- Click checkbox separately to toggle group selection

## Hooks

### usePlanningData()
Retrieves and organizes category data into planning structure.

**Returns:**
```typescript
{
  groups: PlanningGroup[]
}
```

**PlanningGroup structure:**
```typescript
{
  id: string;
  name: string;
  categories: PlanningCategory[];
}
```

**PlanningCategory structure:**
```typescript
{
  id: string;
  name: string;
  groupId: string;
  budgeted: number;
  goalTarget: number | null;
  overfunded: number;
  underfunded: number;
  isLongGoal: boolean;
}
```

**Implementation:**
- Uses `useCategories()` hook to get grouped categories
- Parses `goal_def` JSON from category entities
- Filters out hidden and tombstone categories
- Currently uses placeholder values for budgeted amounts (future enhancement)

### useCheckboxState(allCategoryIds: string[])
Manages the checkbox selection state for categories with localStorage persistence.

**Returns:**
```typescript
{
  selectedCategories: { [id: string]: boolean };
  toggleCategory: (categoryId: string) => void;
  toggleGroup: (categoryIds: string[]) => void;
  toggleAll: (allIds: string[]) => void;
  isSelected: (categoryId: string) => boolean;
  getGroupCheckboxState: (categoryIds: string[]) => 'checked' | 'unchecked' | 'indeterminate';
}
```

**Features:**
- Persists state to localStorage under key `planning_selected_categories`
- Defaults to all categories selected
- Automatically adds new categories to selection state
- Handles group and master toggles correctly
- Properly calculates indeterminate state for partial selections

### useSummaryCalculations(categories: PlanningCategory[], selectedCategories: {...})
Calculates totals for overfunded, underfunded, and goal targets based on selected categories.

**Returns:**
```typescript
{
  overfunded: number;
  underfunded: number;
  goalTarget: number;
}
```

**Behavior:**
- Only includes selected categories in calculations
- Defaults to including all categories if selection state is missing
- Sums up all values from filtered categories

## Feature Flag

The Planning Page is controlled by the feature flag `enablePlanningPage`, which can be toggled in Settings → Experimental Features.

## Styling and Theme Integration

The Planning Page uses the application's theme system:
- `theme.pageBackground` - Background color for the page
- `theme.pageText` - Main text color
- `theme.pageTextSubdued` - Secondary text color
- `theme.tableBorder` - Border color for table elements
- `theme.tableBackground` - Background for table rows
- `theme.tableHeaderBackground` - Background for header/group rows
- `theme.tableText` - Table text color
- `theme.noticeText` - Color for overfunded amounts (typically green/success)
- `theme.errorText` - Color for underfunded amounts (typically red/error)

## Future Enhancements

1. **Budgeted Amount Integration**: Currently uses placeholder zero values. Should integrate with spreadsheet to get actual budgeted amounts.
2. **Goal Type Indicators**: Show visual indicators for different goal types (monthly, by-date, etc.).
3. **Quick Edit**: Allow inline editing of goals directly from the table.
4. **Export/Report**: Generate reports of planning data.
5. **Forecasting**: Show projections based on current spending patterns.

## Testing

The Planning Page includes integration tests covering:
- Header and description rendering
- Table component rendering
- Layout structure
- Proper component composition

Tests are located in `Planning.integration.test.tsx`.

## Accessibility

- All checkboxes are keyboard accessible
- Proper label associations for interactive elements
- Semantic HTML structure for screen readers
- Color contrast meets accessibility standards
