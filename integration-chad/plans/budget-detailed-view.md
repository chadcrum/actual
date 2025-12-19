# Budget Detailed View Implementation Plan

## Fork Compliance Validation

This implementation strictly adheres to `AGENTS-chad-fork.md` rules:

### ✓ Seams Exist Independently of Feature Flags

**The Seam**: Optional `goalColumn?: React.ReactNode` and `goalHeader?: React.ReactNode` props added to month components

- These props are **structural UI boundaries** that exist in type definitions regardless of flags
- At call sites, we **always** pass `<BudgetMonthColumns />` to these props
- Inside `BudgetMonthColumns`, flags control what renders (returns null when disabled)
- **Result**: Seam always exists; flags gate behavior inside the seam

### ✓ High-Level Seams (Layout Boundary)

- Seam introduced at `RenderMonths` layout boundary (where Actual already iterates months)
- NOT in leaf components (cells, fields)
- Follows existing pattern where parent components pass props to month components

### ✓ Flags Gate Extensions, Not Rewrites

- Two-tier control: experimental flag enables menu toggle, user toggle controls column visibility
- No forking of code paths - just conditional rendering (return null when disabled)
- No modifications to existing column logic

### ✓ Additive Changes Over Modifications

- Only adds new optional props to existing components
- No changes to existing render logic when props are undefined
- New standalone components in separate files

### ✓ Upstream as Default

- Feature flag defaults to `false`
- Toggle preference defaults to undefined (treated as disabled)
- When disabled: structural boundary exists but renders nothing = identical to upstream

## Overview

Add an experimental "Budget Detailed View" feature that adds a **Goal column** to the budget tables, showing goal targets for each category. The implementation follows fork architectural principles: additive changes, composition over modification, and seams at boundaries.

## Feature Requirements

- **Column Position**: After Budgeted (Budgeted | Goal | Spent | Balance)
- **Column Header**: "Goal" with total goal amount summary
- **Color Coding**: Regular text (black, matching Budgeted column)
- **Feature Flag**: `budget-detailed-view` (experimental)
- **Kebab Menu Toggle**: Show/hide column via kebab menu by Month name
- **Toggle Persistence**: Save state in synced preferences
- **Desktop Only**: Hidden on mobile/narrow width

## Architecture Approach

**Component Composition Pattern**: Pass optional Goal column component as props to existing month components. Feature visibility controlled by a wrapper component that checks feature flag, toggle state, and responsive width.

## Implementation Steps

### 1. Define Feature Flag and Preferences

**File**: `/packages/loot-core/src/types/prefs.ts`

Add to FeatureFlag type (line ~11):

```typescript
| 'budget-detailed-view'
```

Add to SyncedPrefs type (line ~53):

```typescript
| 'budget.detailed-view-enabled'
```

---

### 2. Set Default Feature Flag State

**File**: `/packages/desktop-client/src/hooks/useFeatureFlag.ts`

Add to DEFAULT_FEATURE_FLAG_STATE object:

```typescript
'budget-detailed-view': false,
```

---

### 3. Add Experimental Settings Toggle

**File**: `/packages/desktop-client/src/components/settings/Experimental.tsx`

Add after budget-tooltip-goals toggle (line ~184):

```tsx
<FeatureToggle flag="budget-detailed-view">
  <Trans>Budget detailed view</Trans>
</FeatureToggle>
```

---

### 4. Create Goal Column Component

**New File**: `/packages/desktop-client/src/components/budget/envelope/GoalColumn.tsx`

```tsx
import React, { memo } from 'react';
import { Field } from '@desktop-client/components/table';
import { EnvelopeCellValue } from './EnvelopeBudgetComponents';
import { CellValueText } from '@desktop-client/components/spreadsheet/CellValue';
import { makeAmountGrey } from '@desktop-client/components/budget/util';
import { styles } from '@actual-app/components/styles';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

type GoalColumnProps = {
  categoryId: string;
};

export const GoalColumn = memo(function GoalColumn({ categoryId }: GoalColumnProps) {
  return (
    <Field name="goal" width="flex" style={{ textAlign: 'right' }}>
      <EnvelopeCellValue
        binding={envelopeBudget.catGoal(categoryId)}
        type="financial"
      >
        {props => (
          <CellValueText {...props} style={{ ...styles.tnum }} getValueStyle={makeAmountGrey} />
        )}
      </EnvelopeCellValue>
    </Field>
  );
});
```

---

### 5. Create Goal Header Component

**New File**: `/packages/desktop-client/src/components/budget/envelope/GoalHeader.tsx`

```tsx
import React, { memo } from 'react';
import { Trans } from 'react-i18next';
import { View } from '@actual-app/components/view';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useGoalTargetSum } from '@desktop-client/hooks/useGoalTargetSum';

type GoalHeaderProps = {
  month: string;
};

const headerLabelStyle = {
  flex: 1,
  padding: '0 5px',
  textAlign: 'right' as const,
};

const cellStyle = {
  color: theme.tableHeaderText,
  fontWeight: 600,
};

export const GoalHeader = memo(function GoalHeader({ month }: GoalHeaderProps) {
  const format = useFormat();
  const goalTargetSum = useGoalTargetSum(month);

  return (
    <View style={headerLabelStyle}>
      <Text style={{ color: theme.tableHeaderText }}>
        <Trans>Goal</Trans>
      </Text>
      <Text style={cellStyle}>
        {format(goalTargetSum, 'financial')}
      </Text>
    </View>
  );
});
```

---

### 6. Create Goal Group Column Component

**New File**: `/packages/desktop-client/src/components/budget/envelope/GoalGroupColumn.tsx`

```tsx
import React, { memo } from 'react';
import { View } from '@actual-app/components/view';

type GoalGroupColumnProps = {
  groupId: string;
  month: string;
};

export const GoalGroupColumn = memo(function GoalGroupColumn({ groupId, month }: GoalGroupColumnProps) {
  // Empty placeholder for group rows (can be enhanced later to show sum of category goals)
  return (
    <View
      style={{
        flex: 1,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'transparent'
      }}
    />
  );
});
```

---

### 7. Create Conditional Wrapper Component

**New File**: `/packages/desktop-client/src/components/budget/envelope/BudgetMonthColumns.tsx`

```tsx
import React, { memo } from 'react';
import { GoalColumn } from './GoalColumn';
import { GoalGroupColumn } from './GoalGroupColumn';
import { GoalHeader } from './GoalHeader';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';

type BudgetMonthColumnsProps = {
  month: string;
  categoryId?: string;
  groupId?: string;
  type: 'category' | 'group' | 'header';
};

export const BudgetMonthColumns = memo(function BudgetMonthColumns({
  month,
  categoryId,
  groupId,
  type,
}: BudgetMonthColumnsProps) {
  const isFeatureEnabled = useFeatureFlag('budget-detailed-view');
  const [detailedViewEnabled] = useSyncedPref('budget.detailed-view-enabled');
  const { isNarrowWidth } = useResponsive();

  const showGoalColumn =
    isFeatureEnabled &&
    detailedViewEnabled === 'true' &&
    !isNarrowWidth;

  if (!showGoalColumn) {
    return null;
  }

  if (type === 'header') {
    return <GoalHeader month={month} />;
  }

  if (type === 'group' && groupId) {
    return <GoalGroupColumn groupId={groupId} month={month} />;
  }

  if (type === 'category' && categoryId) {
    return <GoalColumn categoryId={categoryId} />;
  }

  return null;
});
```

---

### 8. Extend Month Component Props

**File**: `/packages/desktop-client/src/components/budget/envelope/EnvelopeBudgetComponents.tsx`

**Changes needed:**

1. Update `CategoryMonthProps` type (find near top of file):

```typescript
type CategoryMonthProps = {
  // ... existing props
  goalColumn?: React.ReactNode;  // ADD THIS
};
```

2. Update `ExpenseCategoryMonth` function signature (line ~206):

```typescript
export const ExpenseCategoryMonth = memo(function ExpenseCategoryMonth({
  month,
  category,
  editing,
  onEdit,
  onBudgetAction,
  onShowActivity,
  goalColumn,  // ADD THIS
}: CategoryMonthProps) {
```

3. Insert goalColumn after Budgeted field (after line ~399, before Spent field):

```tsx
        />
      </View>
      {goalColumn}  {/* ADD THIS */}
      <Field name="spent" width="flex" style={{ textAlign: 'right' }}>
```

4. Update `CategoryGroupMonthProps` type:

```typescript
type CategoryGroupMonthProps = {
  // ... existing props
  goalColumn?: React.ReactNode;  // ADD THIS
};
```

5. Update `ExpenseGroupMonth` function signature (line ~152):

```typescript
export const ExpenseGroupMonth = memo(function ExpenseGroupMonth({
  month,
  group,
  goalColumn,  // ADD THIS
}: CategoryGroupMonthProps) {
```

6. Insert goalColumn in group render (after line ~177, before Spent cell):

```tsx
      />
      {goalColumn}  {/* ADD THIS */}
      <EnvelopeSheetCell
        name="spent"
```

7. Update `BudgetTotalsMonth` function signature and props (line ~89):

```typescript
export const BudgetTotalsMonth = memo(function BudgetTotalsMonth({
  month,
  goalHeader,  // ADD THIS
}: {
  month: string;
  goalHeader?: React.ReactNode;  // ADD THIS
}) {
```

8. Insert goalHeader in header render (after line ~112, before Spent header):

```tsx
      </View>
      {goalHeader}  {/* ADD THIS */}
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.tableHeaderText }}>
          <Trans>Spent</Trans>
```

---

### 9. Wire Up in Parent Components

**File**: `/packages/desktop-client/src/components/budget/ExpenseCategory.tsx`

Add import (after line 14):

```typescript
import { BudgetMonthColumns } from './envelope/BudgetMonthColumns';
```

Update RenderMonths (lines 107-122):

```tsx
<RenderMonths>
  {({ month }) => (
    <MonthComponent
      month={month}
      editing={editingCell && editingCell.id === cat.id && editingCell.cell === month}
      category={cat}
      onEdit={onEditMonth}
      onBudgetAction={onBudgetAction}
      onShowActivity={onShowActivity}
      goalColumn={
        <BudgetMonthColumns month={month} categoryId={cat.id} type="category" />
      }
    />
  )}
</RenderMonths>
```

---

**File**: `/packages/desktop-client/src/components/budget/ExpenseGroup.tsx`

Add import (after line 14):

```typescript
import { BudgetMonthColumns } from './envelope/BudgetMonthColumns';
```

Update RenderMonths (lines 145-147):

```tsx
<RenderMonths>
  {({ month }) => (
    <MonthComponent
      month={month}
      group={group}
      goalColumn={
        <BudgetMonthColumns month={month} groupId={group.id} type="group" />
      }
    />
  )}
</RenderMonths>
```

---

**File**: `/packages/desktop-client/src/components/budget/BudgetTotals.tsx`

Add import (after line 19):

```typescript
import { BudgetMonthColumns } from './envelope/BudgetMonthColumns';
```

Update RenderMonths (lines 182-184):

```tsx
<RenderMonths>
  {({ month }) => (
    <MonthComponent
      month={month}
      goalHeader={
        <BudgetMonthColumns month={month} type="header" />
      }
    />
  )}
</RenderMonths>
```

---

### 10. Add Kebab Menu Toggle

**File**: `/packages/desktop-client/src/components/budget/envelope/budgetsummary/BudgetMonthMenu.tsx`

**Changes:**

1. Update props type (line ~8):

```typescript
type BudgetMonthMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  // ... existing props
  budgetDetailedViewEnabled?: boolean;  // ADD THIS
  onToggleBudgetDetailedView?: () => void;  // ADD THIS
};
```

2. Update function signature (line ~20):

```typescript
export function BudgetMonthMenu({
  // ... existing params
  budgetDetailedViewEnabled,  // ADD THIS
  onToggleBudgetDetailedView,  // ADD THIS
  ...props
}: BudgetMonthMenuProps) {
```

3. Add feature flag check (after line ~31):

```typescript
const isBudgetDetailedViewEnabled = useFeatureFlag('budget-detailed-view');
```

4. Add menu select case (after line ~64):

```typescript
case 'toggle-detailed-view':
  onToggleBudgetDetailedView?.();
  break;
```

5. Add menu item (after line ~101, before closing bracket of items array):

```typescript
...(isBudgetDetailedViewEnabled
  ? [
      {
        name: 'toggle-detailed-view',
        text: t('Detailed view'),
        toggle: budgetDetailedViewEnabled,
      },
    ]
  : []),
```

---

### 11. Wire Up Toggle in BudgetSummary

**File**: `/packages/desktop-client/src/components/budget/envelope/budgetsummary/BudgetSummary.tsx`

**Changes:**

1. Add state management (after line ~50 where other feature flags are):

```typescript
const [budgetDetailedViewEnabled, setBudgetDetailedViewEnabled] =
  useSyncedPref('budget.detailed-view-enabled');
```

2. Add toggle handler (after onMenuClose function):

```typescript
function onToggleBudgetDetailedView() {
  setBudgetDetailedViewEnabled(
    budgetDetailedViewEnabled === 'true' ? 'false' : 'true'
  );
}
```

3. Pass props to BudgetMonthMenu (update around line ~184):

```typescript
<BudgetMonthMenu
  // ... existing props
  budgetDetailedViewEnabled={budgetDetailedViewEnabled === 'true'}
  onToggleBudgetDetailedView={onToggleBudgetDetailedView}
/>
```

---

## Edge Cases Handled

1. **Categories without goals**: Display zero with grey styling via `makeAmountGrey`
2. **Mobile/narrow width**: Column completely hidden via `isNarrowWidth` check
3. **Feature flag disabled**: Toggle option hidden in menu
4. **Toggle state persistence**: `useSyncedPref` syncs across sessions/devices
5. **Multiple months**: Each month gets independent Goal column

## Fork Compliance

✓ **Additive changes**: New components + optional props only
✓ **Flags gate extensions**: Feature flag enables UI, toggle controls visibility
✓ **Seams at boundaries**: Layout-level composition via RenderMonths
✓ **Upstream as default**: Feature disabled = identical to upstream
✓ **Component composition**: ReactNode props passed to existing components

## Detailed Implementation Checklist

Follow these steps in order. Each step includes exact file paths, line numbers, and code snippets.

### Phase 1: Type Definitions & Feature Flag Setup

#### Task 1.1: Add Feature Flag Type Definition

- [ ] **File**: `/packages/loot-core/src/types/prefs.ts`
- [ ] **Location**: Around line 11, in the `FeatureFlag` type union
- [ ] **Action**: Add new line after `'budget-tooltip-goals'`:

```typescript
| 'budget-detailed-view'
```

- [ ] **Verify**: Type definition compiles without errors

#### Task 1.2: Add Synced Preference Type Definition

- [ ] **File**: `/packages/loot-core/src/types/prefs.ts`
- [ ] **Location**: Around line 53, in the `SyncedPrefs` type
- [ ] **Action**: Add to the union of preference keys:

```typescript
| 'budget.detailed-view-enabled'
```

- [ ] **Verify**: Type definition compiles without errors

#### Task 1.3: Set Default Feature Flag State

- [ ] **File**: `/packages/desktop-client/src/hooks/useFeatureFlag.ts`
- [ ] **Location**: In `DEFAULT_FEATURE_FLAG_STATE` object, after `'budget-tooltip-goals': false,`
- [ ] **Action**: Add new entry:

```typescript
'budget-detailed-view': false,
```

- [ ] **Verify**: No TypeScript errors, object compiles correctly

#### Task 1.4: Add Experimental Settings Toggle UI

- [ ] **File**: `/packages/desktop-client/src/components/settings/Experimental.tsx`
- [ ] **Location**: After line 184 (after budget-tooltip-goals toggle)
- [ ] **Action**: Insert new toggle component:

```tsx
<FeatureToggle flag="budget-detailed-view">
  <Trans>Budget detailed view</Trans>
</FeatureToggle>
```

- [ ] **Verify**: Settings page renders correctly, toggle appears in experimental features

---

### Phase 2: Create New Goal Column Components

#### Task 2.1: Create GoalColumn Component

- [ ] **File**: Create new file `/packages/desktop-client/src/components/budget/envelope/GoalColumn.tsx`
- [ ] **Action**: Copy the entire component code from plan (see step 4 in Implementation Steps)
- [ ] **Key Points**:
  - Uses `envelopeBudget.catGoal(categoryId)` binding for data
  - Applies `makeAmountGrey` for styling (regular black text)
  - Uses `width="flex"` for equal column distribution
- [ ] **Verify**: File compiles, no import errors

#### Task 2.2: Create GoalHeader Component

- [ ] **File**: Create new file `/packages/desktop-client/src/components/budget/envelope/GoalHeader.tsx`
- [ ] **Action**: Copy the entire component code from plan (see step 5 in Implementation Steps)
- [ ] **Key Points**:
  - Uses `useGoalTargetSum(month)` hook to calculate total
  - Matches styling of other headers in BudgetTotalsMonth
  - Label: "Goal", Value: formatted sum
- [ ] **Verify**: File compiles, no import errors

#### Task 2.3: Create GoalGroupColumn Component

- [ ] **File**: Create new file `/packages/desktop-client/src/components/budget/envelope/GoalGroupColumn.tsx`
- [ ] **Action**: Copy the entire component code from plan (see step 6 in Implementation Steps)
- [ ] **Key Points**:
  - Empty placeholder for group rows
  - Can be enhanced later to show sum of category goals
- [ ] **Verify**: File compiles, no import errors

#### Task 2.4: Create BudgetMonthColumns Wrapper Component

- [ ] **File**: Create new file `/packages/desktop-client/src/components/budget/envelope/BudgetMonthColumns.tsx`
- [ ] **Action**: Copy the entire component code from plan (see step 7 in Implementation Steps)
- [ ] **Key Points**:
  - **THIS IS THE SEAM LOGIC**: Checks feature flag, toggle state, and responsive width
  - Returns null when conditions not met (disabled state)
  - Returns appropriate component based on `type` prop (category/group/header)
- [ ] **Verify**: File compiles, all imports resolve correctly

---

### Phase 3: Extend Month Component Props (Add Seam Boundaries)

**CRITICAL**: These changes add the **structural UI boundaries (seams)** that exist independently of feature flags.

#### Task 3.1: Extend ExpenseCategoryMonth Props

- [ ] **File**: `/packages/desktop-client/src/components/budget/envelope/EnvelopeBudgetComponents.tsx`
- [ ] **Step 3.1a**: Find `CategoryMonthProps` type definition (near top of file)
- [ ] **Action**: Add new optional property:

```typescript
goalColumn?: React.ReactNode;
```

- [ ] **Step 3.1b**: Update `ExpenseCategoryMonth` function signature (around line 206)
- [ ] **Action**: Add `goalColumn` to destructured props:

```typescript
export const ExpenseCategoryMonth = memo(function ExpenseCategoryMonth({
  month,
  category,
  editing,
  onEdit,
  onBudgetAction,
  onShowActivity,
  goalColumn,  // ADD THIS LINE
}: CategoryMonthProps) {
```

- [ ] **Step 3.1c**: Insert goalColumn in JSX render
- [ ] **Location**: After line 399 (after the closing `</View>` of Budgeted field), BEFORE the Spent field
- [ ] **Action**: Add single line:

```tsx
      </View>
      {goalColumn}
      <Field name="spent" width="flex" style={{ textAlign: 'right' }}>
```

- [ ] **Verify**: Component renders correctly, no TypeScript errors

#### Task 3.2: Extend ExpenseGroupMonth Props

- [ ] **File**: `/packages/desktop-client/src/components/budget/envelope/EnvelopeBudgetComponents.tsx`
- [ ] **Step 3.2a**: Find `CategoryGroupMonthProps` type definition
- [ ] **Action**: Add new optional property:

```typescript
goalColumn?: React.ReactNode;
```

- [ ] **Step 3.2b**: Update `ExpenseGroupMonth` function signature (around line 152)
- [ ] **Action**: Add `goalColumn` to destructured props:

```typescript
export const ExpenseGroupMonth = memo(function ExpenseGroupMonth({
  month,
  group,
  goalColumn,  // ADD THIS LINE
}: CategoryGroupMonthProps) {
```

- [ ] **Step 3.2c**: Insert goalColumn in JSX render
- [ ] **Location**: After line 177 (after budgeted EnvelopeSheetCell closing `/>`), BEFORE the Spent cell
- [ ] **Action**: Add single line:

```tsx
      />
      {goalColumn}
      <EnvelopeSheetCell
        name="spent"
```

- [ ] **Verify**: Component renders correctly, no TypeScript errors

#### Task 3.3: Extend BudgetTotalsMonth Props

- [ ] **File**: `/packages/desktop-client/src/components/budget/envelope/EnvelopeBudgetComponents.tsx`
- [ ] **Step 3.3a**: Update `BudgetTotalsMonth` function signature and props type (around line 89)
- [ ] **Action**: Modify function signature:

```typescript
export const BudgetTotalsMonth = memo(function BudgetTotalsMonth({
  month,
  goalHeader,  // ADD THIS PARAMETER
}: {
  month: string;
  goalHeader?: React.ReactNode;  // ADD THIS TYPE
}) {
```

- [ ] **Step 3.3b**: Insert goalHeader in JSX render
- [ ] **Location**: After line 112 (after Budgeted header `</View>`), BEFORE Spent header
- [ ] **Action**: Add single line:

```tsx
      </View>
      {goalHeader}
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.tableHeaderText }}>
          <Trans>Spent</Trans>
```

- [ ] **Verify**: Component renders correctly, no TypeScript errors

---

### Phase 4: Wire Up Seams in Parent Components

**CRITICAL**: These changes **always pass components to the seams** - the seam component decides internally whether to render.

#### Task 4.1: Wire Up ExpenseCategory

- [ ] **File**: `/packages/desktop-client/src/components/budget/ExpenseCategory.tsx`
- [ ] **Step 4.1a**: Add import at top of file (after line 14)

```typescript
import { BudgetMonthColumns } from './envelope/BudgetMonthColumns';
```

- [ ] **Step 4.1b**: Update RenderMonths JSX (lines 107-122)
- [ ] **Before**:

```tsx
<RenderMonths>
  {({ month }) => (
    <MonthComponent
      month={month}
      editing={
        editingCell &&
        editingCell.id === cat.id &&
        editingCell.cell === month
      }
      category={cat}
      onEdit={onEditMonth}
      onBudgetAction={onBudgetAction}
      onShowActivity={onShowActivity}
    />
  )}
</RenderMonths>
```

- [ ] **After** (add goalColumn prop):

```tsx
<RenderMonths>
  {({ month }) => (
    <MonthComponent
      month={month}
      editing={
        editingCell &&
        editingCell.id === cat.id &&
        editingCell.cell === month
      }
      category={cat}
      onEdit={onEditMonth}
      onBudgetAction={onBudgetAction}
      onShowActivity={onShowActivity}
      goalColumn={
        <BudgetMonthColumns month={month} categoryId={cat.id} type="category" />
      }
    />
  )}
</RenderMonths>
```

- [ ] **Verify**: Category rows render correctly, goal column appears when enabled

#### Task 4.2: Wire Up ExpenseGroup

- [ ] **File**: `/packages/desktop-client/src/components/budget/ExpenseGroup.tsx`
- [ ] **Step 4.2a**: Add import at top of file (after line 14)

```typescript
import { BudgetMonthColumns } from './envelope/BudgetMonthColumns';
```

- [ ] **Step 4.2b**: Update RenderMonths JSX (lines 145-147)
- [ ] **Before**:

```tsx
<RenderMonths>
  {({ month }) => <MonthComponent month={month} group={group} />}
</RenderMonths>
```

- [ ] **After** (add goalColumn prop):

```tsx
<RenderMonths>
  {({ month }) => (
    <MonthComponent
      month={month}
      group={group}
      goalColumn={
        <BudgetMonthColumns month={month} groupId={group.id} type="group" />
      }
    />
  )}
</RenderMonths>
```

- [ ] **Verify**: Group rows render correctly, goal column appears when enabled

#### Task 4.3: Wire Up BudgetTotals

- [ ] **File**: `/packages/desktop-client/src/components/budget/BudgetTotals.tsx`
- [ ] **Step 4.3a**: Add import at top of file (after line 19)

```typescript
import { BudgetMonthColumns } from './envelope/BudgetMonthColumns';
```

- [ ] **Step 4.3b**: Update RenderMonths JSX (lines 182-184)
- [ ] **Before**:

```tsx
<RenderMonths>
  <MonthComponent />
</RenderMonths>
```

- [ ] **After** (add goalHeader prop):

```tsx
<RenderMonths>
  {({ month }) => (
    <MonthComponent
      month={month}
      goalHeader={
        <BudgetMonthColumns month={month} type="header" />
      }
    />
  )}
</RenderMonths>
```

- [ ] **Note**: Need to update to render prop pattern to access `month`
- [ ] **Verify**: Header row renders correctly, goal header appears when enabled

---

### Phase 5: Add Kebab Menu Toggle

#### Task 5.1: Update BudgetMonthMenu Props and Logic

- [ ] **File**: `/packages/desktop-client/src/components/budget/envelope/budgetsummary/BudgetMonthMenu.tsx`
- [ ] **Step 5.1a**: Update props type (around line 8)
- [ ] **Action**: Add two new properties to type definition:

```typescript
budgetDetailedViewEnabled?: boolean;
onToggleBudgetDetailedView?: () => void;
```

- [ ] **Step 5.1b**: Update function signature (around line 20)
- [ ] **Action**: Add to destructured parameters:

```typescript
budgetDetailedViewEnabled,
onToggleBudgetDetailedView,
```

- [ ] **Step 5.1c**: Add feature flag check (after line 31, after other useFeatureFlag calls)

```typescript
const isBudgetDetailedViewEnabled = useFeatureFlag('budget-detailed-view');
```

- [ ] **Step 5.1d**: Add menu select case (after line 64, in switch statement)

```typescript
case 'toggle-detailed-view':
  onToggleBudgetDetailedView?.();
  break;
```

- [ ] **Step 5.1e**: Add menu item (after line 101, before closing bracket of items array)

```typescript
...(isBudgetDetailedViewEnabled
  ? [
      {
        name: 'toggle-detailed-view',
        text: t('Detailed view'),
        toggle: budgetDetailedViewEnabled,
      },
    ]
  : []),
```

- [ ] **Verify**: Menu compiles, toggle item appears when feature flag enabled

#### Task 5.2: Wire Up Toggle in BudgetSummary

- [ ] **File**: `/packages/desktop-client/src/components/budget/envelope/budgetsummary/BudgetSummary.tsx`
- [ ] **Step 5.2a**: Add state management (after line 50, where other feature flags are checked)

```typescript
const [budgetDetailedViewEnabled, setBudgetDetailedViewEnabled] =
  useSyncedPref('budget.detailed-view-enabled');
```

- [ ] **Step 5.2b**: Add toggle handler (after onMenuClose function)

```typescript
function onToggleBudgetDetailedView() {
  setBudgetDetailedViewEnabled(
    budgetDetailedViewEnabled === 'true' ? 'false' : 'true'
  );
}
```

- [ ] **Step 5.2c**: Pass props to BudgetMonthMenu (update around line 184 in JSX)

```typescript
<BudgetMonthMenu
  // ... existing props ...
  budgetDetailedViewEnabled={budgetDetailedViewEnabled === 'true'}
  onToggleBudgetDetailedView={onToggleBudgetDetailedView}
/>
```

- [ ] **Verify**: Toggle works correctly, persists across sessions

---

### Phase 6: Testing & Verification

#### Task 6.1: Feature Flag Testing

- [ ] Navigate to Settings > Experimental Features
- [ ] Verify "Budget detailed view" toggle exists
- [ ] Enable the feature flag
- [ ] Verify no errors in console

#### Task 6.2: Kebab Menu Testing

- [ ] Navigate to Budget page
- [ ] Click kebab menu (three dots) by month name
- [ ] Verify "Detailed view" toggle item appears
- [ ] Toggle it on
- [ ] Verify Goal column appears after Budgeted column

#### Task 6.3: Column Display Testing

- [ ] Verify column order: Budgeted | Goal | Spent | Balance
- [ ] Verify Goal values display for categories with goals
- [ ] Verify Goal header shows total of all goals
- [ ] Verify goal values are black text (matching Budgeted)
- [ ] Verify group rows show empty Goal cell

#### Task 6.4: Toggle Persistence Testing

- [ ] Toggle "Detailed view" ON in kebab menu
- [ ] Refresh browser page
- [ ] Verify Goal column still visible

#### Task 6.5: Mobile/Responsive Testing

- [ ] Resize browser to mobile width (< 500px)
- [ ] Verify Goal column hidden on narrow width
- [ ] Resize back to desktop width
- [ ] Verify Goal column reappears

#### Task 6.6: Disable Feature Testing

- [ ] Go to Settings > Experimental Features
- [ ] Disable "Budget detailed view" toggle
- [ ] Return to Budget page
- [ ] Verify "Detailed view" menu item no longer appears
- [ ] Verify budget table matches upstream (no Goal column)

#### Task 6.7: Edge Case Testing

- [ ] Test with categories that have no goals (should show $0.00)
- [ ] Test with hidden categories (verify excluded from header sum)
- [ ] Test with multiple months visible
- [ ] Test with collapsed category groups

---

## Files Summary

**New Files (4)**:

- `/packages/desktop-client/src/components/budget/envelope/GoalColumn.tsx`
- `/packages/desktop-client/src/components/budget/envelope/GoalHeader.tsx`
- `/packages/desktop-client/src/components/budget/envelope/GoalGroupColumn.tsx`
- `/packages/desktop-client/src/components/budget/envelope/BudgetMonthColumns.tsx`

**Modified Files (11)**:

- `/packages/loot-core/src/types/prefs.ts`
- `/packages/desktop-client/src/hooks/useFeatureFlag.ts`
- `/packages/desktop-client/src/components/settings/Experimental.tsx`
- `/packages/desktop-client/src/components/budget/envelope/EnvelopeBudgetComponents.tsx`
- `/packages/desktop-client/src/components/budget/ExpenseCategory.tsx`
- `/packages/desktop-client/src/components/budget/ExpenseGroup.tsx`
- `/packages/desktop-client/src/components/budget/BudgetTotals.tsx`
- `/packages/desktop-client/src/components/budget/envelope/budgetsummary/BudgetMonthMenu.tsx`
- `/packages/desktop-client/src/components/budget/envelope/budgetsummary/BudgetSummary.tsx`
