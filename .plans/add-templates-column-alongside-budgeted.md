# Implementation Plan: Add Templates Column Alongside Budgeted Column

## Quick Summary for AI Agents

**Task**: Modify the "Show budget templates" toggle to ADD a Templates column instead of REPLACING the Budgeted column.

**File to Edit**: `packages/desktop-client/src/components/budget/envelope/EnvelopeBudgetComponents.tsx`

**Three Functions to Modify**:
1. `BudgetTotalsMonth` (lines 115-178) - Split first column into Budgeted (always) + Templates (conditional)
2. `ExpenseGroupMonth` (lines 197-261) - Remove targetValue from budgeted cell, add new conditional Templates cell
3. `ExpenseCategoryMonth` (lines 263-581) - Remove targetValue prop (line 429), fix onExpose (line 426), add conditional Templates Field after line 466

**Key Changes**:
- Budgeted column: Always visible, always editable
- Templates column: Only visible when `showTargetAmounts` is true, read-only
- Column order: Budgeted | Templates | Spent | Balance (4 total when templates shown)

## Overview
Modify the "Show budget templates" feature in the envelope budget view so that it **adds** a "Templates" column instead of **replacing** the "Budgeted" column.

### Current Behavior
- When "Show budget templates" is toggled ON: First column shows "Templates" (template values) - replaces Budgeted
- When toggled OFF: First column shows "Budgeted" (actual budgeted values)
- Column order: [Templates OR Budgeted] | Spent | Balance (3 columns total)

### Desired Behavior
- When "Show budget templates" is toggled ON: Budgeted column remains visible, Templates column is added next to it
- When toggled OFF: Only Budgeted column is shown
- Column order when ON: Budgeted | Templates | Spent | Balance (4 columns total)
- Column order when OFF: Budgeted | Spent | Balance (3 columns total)

### Key Functional Changes
1. **Budgeted column always visible**: Never hidden, always shows actual budgeted values
2. **Budgeted column always editable**: Can edit budget amounts even when templates are shown
3. **Templates column conditional**: Only appears when `showTargetAmounts` is true
4. **Templates column read-only**: Cannot edit template values (display only)

## Critical Files to Modify

**[EnvelopeBudgetComponents.tsx](packages/desktop-client/src/components/budget/envelope/EnvelopeBudgetComponents.tsx)** - Contains all three components that need modification:
- `BudgetTotalsMonth` (lines 115-178) - Header totals
- `ExpenseGroupMonth` (lines 197-261) - Group summary rows
- `ExpenseCategoryMonth` (lines 263-581) - Individual category rows

## Implementation Steps

### Step 1: Modify BudgetTotalsMonth (Header Totals)

**File**: `packages/desktop-client/src/components/budget/envelope/EnvelopeBudgetComponents.tsx`
**Location**: Lines 115-178
**Function**: `export const BudgetTotalsMonth = memo(function BudgetTotalsMonth()`

**Current Code Analysis**:
- Lines 136-156: First column conditionally shows either "Templates" OR "Budgeted"
  - When `showTargetAmounts` is true: Shows "Templates" label and `templateTotal` value
  - When `showTargetAmounts` is false: Shows "Budgeted" label and `envelopeBudget.totalBudgeted` binding
- Lines 157-164: Second column shows "Spent"
- Lines 165-175: Third column shows "Balance"

**Required Changes**:

1. **Replace lines 134-156** with two separate column implementations:

   a. **First Column - Always show Budgeted**:
   ```jsx
   <View style={headerLabelStyle}>
     <Text style={{ color: theme.tableHeaderText }}>
       <Trans>Budgeted</Trans>
     </Text>
     <EnvelopeCellValue
       binding={envelopeBudget.totalBudgeted}
       type="financial"
     >
       {props => (
         <CellValueText {...props} style={cellStyle} />
       )}
     </EnvelopeCellValue>
   </View>
   ```

   b. **Second Column - Conditionally show Templates** (only when `showTargetAmounts` is true):
   ```jsx
   {showTargetAmounts && (
     <View style={headerLabelStyle}>
       <Text style={{ color: theme.tableHeaderText }}>
         <Trans>Templates</Trans>
       </Text>
       <Text style={cellStyle}>
         {integerToCurrency(templateTotal)}
       </Text>
     </View>
   )}
   ```

2. **Keep lines 157-175 unchanged** (Spent and Balance columns)

**Result**:
- When `showTargetAmounts` is false: 3 columns (Budgeted | Spent | Balance)
- When `showTargetAmounts` is true: 4 columns (Budgeted | Templates | Spent | Balance)

**Implementation Notes**:
- The `headerLabelStyle` variable (defined earlier in the file) provides the flex: 1 layout
- The `cellStyle` variable provides the right-aligned, tabular number styling
- The `templateTotal` is already calculated in lines 119-122 and can be reused
- Both `<Trans>` and `integerToCurrency` are already imported and available

### Step 2: Modify ExpenseGroupMonth (Group Summaries)

**File**: `packages/desktop-client/src/components/budget/envelope/EnvelopeBudgetComponents.tsx`
**Location**: Lines 197-261
**Function**: `export const ExpenseGroupMonth = memo(function ExpenseGroupMonth({...})`

**Current Code Analysis**:
- Lines 205-212: Calculates `groupTemplateSum` from category template amounts
- The return statement contains a View with flex row layout containing 3 EnvelopeSheetCell components:
  1. First cell (name="budgeted"): Currently receives `targetValue={groupTemplateSum}` when templates are shown
  2. Second cell (name="spent"): Shows group spent amount
  3. Third cell (name="balance"): Shows group balance

**Required Changes**:

1. **Locate the first EnvelopeSheetCell** (the one with `name="budgeted"`)
   - Remove the `targetValue` prop from this cell
   - This cell should ONLY bind to `envelopeBudget.groupBudgeted(id)` and show actual budgeted values

2. **Add new conditional Templates cell** immediately after the budgeted cell:
   ```jsx
   {showTargetAmounts && (
     <EnvelopeSheetCell
       name="templates"
       width="flex"
       textAlign="right"
       style={{ fontWeight: 600, ...styles.tnum }}
       targetValue={groupTemplateSum}
       valueProps={{
         binding: envelopeBudget.groupBudgeted(id),
         type: 'financial',
       }}
     />
   )}
   ```

3. **Keep the "spent" and "balance" cells unchanged**

**Result**:
- When `showTargetAmounts` is false: 3 columns (Budgeted | Spent | Balance)
- When `showTargetAmounts` is true: 4 columns (Budgeted | Templates | Spent | Balance)

**Implementation Notes**:
- The `EnvelopeSheetCell` component automatically handles `targetValue` prop by rendering it in italic with light color
- The `groupTemplateSum` variable is already calculated and available
- The `width="flex"` ensures equal column widths using flexbox
- The `styles.tnum` provides tabular number formatting

### Step 3: Modify ExpenseCategoryMonth (Category Rows)

**File**: `packages/desktop-client/src/components/budget/envelope/EnvelopeBudgetComponents.tsx`
**Location**: Lines 263-581
**Function**: `export const ExpenseCategoryMonth = memo(function ExpenseCategoryMonth({...})`

**Current Code Analysis**:
- Lines 307-311: Gets `targetValue` from `targetAmounts[category.id]` when templates are shown
- Lines 330-466: A View wrapping the budget menu dropdown and budget cell
  - Line 426: `onExpose` is conditionally undefined when `targetValue !== undefined` (disables editing)
  - Line 429: `targetValue={targetValue}` prop makes the cell show template value instead of budget
- Lines 467-522: "spent" Field (unchanged)
- Lines 523-578: "balance" Field (unchanged)

**Required Changes**:

1. **Modify the EnvelopeSheetCell at line 421-465**:

   a. **Remove line 429**: Delete the `targetValue={targetValue}` prop entirely

   b. **Change line 426** from:
   ```typescript
   onExpose={targetValue !== undefined ? undefined : () => onEdit(category.id, month)}
   ```
   to:
   ```typescript
   onExpose={() => onEdit(category.id, month)}
   ```

   This makes the Budgeted column always editable, regardless of template state.

2. **Add new Templates column after line 466** (after the budget View closes, before the spent Field):

   ```jsx
   {showTargetAmounts && targetValue !== undefined && (
     <Field name="templates" width="flex" style={{ textAlign: 'right' }}>
       <View
         style={{
           flex: 1,
           padding: '0 5px',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'flex-end',
           fontStyle: 'italic',
           color: theme.pageTextLight,
           ...styles.tnum,
         }}
       >
         {integerToCurrency(targetValue)}
       </View>
     </Field>
   )}
   ```

3. **Keep lines 467-578 unchanged** (spent and balance Fields)

**Result**:
- When `showTargetAmounts` is false OR `targetValue` is undefined: 3 columns (Budgeted | Spent | Balance)
- When `showTargetAmounts` is true AND `targetValue` is defined: 4 columns (Budgeted | Templates | Spent | Balance)
- Budgeted column is ALWAYS editable (can click to edit even when templates are shown)
- Templates column is ALWAYS read-only (just displays the value)

**Implementation Notes**:
- The `Field` component provides the column layout structure
- The `width="flex"` ensures equal column width with flexbox
- Template styling uses italic font and `theme.pageTextLight` color to differentiate from budgeted values
- The conditional checks both `showTargetAmounts` AND `targetValue !== undefined` to handle categories without templates
- The `integerToCurrency` function is already imported and available
- The `styles.tnum` provides tabular number formatting

### Step 4: Testing Checklist

**Functional Tests**:
- [ ] Toggle "Show budget templates" ON → Verify 4 columns appear (Budgeted | Templates | Spent | Balance)
- [ ] Toggle "Show budget templates" OFF → Verify 3 columns appear (Budgeted | Spent | Balance)
- [ ] With templates shown, click Budgeted column → Verify it's still editable
- [ ] With templates shown, verify Templates column is read-only (not clickable)
- [ ] Edit a budget value with templates showing → Verify it saves correctly
- [ ] Apply budget template from menu → Verify both Budgeted and Templates columns update correctly

**Visual Tests**:
- [ ] Verify column widths are equal (all using flex: 1)
- [ ] Verify Templates column uses italic font style
- [ ] Verify Templates column uses lighter text color (theme.pageTextLight)
- [ ] Verify all columns are right-aligned
- [ ] Verify header labels match column contents

**Edge Cases**:
- [ ] Categories with no template defined (should show 0.00 in Templates column)
- [ ] Group rows with mixed categories (some with/without templates)
- [ ] Switching between months with templates toggled on

## Layout Considerations

- The implementation uses flexbox with `width="flex"` (translates to `flex: 1`)
- Adding a 4th column means each column will be ~25% narrower when templates are shown
- Currency values should still fit comfortably
- No changes needed to parent layout components

## Implementation Notes

- All three components follow the same pattern: add a conditional column between Budgeted and Spent
- Template styling (italic, light color) is already implemented in existing code and can be reused
- The `EnvelopeSheetCell` component already handles template display via `targetValue` prop - we'll reuse this for the new Templates column
- Budget editing functionality should work exactly as before, just without the template toggle disabling it

## Risk Assessment

**Low Risk**: These are mostly additive changes (adding a column) rather than replacing existing functionality
**Medium Complexity**: Category rows have complex layout with budget menu dropdown that needs careful handling
**Testing**: Should test thoroughly with various data scenarios and toggle states

## Implementation Status

✅ **COMPLETE** - All changes have been successfully implemented:

1. ✅ **BudgetTotalsMonth** - Modified to show Budgeted (always) and Templates (conditional) columns
2. ✅ **ExpenseGroupMonth** - Removed targetValue from budgeted cell, added conditional Templates cell
3. ✅ **ExpenseCategoryMonth** - Removed targetValue prop, fixed onExpose to always allow editing, added conditional Templates Field
4. ✅ **Alignment Fix** - Fixed Templates column centering by restructuring the View/Text component to match Spent column layout

### Final Implementation Details

The Templates column now displays properly with:
- Correct flexbox alignment using `flexDirection: 'row'` and `justifyContent: 'flex-end'`
- Text component wrapping with proper margin (1) and padding (0 4px) to match other columns
- Italic font style and light text color for visual distinction
- Read-only display (no editing capability)

The feature now works as intended:
- When "Show budget templates" is toggled ON: Shows all 4 columns (Budgeted | Templates | Spent | Balance)
- When toggled OFF: Shows 3 columns (Budgeted | Spent | Balance)
- Budgeted column remains always visible and editable
