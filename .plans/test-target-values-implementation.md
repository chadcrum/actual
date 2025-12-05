# Test Plan: Verify Target Values Implementation

## Overview
This test plan verifies that the new target values implementation matches the balance column hover behavior exactly.

## Test Cases

### 1. **Visual Consistency Test**
**Objective**: Verify target values match balance hover values

**Steps**:
1. Navigate to budget page
2. Enable "Show budget targets" toggle
3. Hover over balance column for a category
4. Compare the "Overfunded/Underfunded" value with target column value

**Expected Result**:
- Target column value = Balance hover "Overfunded/Underfunded" value
- Positive target = Overfunded (green)
- Zero target = Fully funded (neutral)
- Negative target = Underfunded (red)

### 2. **Calculation Verification Test**
**Objective**: Verify target value calculation is correct

**Test Data**:
```javascript
// Test case 1: Overfunded
const balanceValue = 5000;  // $50.00
const goalValue = 3000;     // $30.00
const expectedTarget = 2000; // $20.00 (positive = overfunded)

// Test case 2: Fully funded
const balanceValue = 3000;  // $30.00
const goalValue = 3000;     // $30.00
const expectedTarget = 0;    // $0.00 (zero = fully funded)

// Test case 3: Underfunded
const balanceValue = 2000;  // $20.00
const goalValue = 3000;     // $30.00
const expectedTarget = -1000; // -$10.00 (negative = underfunded)
```

**Implementation Code**:
```typescript
// In TargetAmountsContext.tsx
const targetValue = balanceValue - goalValue;

// Should match exactly with BalanceWithCarryover.getDifferenceToGoal()
const getDifferenceToGoal = (balanceValue: number, goalValue: number) => {
  return balanceValue - goalValue;
};
```

### 3. **Performance Test**
**Objective**: Verify no backend calls are made

**Steps**:
1. Monitor network traffic
2. Toggle "Show budget targets" on/off
3. Verify no calls to `budget/get-budget-templates`

**Expected Result**:
- ✅ No network calls
- ✅ Instant calculation
- ✅ Smooth UI response

### 4. **Edge Cases Test**
**Objective**: Test edge cases

**Test Cases**:
1. **Category with no goal**: Should show 0 or be hidden
2. **Income categories**: Should be excluded from target calculation
3. **Hidden categories**: Should be excluded
4. **Zero balance and goal**: Should show 0 (fully funded)

## Implementation Verification

### Code Comparison

**Before (Complex Template Processing)**:
```typescript
// Old approach - required backend processing
send('budget/get-budget-templates', { month })
  .then((amounts) => setTargetAmounts(amounts));

// Complex template types: simple, copy, periodic, spend, percentage, average, by
// Required CategoryTemplateContext with multiple calculation methods
```

**After (Simple Local Calculation)**:
```typescript
// New approach - local calculation only
async function calculateTargetValues() {
  const { data: categories } = await aqlQuery(
    q('categories').filter({ hidden: false, is_income: false })
  );

  const newTargetAmounts: Record<string, number> = {};

  for (const category of categories) {
    const goalValue = /* get from sheet */;
    const balanceValue = /* get from sheet */;
    newTargetAmounts[category.id] = balanceValue - goalValue;
  }

  setTargetAmounts(newTargetAmounts);
}
```

### Expected UI Behavior

| Scenario | Target Column | Balance Hover | Color | Status |
|----------|---------------|---------------|-------|--------|
| Balance > Goal | +$20.00 | Overfunded (+$20.00) | Green | ✅ Match |
| Balance = Goal | $0.00 | Fully funded | Neutral | ✅ Match |
| Balance < Goal | -$10.00 | Underfunded (-$10.00) | Red | ✅ Match |

## Test Execution Plan

1. **Manual Testing**: Perform visual verification
2. **Automated Testing**: Create unit tests for calculation logic
3. **Integration Testing**: Verify end-to-end behavior
4. **Performance Testing**: Measure calculation speed

## Success Criteria

- ✅ Target values match balance hover values exactly
- ✅ No backend calls required
- ✅ Calculation completes in < 100ms
- ✅ UI remains responsive during calculations
- ✅ Error handling works correctly

## Next Steps

1. **Complete data access implementation** in TargetAmountsContext
2. **Run manual tests** to verify visual consistency
3. **Create automated tests** for calculation logic
4. **Document results** and create migration guide