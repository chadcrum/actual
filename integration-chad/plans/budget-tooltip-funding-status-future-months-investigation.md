# Investigation Report: Budget Tooltip Funding Status - Future Months Issue

**Status**: INVESTIGATION COMPLETE  
**Date**: December 16, 2025  
**Component**: Budget Tooltip Funding Status Feature  
**Issue**: Shows 0.00 for all values in future months (works correctly for current month)

---

## Executive Summary

The budget tooltip funding status feature shows correct values for the current month but displays 0.00 for all future months. This occurs because **future months' spreadsheet sheets are not initialized until the user first accesses them**, and the hook relies on month-specific spreadsheet data that doesn't exist in uninitialized sheets.

---

## Root Cause Analysis

### Why Current Month Works ✅

1. **Sheet is Active**: Current month's spreadsheet sheet exists and is populated
2. **Data Available**: Categories have budgeted amounts and balances already set
3. **Subscriptions Receive Values**: The four required spreadsheet bindings return actual values:
   - `envelopeBudget.catGoal(categoryId)`
   - `envelopeBudget.catBudgeted(categoryId)`
   - `envelopeBudget.catBalance(categoryId)`
   - `envelopeBudget.catLongGoal(categoryId)`
4. **Calculations Succeed**: All computations complete with real data

### Why Future Months Fail ❌

**The Problem Chain**:

1. **Lazy Sheet Creation** (packages/loot-core/src/server/budget/base.ts:244-275)
   - Spreadsheet sheets for future months are created **on-demand**, not upfront
   - They remain uninitialized until the user navigates to or interacts with that month

2. **No Initial Data in Uninitialized Sheets**
   - Future month sheets have no category data loaded into them
   - This is a performance optimization to avoid creating 12+ months of spreadsheet data upfront

3. **Binding Subscriptions Fail Silently**
   - When `useGoalFundingStatus` subscribes to bindings on an uninitialized sheet
   - The spreadsheet returns `undefined` instead of a value
   - No error is thrown; the subscription just doesn't get a value

4. **Coalescing Undefined to 0** (useGoalFundingStatus.ts:71, 90, 110, 130)

   ```typescript
   goal: typeof result.value === 'number' ? result.value : 0
   ```

   - All undefined values are intentionally coalesced to `0`
   - This is a safety measure, but it causes the issue for uninitialized data
   - Result: All four values become `0`

5. **Calculation Yields 0** (lines 159-174)

   ```typescript
   if (data.goal > 0) {  // ← False, because goal is 0
     // This block never executes
   }
   ```

   - With `goal = 0`, the calculation is skipped (only processes categories with goals > 0)
   - Both `underfunded` and `overfunded` remain `0`

### Data Structure for Future Months

**Current Month Sheet (budget202512)**:

```
budget-groceries: 50000 (persisted)
budgeted-groceries: 45000 (live data)
balance-groceries: 42500 (calculated)
goal-groceries: 50000 (persisted)
long-goal-groceries: 0 (persisted)
```

**Future Month Sheet (budget202601) - BEFORE accessing it**:

```
budget-groceries: undefined
budgeted-groceries: undefined
balance-groceries: undefined
goal-groceries: 50000 (copied from previous month)
long-goal-groceries: 0 (copied from previous month)
```

The month-specific values (`budgeted`, `balance`) don't exist until the sheet is populated.

---

## Why useGoalTargetSum Works But useGoalFundingStatus Doesn't

### useGoalTargetSum (Works) ✅

```typescript
// Only subscribes to ONE binding per category
envelopeBudget.catGoal(categoryId)
```

- `catGoal` is **persistent data** that's copied to new months
- It returns a value even for uninitialized sheets
- Works across all months without issues

### useGoalFundingStatus (Fails) ❌

```typescript
// Subscribes to FOUR bindings per category
envelopeBudget.catGoal(categoryId)        // ✅ Persistent - works
envelopeBudget.catBudgeted(categoryId)    // ❌ Month-specific - undefined
envelopeBudget.catBalance(categoryId)     // ❌ Month-specific - undefined
envelopeBudget.catLongGoal(categoryId)    // ✅ Persistent - works
```

The failure of even ONE binding prevents correct calculations because:

- All undefined values coalesce to 0
- The calculation needs ALL four values to be accurate
- If any are 0 when they shouldn't be, the math is wrong

**Data Type**:

- **Persistent**: Goals and goal flags are copied to all future months
- **Month-specific**: Budgeted amounts and balances are calculated/entered per month and don't exist until accessed

---

## Spreadsheet Architecture Context

### How Sheets Are Created

From packages/loot-core/src/server/budget/base.ts:

```typescript
// Creates a new month's sheet ON FIRST ACCESS
const createMonthIfNeeded = (month) => {
  if (!meta.createdMonths.has(month)) {
    const sheetName = monthUtils.sheetForMonth(month);
    const prevSheetName = monthUtils.sheetForMonth(monthUtils.prevMonth(month));

    categories.forEach(cat => {
      // Copy data from previous month or use defaults
      createCategory(cat, sheetName, prevSheetName, start, end);
    });

    meta.createdMonths.add(month);
  }
}
```

**Key Points**:

- Sheets are created lazily (on-demand)
- Creation happens when the month is accessed
- Previous month's data is used as a template
- Goals and goal flags are copied; transaction/balance data is recalculated

### When Are Sheets Initialized?

- ✅ Current month: Always initialized
- ✅ Accessed months: Initialized when user navigates to them
- ❌ Future months (not accessed): Remain uninitialized
- ✅ Past months with data: Initialized (contains transaction data)

---

## Three Solution Options

### Option 1: Ensure Sheet Initialization (⭐ RECOMMENDED)

**Summary**: Pre-initialize the sheet before subscribing to bindings

**Complexity**: Medium  
**Performance Impact**: Low  
**User Experience**: Best  
**Correctness**: Perfect

**How It Works**:

1. Before subscribing to bindings, force the spreadsheet to load/initialize the month sheet
2. This populates all default values and category structures
3. Subsequent binding subscriptions receive actual (or default) values instead of undefined

**Implementation**:

- Add pre-initialization logic to `useGoalFundingStatus` hook
- Call a function that accesses the sheet to ensure it's created
- Options:
  - Read a dummy cell from the sheet to trigger initialization
  - Call `spreadsheet.loadSheet(sheetName)` if available
  - Subscribe to a known cell that will trigger creation (e.g., `to-budget`)

**Pros**:

- Works correctly for all scenarios
- No semantic issues or edge cases
- Maintains current behavior expectations
- Handles future months with pre-budgeted amounts correctly

**Cons**:

- Requires understanding spreadsheet API
- Might cause slight delay when navigating to future months (first access)
- Could affect performance if multiple sheets need initialization

**Files to Modify**:

- `packages/desktop-client/src/hooks/useGoalFundingStatus.ts` (lines 50-56)

---

### Option 2: Calculate from Available Data

**Summary**: Accept that future months have no month-specific data and show results based on goals alone

**Complexity**: Low  
**Performance Impact**: Negligible  
**User Experience**: Limited  
**Correctness**: Conditional

**How It Works**:

1. When a sheet is uninitialized, budgeted and balance are indeed 0
2. Show "underfunded" sum as the total of all goals (since nothing is budgeted yet)
3. Show "overfunded" as 0 (can't be overfunded if nothing is budgeted)

**Semantic Meaning**:

```typescript
// For future uninitialized months:
underfunded = sum of all goals  // "All goals are underfunded (not budgeted yet)"
overfunded = 0                  // "Nothing can be overfunded"
```

**Pros**:

- Simple to implement
- No performance overhead
- No need to understand spreadsheet internals

**Cons**:

- Misleading if user has already set budgets for future months but sheet isn't fully loaded
- Users might see "underfunded: $5,000" but can't understand why
- Doesn't distinguish between "no goals" and "goals not budgeted"
- Could confuse users mid-workflow (set budget → still shows as underfunded)

**When This Fails**:
User journey:

1. Navigate to future month (Jan 2025)
2. Set budget for Groceries to $100 ($200 goal)
3. Funding status appears to show underfunded: $200 (wrong! Should show $100)
4. Confusing UX

**Files to Modify**:

- `packages/desktop-client/src/hooks/useGoalFundingStatus.ts` (lines 71-93, add uninitialized sheet detection)

---

### Option 3: Use Alternate Data Source for Future Months

**Summary**: Query database directly instead of relying on uninitialized sheets

**Complexity**: High  
**Performance Impact**: Medium  
**User Experience**: Adequate  
**Correctness**: Good

**How It Works**:

1. Detect if sheet is initialized
2. If not, fetch budgeted amounts from database
3. If initialized, use spreadsheet bindings as normal
4. Merge both data sources

**Implementation Challenges**:

- Need to detect sheet initialization status
- Need database queries for category budgets
- Requires synchronization between two data sources
- Database might not always be up-to-date with spreadsheet

**Pros**:

- Could work for truly unavailable bindings
- Novel approach if needed elsewhere

**Cons**:

- Adds significant complexity
- Two data sources = potential sync issues
- Database might not have the data anyway
- Not worth the complexity for this use case

**Files to Modify**:

- `packages/desktop-client/src/hooks/useGoalFundingStatus.ts` (major refactor)
- Potentially new utilities for sheet detection

---

## Recommended Implementation

**Choose Option 1** for the following reasons:

1. **Correct**: Handles all scenarios properly
2. **Maintainable**: Fits existing architectural patterns
3. **User Experience**: No surprises or weird edge cases
4. **Performance**: Minimal overhead (sheet loading is already optimized)
5. **Precedent**: Other components likely use similar patterns

**Next Steps to Research**:

1. Look at how `useEnvelopeSheetValue` or similar hooks handle future months
2. Check if there's a standard pattern in the codebase for ensuring sheet initialization
3. Find the spreadsheet API method for pre-loading/initializing sheets
4. Look at: `packages/desktop-client/src/hooks/useSheetValue.ts`

---

## Testing Plan

After implementing Solution 1, verify:

- [ ] **Current Month**: Shows correct underfunded/overfunded totals
- [ ] **Next Month**: Shows correct totals (not 0.00)
- [ ] **3+ Months Ahead**: Shows correct totals
- [ ] **Pre-budgeted Months**: If user budgets future months, values appear immediately
- [ ] **Goal Changes**: Updating goals reflects in future months instantly
- [ ] **Budget Changes**: Updating budgets in future months updates funding status instantly
- [ ] **Category Visibility**: Hiding/showing categories updates calculations
- [ ] **Performance**: No noticeable lag when switching between months
- [ ] **UI Feedback**: Initial sheet creation doesn't cause visible delay or flicker
- [ ] **Edge Cases**:
  - Empty months (no goals at all)
  - Categories with 0 goals mixed with categories with goals
  - Very distant future months (6-12 months out)

---

## Files Reference

### Key Implementation File

- [`packages/desktop-client/src/hooks/useGoalFundingStatus.ts`](packages/desktop-client/src/hooks/useGoalFundingStatus.ts) - Main fix location

### Related Working Example

- [`packages/desktop-client/src/hooks/useGoalTargetSum.ts`](packages/desktop-client/src/hooks/useGoalTargetSum.ts) - Similar hook (for comparison)

### Infrastructure Files

- [`packages/loot-core/src/server/budget/base.ts`](packages/loot-core/src/server/budget/base.ts:244-275) - Sheet initialization logic
- [`packages/loot-core/src/server/spreadsheet/spreadsheet.ts`](packages/loot-core/src/server/spreadsheet/spreadsheet.ts) - Spreadsheet API (need to research)
- [`packages/desktop-client/src/hooks/useSheetValue.ts`](packages/desktop-client/src/hooks/useSheetValue.ts) - Sheet binding pattern (to understand existing approach)

### Feature Components

- [`packages/desktop-client/src/components/budget/envelope/budgetsummary/UnderfundedRow.tsx`](packages/desktop-client/src/components/budget/envelope/budgetsummary/UnderfundedRow.tsx) - Consumer of hook
- [`packages/desktop-client/src/components/budget/envelope/budgetsummary/OverfundedRow.tsx`](packages/desktop-client/src/components/budget/envelope/budgetsummary/OverfundedRow.tsx) - Consumer of hook

### Reference Calculation Logic

- [`packages/desktop-client/src/components/budget/BalanceWithCarryover.tsx`](packages/desktop-client/src/components/budget/BalanceWithCarryover.tsx) - Goal calculation pattern

---

## Summary

The issue is **not a bug in the implementation** of the feature itself. Rather, it exposes a **fundamental architectural interaction** between:

1. **Lazy sheet initialization** (performance optimization)
2. **Month-specific binding data** (doesn't exist until sheet is accessed)
3. **Coalescing undefined to 0** (safety measure that becomes a problem)

The fix is straightforward conceptually: **ensure the sheet is initialized before subscribing to its bindings**.

Implementing this requires:

- Understanding the spreadsheet's sheet initialization API
- Adding pre-initialization logic to the hook
- Verifying it doesn't impact performance

This is a solid architectural pattern to establish for future hooks that need month-specific data.
