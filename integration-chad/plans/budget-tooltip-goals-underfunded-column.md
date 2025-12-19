# Add "Underfunded" Column to Budget Detailed View

## Overview

Add a new "Underfunded" column between the "budgeted" and "goal" columns in the budget detailed view. This column displays the underfunded amount of template goals for each category, with summaries at both group and top-level headers.

## Key Requirements

- Position between "budgeted" and "goal" columns
- Show underfunded amount (max 0 if funded/overfunded)
- Display summaries for groups and top-level header
- Always show when detailed view is enabled (no separate toggle)
- Follow same calculation logic as existing goal funding status

## Quick Reference: Files to Create & Modify

### NEW FILES TO CREATE (6 total)

1. `/home/chid/git/actual/packages/desktop-client/src/hooks/useUnderfundedSum.ts`
2. `/home/chid/git/actual/packages/desktop-client/src/hooks/useUnderfundedAmount.ts`
3. `/home/chid/git/actual/packages/desktop-client/src/hooks/useUnderfundedSumByGroup.ts`
4. `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/UnderfundedHeader.tsx`
5. `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/UnderfundedColumn.tsx`
6. `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/UnderfundedGroupColumn.tsx`

### EXISTING FILES TO MODIFY (5 total)

1. `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/BudgetMonthColumns.tsx` - Add imports and conditional rendering
2. `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/EnvelopeBudgetComponents.tsx` - Add underfundedColumn prop and rendering
3. `/home/chid/git/actual/packages/desktop-client/src/components/budget/ExpenseGroup.tsx` - Call BudgetMonthColumns twice, pass both props
4. `/home/chid/git/actual/packages/desktop-client/src/components/budget/ExpenseCategory.tsx` - Call BudgetMonthColumns twice, pass both props
5. `/home/chid/git/actual/packages/desktop-client/src/components/budget/BudgetTotals.tsx` - Call BudgetMonthColumns twice, pass both props

### MASTER TASK CHECKLIST

#### Phase 1: Create Hooks (3 tasks) ✓ Details below

- [ ] Create useUnderfundedSum.ts (wrapper around useGoalFundingStatus)
- [ ] Create useUnderfundedAmount.ts (single category calculation)
- [ ] Create useUnderfundedSumByGroup.ts (group aggregation)

#### Phase 2: Create Components (3 tasks) ✓ Details below

- [ ] Create UnderfundedHeader.tsx (uses useUnderfundedSum)
- [ ] Create UnderfundedColumn.tsx (uses useUnderfundedAmount)
- [ ] Create UnderfundedGroupColumn.tsx (uses useUnderfundedSumByGroup)

#### Phase 3: Update Seam Component (1 task) ✓ Details below

- [ ] Update BudgetMonthColumns.tsx with imports and conditional rendering logic

#### Phase 4: Update Layout Components (4 tasks) ✓ Details below

- [ ] Update EnvelopeBudgetComponents.tsx (add prop, update 3 month components)
- [ ] Update ExpenseGroup.tsx (call BudgetMonthColumns twice)
- [ ] Update ExpenseCategory.tsx (call BudgetMonthColumns twice)
- [ ] Update BudgetTotals.tsx (call BudgetMonthColumns twice)

#### Phase 5: Testing

- [ ] Verify underfunded column appears between budgeted and goal columns
- [ ] Check calculations for various scenarios (funded, overfunded, no goal)
- [ ] Test mobile responsiveness (hides at < 512px)
- [ ] Test with hidden/visible categories
- [ ] Test with both template and long-term goals
- [ ] Verify group headers show correct summaries
- [ ] Verify top-level header shows correct total

### CRITICAL REMINDERS

⚠️ **IMPORTANT**: Each of ExpenseGroup, ExpenseCategory, and BudgetTotals calls BudgetMonthColumns TWICE:

- First call returns goalColumn (for existing goal column)
- Second call returns underfundedColumn (for new underfunded column)
- Both are rendered in the month component

⚠️ **Column Order Matters**: Render as `{budgeted} {underfundedColumn} {goalColumn} {spent} {balance}`

⚠️ **Props Must Be Added**: All three month components (ExpenseGroupMonth, ExpenseCategoryMonth, BudgetTotalsMonth) need underfundedColumn prop in:

- Type definitions
- Function parameters
- JSX return statements

## PHASE 1: Create Hooks

### Hook 1: useUnderfundedAmount.ts

**Location**: `/home/chid/git/actual/packages/desktop-client/src/hooks/useUnderfundedAmount.ts`

**Purpose**: Calculate the underfunded amount for a single category

**Implementation Details**:

- Import: useEffect, useMemo, useState from React, useSpreadsheet, useLocalPref
- Props: `categoryId` (string), `month` (string)
- Returns: `number` - the underfunded amount (0 if funded or overfunded)

**Algorithm**:

1. Get sheet name from month using monthUtils.sheetForMonth(month)
2. Subscribe to four spreadsheet bindings for the category:
   - `envelopeBudget.catGoal(categoryId)`
   - `envelopeBudget.catBudgeted(categoryId)`
   - `envelopeBudget.catBalance(categoryId)`
   - `envelopeBudget.catLongGoal(categoryId)`
3. Store these values in state
4. Calculate in useMemo:
   - If goal is 0, return 0 (no goal = not underfunded)
   - If longGoal === 1: difference = balance - goal
   - If longGoal === 0: difference = budgeted - goal
   - If difference < 0: return Math.abs(difference)
   - Otherwise: return 0

**Code Pattern**: Base this heavily on useGoalFundingStatus.ts but for a single category

---

### Hook 2: useUnderfundedSumByGroup.ts

**Location**: `/home/chid/git/actual/packages/desktop-client/src/hooks/useUnderfundedSumByGroup.ts`

**Purpose**: Calculate total underfunded amount for all visible categories in a specific group

**Implementation Details**:

- Import: Same as useGoalTargetSumByGroup.ts
- Props: `month` (string), `groupId` (string)
- Returns: `number` - total underfunded amount for all categories in the group

**Algorithm**:

1. Get visible category IDs for the group (same filtering logic as useGoalTargetSumByGroup):
   - Filter categories.grouped for non-income groups only
   - Filter by groupId match
   - Respect showHiddenCategories preference
   - Map to just the category IDs
2. For each visible category ID, subscribe to:
   - catGoal (with 12-month fallback like useGoalTargetSumByGroup)
   - catBudgeted
   - catBalance
   - catLongGoal
3. Store all values in state indexed by categoryId
4. Calculate in useMemo:
   - Loop through stored data for each category
   - For each: calculate underfunded using same logic as useUnderfundedAmount
   - Sum all underfunded amounts
   - Return total

**Code Pattern**: Base this on useGoalTargetSumByGroup.ts structure, but calculate underfunded instead of just summing goal values

---

### Hook 3: useUnderfundedSum.ts

**Location**: `/home/chid/git/actual/packages/desktop-client/src/hooks/useUnderfundedSum.ts`

**Purpose**: Calculate total underfunded amount across all visible expense categories

**Implementation Details**:

- Import: useGoalFundingStatus from './useGoalFundingStatus'
- Props: `month` (string)
- Returns: `number` - total underfunded amount across all categories

**Algorithm**:

1. Call useGoalFundingStatus(month) - this already calculates exactly what we need
2. Return the `underfunded` property from the result

**Code Pattern**: This is very simple - just a wrapper that extracts one value from useGoalFundingStatus

---

## PHASE 2: Create Components

### Component 1: UnderfundedColumn.tsx

**Location**: `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/UnderfundedColumn.tsx`

**Purpose**: Display underfunded amount for a specific category (category-level display)

**Pattern Reference**: Copy GoalColumn.tsx and adapt it

**Implementation Checklist**:

- [ ] Import React, memo from 'react'
- [ ] Import Field from '@desktop-client/components/table'
- [ ] Import EnvelopeCellValue from './EnvelopeBudgetComponents'
- [ ] Import CellValueText from '@desktop-client/components/spreadsheet/CellValue'
- [ ] Import makeAmountGrey from '@desktop-client/components/budget/util'
- [ ] Import styles from '@actual-app/components/styles'
- [ ] Import useUnderfundedAmount hook
- [ ] Create type: UnderfundedColumnProps with categoryId prop
- [ ] Create component that:
  - Calls useUnderfundedAmount(categoryId)
  - Returns Field with name="underfunded", width="flex", textAlign="right"
  - Uses EnvelopeCellValue with a simple calculated binding (or use the hook result directly)
  - Actually: Since we have a hook that returns the value, wrap it in a simple display component
  - Use makeAmountGrey(value) for styling zeros
  - Export as memo

**Special Note**: This component is simpler than GoalColumn because we're calculating the value via a hook rather than binding directly to a spreadsheet cell. See below for actual implementation approach.

**Implementation Approach for UnderfundedColumn**:

```
- Use Field with name="underfunded"
- Call useUnderfundedAmount(categoryId) to get the value
- Since it's not a direct spreadsheet binding, create a simple display wrapper
- Could either:
  A) Calculate inline and display using CellValueText
  B) Store the hook result and format it
- Use makeAmountGrey(value) for zero styling
- Match GoalColumn's right alignment and styling
```

---

### Component 2: UnderfundedGroupColumn.tsx

**Location**: `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/UnderfundedGroupColumn.tsx`

**Purpose**: Display sum of underfunded amounts for all categories in a group (group-level summary)

**Pattern Reference**: Copy GoalGroupColumn.tsx and adapt it

**Implementation Checklist**:

- [ ] Import React, memo from 'react'
- [ ] Import View, Text from '@actual-app/components'
- [ ] Import styles from '@actual-app/components/styles'
- [ ] Import Field from '@desktop-client/components/table'
- [ ] Import useFormat from '@desktop-client/hooks/useFormat'
- [ ] Import useUnderfundedSumByGroup hook
- [ ] Import makeAmountGrey from '@desktop-client/components/budget/util'
- [ ] Create type: UnderfundedGroupColumnProps with groupId and month props
- [ ] Create component that:
  - Calls useUnderfundedSumByGroup(month, groupId)
  - Returns Field with name="underfunded", width="flex"
  - Inside Field: use View with flexDirection="row", alignItems="center", justifyContent="flex-end", padding="0 5px"
  - Inside View: use Text with fontWeight=600, styles.tnum, makeAmountGrey(sum)
  - Format the sum using format(sum, 'financial')
  - Export as memo

---

### Component 3: UnderfundedHeader.tsx

**Location**: `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/UnderfundedHeader.tsx`

**Purpose**: Display total underfunded amount in the budget totals header

**Pattern Reference**: Copy GoalHeader.tsx and adapt it

**Implementation Checklist**:

- [ ] Import React, memo from 'react'
- [ ] Import Trans from 'react-i18next'
- [ ] Import View, Text from '@actual-app/components'
- [ ] Import theme from '@actual-app/components/theme'
- [ ] Import useFormat from '@desktop-client/hooks/useFormat'
- [ ] Import useUnderfundedSum hook
- [ ] Create type: UnderfundedHeaderProps with month prop
- [ ] Define headerLabelStyle (same as GoalHeader: flex 1, padding 0 5px, textAlign right)
- [ ] Define cellStyle (same as GoalHeader: color from theme.tableHeaderText, fontWeight 600)
- [ ] Create component that:
  - Calls useUnderfundedSum(month)
  - Returns View with headerLabelStyle
  - Inside: Text with label "Underfunded" (use Trans tag for i18n)
  - Inside: Text with formatted sum using format(sum, 'financial')
  - Second text should use cellStyle
  - Export as memo

## PHASE 3: Update Seam Component

### File: BudgetMonthColumns.tsx

**Location**: `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/BudgetMonthColumns.tsx`

**Modification Checklist**:

- [ ] Add imports for UnderfundedColumn, UnderfundedGroupColumn, UnderfundedHeader
- [ ] Update BudgetMonthColumnsProps type to include 'underfunded' in the type union (should be 'category' | 'group' | 'header', no change needed)
- [ ] Add variable: `showUnderfundedColumn = isFeatureEnabled && detailedViewEnabled === 'true' && !isNarrowWidth` (same conditions as showGoalColumn)
- [ ] Add conditional branches after the showGoalColumn check:
  - If type === 'header': return `<UnderfundedHeader month={month} />`
  - If type === 'group' && groupId: return `<UnderfundedGroupColumn groupId={groupId} month={month} />`
  - If type === 'category' && categoryId: return `<UnderfundedColumn categoryId={categoryId} />`
- [ ] Keep all existing Goal column rendering logic unchanged
- [ ] The component now returns EITHER underfunded OR goal component based on context (not both from this component)

**Note**: This component gets called twice - once for underfunded, once for goal. Each call returns its respective component.

---

## PHASE 4: Update Layout Components

### File 1: ExpenseGroup.tsx

**Location**: `/home/chid/git/actual/packages/desktop-client/src/components/budget/ExpenseGroup.tsx`

**Current Pattern** (around line 151-157):

```tsx
<BudgetMonthColumns month={...} groupId={...} type="group" />
// This gets passed as goalColumn prop to month component
```

**Modification Checklist**:

- [ ] Find where BudgetMonthColumns is rendered with type="group" and groupId (goal column)
- [ ] Add a second render call for underfunded: `<BudgetMonthColumns month={...} groupId={...} type="group" />` but capture in underfundedColumn
- [ ] Find where goalColumn is passed to MonthComponent prop
- [ ] Add underfundedColumn prop right before goalColumn
- [ ] Within the month component render call, pass both props
- [ ] In the JSX output, render: `{underfundedColumn}` between budgeted and `{goalColumn}`

**Example code location to modify**: Lines around where you see `{goalColumn}` being rendered - add underfundedColumn before it

---

### File 2: ExpenseCategory.tsx

**Location**: `/home/chid/git/actual/packages/desktop-client/src/components/budget/ExpenseCategory.tsx`

**Current Pattern** (around line 121-127):

```tsx
<BudgetMonthColumns month={...} categoryId={...} type="category" />
// This gets passed as goalColumn prop to month component
```

**Modification Checklist**:

- [ ] Find where BudgetMonthColumns is rendered with type="category" and categoryId (goal column)
- [ ] Add a second render call for underfunded
- [ ] Capture result in underfundedColumn variable
- [ ] Find where goalColumn is passed to MonthComponent prop
- [ ] Add underfundedColumn prop right before goalColumn
- [ ] In the JSX output, render: `{underfundedColumn}` between budgeted and `{goalColumn}`

---

### File 3: BudgetTotals.tsx

**Location**: `/home/chid/git/actual/packages/desktop-client/src/components/budget/BudgetTotals.tsx`

**Current Pattern** (around line 187):

```tsx
<BudgetMonthColumns month={...} type="header" />
// This gets passed as goalColumn prop to budget totals component
```

**Modification Checklist**:

- [ ] Find where BudgetMonthColumns is rendered with type="header" (goal header)
- [ ] Add a second render call for underfunded
- [ ] Capture result in underfundedColumn variable
- [ ] Find where goalColumn is passed to component prop
- [ ] Add underfundedColumn prop right before goalColumn
- [ ] In the JSX output, render: `{underfundedColumn}` between budgeted and `{goalColumn}`

---

### File 4: EnvelopeBudgetComponents.tsx

**Location**: `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/EnvelopeBudgetComponents.tsx`

**Modification Details**:

Find the three main month component definitions and update their rendering order:

**1. ExpenseCategoryMonth** (around line 410):

- Find the JSX where columns are rendered
- Current order: budgeted, goalColumn, spent, balance
- New order: budgeted, underfundedColumn, goalColumn, spent, balance
- Add underfundedColumn prop to function parameters
- Render as: `{underfundedColumn}`

**2. ExpenseGroupMonth** (around line 186):

- Find the JSX where columns are rendered
- Current order: budgeted, goalColumn, spent, balance
- New order: budgeted, underfundedColumn, goalColumn, spent, balance
- Add underfundedColumn prop to function parameters
- Render as: `{underfundedColumn}`

**3. BudgetTotalsMonth** (around line 119):

- Find the JSX where columns are rendered
- Current order: budgeted, goalColumn, spent, balance
- New order: budgeted, underfundedColumn, goalColumn, spent, balance
- Add underfundedColumn prop to function parameters
- Render as: `{underfundedColumn}`

**Implementation Checklist**:

- [ ] Add underfundedColumn prop to each month component's type definition
- [ ] Update each component's parameter list to accept underfundedColumn
- [ ] For each component, locate the JSX render section
- [ ] Insert `{underfundedColumn}` between existing budgeted and goalColumn renders
- [ ] No other changes needed to these components

## IMPLEMENTATION SEQUENCE (Strict Order)

**Follow this order exactly to build incrementally with working components at each stage:**

### Stage 1: Foundation (Create all 3 hooks)

- [ ] Create useUnderfundedSum.ts first (simplest - just wraps useGoalFundingStatus)
- [ ] Create useUnderfundedAmount.ts (depends on useUnderfundedSum pattern)
- [ ] Create useUnderfundedSumByGroup.ts (complex - mirrors useGoalTargetSumByGroup but calculates underfunded)

### Stage 2: Display Components (Create all 3 components)

- [ ] Create UnderfundedHeader.tsx (uses useUnderfundedSum hook)
- [ ] Create UnderfundedColumn.tsx (uses useUnderfundedAmount hook)
- [ ] Create UnderfundedGroupColumn.tsx (uses useUnderfundedSumByGroup hook)

### Stage 3: Wire Up Seam Component

- [ ] Update BudgetMonthColumns.tsx to conditionally render the three new components

### Stage 4: Thread Props Through Layout

- [ ] Update EnvelopeBudgetComponents.tsx - add underfundedColumn prop to three month components
- [ ] Update ExpenseGroup.tsx - call BudgetMonthColumns twice (goal + underfunded) and pass both props
- [ ] Update ExpenseCategory.tsx - call BudgetMonthColumns twice (goal + underfunded) and pass both props
- [ ] Update BudgetTotals.tsx - call BudgetMonthColumns twice (goal + underfunded) and pass both props

### Stage 5: Manual Testing

- [ ] Verify underfunded column appears between budgeted and goal columns
- [ ] Check that underfunded amounts are calculated correctly
- [ ] Test on mobile to ensure it hides at width < 512px
- [ ] Verify group headers show correct summaries

---

## KEY IMPLEMENTATION NOTES

### Important: Two Separate Calls to BudgetMonthColumns

Each of ExpenseGroup, ExpenseCategory, and BudgetTotals will call BudgetMonthColumns TWICE:

1. Once with type="goal" to get goalColumn
2. Once with type="underfunded" to get underfundedColumn

This is intentional - each component handles its own type.

**Example code pattern (pseudo-code)**:

```tsx
const goalColumn = <BudgetMonthColumns month={month} categoryId={categoryId} type="category" />;
const underfundedColumn = <BudgetMonthColumns month={month} categoryId={categoryId} type="category" />;

// Then in the month component, pass both:
<MonthComponent
  goalColumn={goalColumn}
  underfundedColumn={underfundedColumn}
  // ... other props
/>
```

### UnderfundedColumn.tsx - Special Implementation Notes

Since useUnderfundedAmount returns a calculated number (not a spreadsheet binding), UnderfundedColumn needs to:

1. Call the hook to get the number
2. Format it using useFormat hook with 'financial' type
3. Apply styling using makeAmountGrey()
4. Render in a Field component similar to GoalColumn

**Recommended approach**:

```tsx
const underfundedAmount = useUnderfundedAmount(categoryId, month);
const format = useFormat();
const formatted = format(underfundedAmount, 'financial');

return (
  <Field name="underfunded" width="flex" style={{ textAlign: 'right' }}>
    <CellValueText
      value={underfundedAmount}
      style={{ ...styles.tnum, ...makeAmountGrey(underfundedAmount) }}
    >
      {formatted}
    </CellValueText>
  </Field>
);
```

### Visible Boundary Between "Current" and "Previous" Columns

The Underfunded column will be visually positioned between Budgeted and Goal columns. Ensure consistent spacing and alignment with both neighbors.

---

## COLUMN RENDERING ORDER (Final Result)

The final column order in the budget table:

1. Category name
2. Budgeted (existing)
3. **Underfunded (NEW)** ← Position matters: between Budgeted and Goal
4. Goal (existing)
5. Spent (existing)
6. Balance (existing)

---

## EDGE CASES & SPECIAL HANDLING

### 1. Funded/Overfunded Categories

- Display: 0.00 (shown in grey via makeAmountGrey)
- Logic: Only show underfunded amount when difference < 0
- Action: Return 0 from hooks when funded or overfunded

### 2. Categories Without Goals

- Display: 0.00 (shown in grey)
- Logic: If goal === 0, return 0 (no goal means no underfunded target)
- Action: Check goal > 0 before calculating difference

### 3. Long-term Goals vs Template Goals

- Template goal (longGoal === 0): Compare budgeted - goal
- Long-term goal (longGoal === 1): Compare balance - goal
- Action: Implement in both useUnderfundedAmount and useUnderfundedSumByGroup

### 4. Goal Cascading

- Goals cascade from previous months (up to 12 months back)
- Action: Implement same fallback month subscription pattern as useGoalTargetSumByGroup

### 5. Hidden Categories

- Respect user's showHiddenCategories preference
- Action: Use same filtering logic as useGoalTargetSumByGroup

### 6. Mobile Responsiveness

- Hide when screen width < 512px
- Already handled by isNarrowWidth check in BudgetMonthColumns

### 7. Feature Flag Dependency

- Only display when both enabled:
  - Feature flag: 'budget-detailed-view' is true
  - User preference: 'budget.detailed-view-enabled' === 'true'
- Already handled by BudgetMonthColumns conditions

---

## DATA BINDING & SUBSCRIPTION PATTERN

All three new hooks follow these principles:

**For useUnderfundedAmount** (single category):

- Subscribe to: catGoal, catBudgeted, catBalance, catLongGoal
- State: Store all four values indexed by categoryId
- Calculate: Apply logic based on longGoal flag
- Return: Single number

**For useUnderfundedSumByGroup** (group aggregation):

- Get category list: Filter visible categories for the group
- Subscribe to: Same four bindings for EACH visible category
- State: Store data indexed by categoryId
- Calculate: Loop through all categories, sum underfunded amounts
- Return: Single number

**For useUnderfundedSum** (all categories):

- Delegate to: useGoalFundingStatus(month)
- Extract: Return only the .underfunded property
- Return: Single number

---

## STYLING & APPEARANCE

### UnderfundedColumn (Category-level)

- Field name: "underfunded"
- Width: "flex" (flexible)
- Alignment: Right-aligned (textAlign: 'right')
- Styling: CellValueText with styles.tnum + makeAmountGrey()
- Font: Monospace numbers (styles.tnum)

### UnderfundedGroupColumn (Group-level)

- Field name: "underfunded"
- Width: "flex"
- Layout: Flex row, center-aligned, right-justified
- Padding: "0 5px"
- Font Weight: 600 (bold)
- Styling: styles.tnum + makeAmountGrey()

### UnderfundedHeader (Top-level)

- Layout: Two-line display
- Line 1: Label "Underfunded" (grey text)
- Line 2: Total amount (bold, dark text)
- Styling: theme.tableHeaderText color
- Font Weight: 600 (bold for amount)
