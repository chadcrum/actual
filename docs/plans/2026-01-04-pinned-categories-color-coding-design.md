# Pinned Categories Color Coding Design

## Problem Statement

The pinned categories feature on the overview page currently uses simple positive/negative color coding for category balances. This is inconsistent with the budget page, which uses goal-aware color coding that helps users quickly identify:
- Categories that are fully funded or overfunded (green)
- Categories that are underfunded (yellow)
- Categories with negative balances (red)

Users expect the same visual indicators on the overview page to maintain consistency across the app.

## Solution Overview

Update the pinned categories color coding to match the budget page's goal-aware color logic for envelope budget categories. Tracking budget categories will continue to use simple positive/negative coloring since goals don't apply to them.

## Design Details

### Color Logic (Envelope Budget)

**With Goals Set:**
- Negative balance → Red (`theme.errorText`)
- Budgeted < Goal → Yellow (`theme.warningText`)
- Budgeted ≥ Goal → Green (`theme.noticeText`)

**Without Goals:**
- Negative balance → Red
- Zero balance → Grey (`theme.tableTextSubdued`)
- Positive balance → Default text color

### Color Logic (Tracking Budget)

Continue using simple positive/negative coloring:
- Positive balance → Green (`theme.noticeTextMenu`)
- Negative balance → Red (`theme.errorTextMenu`)
- Zero balance → Grey (`theme.tableTextSubdued`)

## Implementation Approach

### File to Modify
`packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.tsx`

### Changes to `PinnedCategoryRow` Component

1. **Add spreadsheet bindings for envelope budget:**
   - `envelopeBudget.catGoal(categoryId)` - goal amount
   - `envelopeBudget.catBudgeted(categoryId)` - budgeted amount
   - `envelopeBudget.catLongGoal(categoryId)` - long-term goal flag

2. **Update styling logic:**
   - Import `makeBalanceAmountStyle` from `../budget/util`
   - For envelope budget: use `makeBalanceAmountStyle(balance, goalValue, longGoalValue === 1 ? balance : budgetedValue)`
   - For tracking budget: continue using `makeAmountFullStyle(balance, { positiveColor, negativeColor })`

3. **Handle edge cases:**
   - Null goal values (no goal set) → automatic fallback to simple coloring
   - Null balance values → already handled with '-' display
   - Long goals vs template goals → handled by third parameter to `makeBalanceAmountStyle`

## Testing Considerations

- Test with envelope budget categories that have goals
- Test with envelope budget categories without goals
- Test with tracking budget categories
- Verify color changes match budget page behavior
- Test with long-term goals vs template goals
- Test with negative balances, underfunded, and overfunded states

## Files Affected

- `packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.tsx` - main implementation
- Existing tests should be updated to verify color coding logic

## Dependencies

- Uses existing `makeBalanceAmountStyle` function from budget utilities
- Uses existing spreadsheet bindings for envelope budget
- Requires goal templates feature flag to be enabled for goal-aware colors
