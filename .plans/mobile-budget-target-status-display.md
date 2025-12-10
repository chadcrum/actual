# Mobile Budget Target Status Display Enhancement

## Overview
Enhance the target field in the mobile budget detailed view to display funding status with descriptive text and color-coded indicators instead of raw currency values.

## Current State
The `TargetAmountDisplay` component currently shows:
- Raw currency values (e.g., "-$356.45", "$3,434.55", "$0.00")
- Color-coded text based on value
- "N/A" for categories without targets

**File**: `packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx` (lines 306-358)

## Requirements

### Display Format
- **Target = 0 (fully funded)**: "Fully Funded" in green
- **Target < 0 (underfunded)**: "Underfunded ($356.45)" in yellow (absolute value, no negative sign)
- **Target > 0 (overfunded)**: "Overfunded ($3,434.55)" in red
- **Target = undefined (no target)**: "N/A" in gray (unchanged)

### Design Decisions (User Confirmed)
✓ Colored text only (no pill backgrounds)
✓ "Fully Funded" shows no amount
✓ Keep "N/A" for categories without targets
✓ Maintain existing styling (italic, 12px, right-aligned)

### Color Mapping
- Green (`theme.noticeText`) - Fully Funded
- Yellow (`theme.warningText`) - Underfunded
- Red (`theme.errorText`) - Overfunded
- Gray (`theme.pageTextLight`) - N/A

## Implementation Plan

### Single File Modification
**File**: `packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx`

Modify the `TargetAmountDisplay` component (lines 312-358) to:
1. Add helper function to determine status text and color
2. Replace raw currency display with status text
3. Use absolute values for underfunded amounts
4. Support internationalization with `useTranslation()` hook

### Code Structure

#### Step 1: Add Helper Function
Create `getTargetStatus()` helper inside the `TargetAmountDisplay` component:

```typescript
function getTargetStatus(
  targetValue: number | undefined,
  t: (key: string, options?: any) => string,
): { text: string; color: string } {
  if (targetValue === undefined) {
    return {
      text: t('N/A'),
      color: theme.pageTextLight,
    };
  }

  if (targetValue === 0) {
    return {
      text: t('Fully Funded'),
      color: theme.noticeText,
    };
  }

  if (targetValue < 0) {
    // Underfunded - show absolute value
    return {
      text: t('Underfunded ({{amount}})', {
        amount: integerToCurrency(Math.abs(targetValue)),
      }),
      color: theme.warningText,
    };
  }

  // targetValue > 0 - Overfunded
  return {
    text: t('Overfunded ({{amount}})', {
      amount: integerToCurrency(targetValue),
    }),
    color: theme.errorText,
  };
}
```

#### Step 2: Update Component Logic
Replace the existing color determination logic (lines 325-333) and text rendering (lines 352-354):

```typescript
function TargetAmountDisplay({
  categoryId,
  targetAmounts,
  show3Columns,
}: TargetAmountDisplayProps) {
  const { t } = useTranslation(); // Already imported at top of file
  const targetValue = targetAmounts ? targetAmounts[categoryId] : undefined;

  const columnWidth = getColumnWidth({
    show3Columns,
    isSidebar: false,
  });

  // Get status text and color
  const { text, color } = getTargetStatus(targetValue, t);

  return (
    <View
      style={{
        width: columnWidth,
        minWidth: columnWidth,
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
        {text}
      </Text>
    </View>
  );
}
```

## Technical Details

### Dependencies (Already Available)
- ✓ `useTranslation` hook - imported (line 3)
- ✓ `integerToCurrency` utility - imported (line 14)
- ✓ `theme` colors - imported (line 9)
- ✓ `Math.abs()` - built-in JavaScript

### Translation Keys Required
The following i18n keys will be used:
- `N/A`
- `Fully Funded`
- `Underfunded ({{amount}})`
- `Overfunded ({{amount}})`

### Target Value Semantics
The target value represents the **difference** between goal and current state:
- `targetValue = 0` → exactly at target (fully funded)
- `targetValue < 0` → below target by this amount (underfunded)
- `targetValue > 0` → above target by this amount (overfunded)

Source: `BudgetPage.tsx` lines 188-214 calculate target as `longGoal ? balance - goal : budgeted - goal`

## Testing Checklist
- [ ] Target = undefined displays "N/A" in gray
- [ ] Target = 0 displays "Fully Funded" in green (no amount shown)
- [ ] Target = -35645 displays "Underfunded ($356.45)" in yellow
- [ ] Target = 343455 displays "Overfunded ($3,434.55)" in red
- [ ] Text maintains italic style, 12px font, right alignment
- [ ] Spacing and column alignment unchanged
- [ ] Colors match theme (green/yellow/red/gray)
- [ ] Large positive/negative values format correctly
- [ ] Single-digit values display properly
- [ ] Text wraps appropriately if needed (though unlikely with current widths)

## Files Modified
Total: 1 file

1. **packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx**
   - Modify `TargetAmountDisplay` component (lines 312-358)
   - Add helper function `getTargetStatus()`
   - Update component logic to use status text

## Reference Implementation
Similar pattern found in:
- `packages/desktop-client/src/components/budget/BalanceWithCarryover.tsx` (lines 228-318)
  - Shows "Fully funded", "Overfunded (amount)", "Underfunded (amount)" with i18n

## Edge Cases Handled
- **Undefined vs null**: Explicit `=== undefined` check
- **Zero vs falsy**: Explicit `=== 0` check prevents false positives
- **Very large numbers**: `integerToCurrency()` handles formatting
- **Locale formatting**: `useTranslation()` provides proper i18n support
- **Negative display**: `Math.abs()` ensures no negative signs for underfunded

## Todo List

### Phase 1: Preparation
- [ ] Read the current `TargetAmountDisplay` component implementation
- [ ] Verify all required imports are present (useTranslation, integerToCurrency, theme)
- [ ] Confirm understanding of target value semantics

### Phase 2: Implementation
- [ ] Add `getTargetStatus()` helper function inside `TargetAmountDisplay` component
  - [ ] Handle `undefined` case → return "N/A" with gray color
  - [ ] Handle `0` case → return "Fully Funded" with green color
  - [ ] Handle negative case → return "Underfunded ({amount})" with yellow color and absolute value
  - [ ] Handle positive case → return "Overfunded ({amount})" with red color
- [ ] Update `TargetAmountDisplay` component logic
  - [ ] Add `const { t } = useTranslation();` hook call
  - [ ] Replace color determination logic with `getTargetStatus()` call
  - [ ] Update Text component to use `{text}` from helper function
  - [ ] Remove old ternary expression (lines 352-354)

### Phase 3: Testing
- [ ] Test with undefined target (should show "N/A" in gray)
- [ ] Test with zero target (should show "Fully Funded" in green)
- [ ] Test with negative target like -35645 (should show "Underfunded ($356.45)" in yellow)
- [ ] Test with positive target like 343455 (should show "Overfunded ($3,434.55)" in red)
- [ ] Verify styling remains unchanged (italic, 12px, right-aligned)
- [ ] Verify column width and alignment with Budgeted column
- [ ] Test with various amount magnitudes (small, medium, large)

### Phase 4: Visual Verification
- [ ] Check color accuracy (green/yellow/red/gray match theme)
- [ ] Verify no negative signs appear in displayed amounts
- [ ] Confirm "Fully Funded" shows no amount in parentheses
- [ ] Ensure text doesn't overflow or wrap unexpectedly
- [ ] Verify consistent spacing and padding

## Success Criteria
✓ Status text replaces raw currency values
✓ Colors accurately reflect funding status (green/yellow/red/gray)
✓ Absolute values shown (no negative signs)
✓ "Fully Funded" displays without amount
✓ "N/A" unchanged for categories without targets
✓ Styling and layout unchanged (italic, 12px, right-aligned)
✓ i18n support for future translations
