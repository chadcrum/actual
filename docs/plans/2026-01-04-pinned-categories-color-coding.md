# Pinned Categories Color Coding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align pinned categories color coding on overview page with budget page's goal-aware colors.

**Architecture:** Modify PinnedCategoryRow to use makeBalanceAmountStyle (which considers goals) instead of makeAmountFullStyle (simple positive/negative) for envelope budget categories. Tracking budget categories retain simple coloring since goals don't apply.

**Tech Stack:** React, TypeScript, loot-core spreadsheet bindings, existing budget utilities

---

## Task 1: Update Tests to Expect Goal-Aware Colors

**Files:**
- Modify: `packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.test.tsx`

**Step 1: Read the existing test file**

Read: `packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.test.tsx`

Purpose: Understand current test structure and what needs updating for goal-aware colors.

**Step 2: Add test cases for goal-based coloring**

Add tests that verify:
- Green color when budgeted >= goal (funded/overfunded)
- Yellow color when budgeted < goal (underfunded)
- Red color when balance is negative
- Simple coloring when no goal is set
- Simple coloring for tracking budget

**Step 3: Run tests to verify they fail**

Run: `yarn workspace @actual-app/web test PinnedCategoriesTable.test`

Expected: Tests fail because implementation doesn't use goal-aware colors yet.

**Step 4: Commit test updates**

```bash
git add packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.test.tsx
git commit -m "test: add goal-aware color tests for pinned categories"
```

---

## Task 2: Import makeBalanceAmountStyle

**Files:**
- Modify: `packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.tsx:1-18`

**Step 1: Add import for makeBalanceAmountStyle**

Update imports at top of file:

```typescript
import { integerToCurrency } from 'loot-core/shared/util';

import { usePinnedCategories } from '@desktop-client/components/budget/hooks/usePinnedCategories';
import { makeAmountFullStyle, makeBalanceAmountStyle } from '@desktop-client/components/budget/util';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
```

**Step 2: Commit import change**

```bash
git add packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.tsx
git commit -m "feat: import makeBalanceAmountStyle utility"
```

---

## Task 3: Add Spreadsheet Bindings for Goals

**Files:**
- Modify: `packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.tsx:31-48`

**Step 1: Add goal-related useSheetValue hooks**

In PinnedCategoryRow component, after the balance binding, add:

```typescript
const balance = useSheetValue<
  'envelope-budget' | 'tracking-budget',
  typeof balanceBinding
>(balanceBinding);

// Add goal-related bindings for envelope budget
const goalBinding =
  budgetType === 'envelope'
    ? envelopeBudget.catGoal(categoryId)
    : null;

const budgetedBinding =
  budgetType === 'envelope'
    ? envelopeBudget.catBudgeted(categoryId)
    : null;

const longGoalBinding =
  budgetType === 'envelope'
    ? envelopeBudget.catLongGoal(categoryId)
    : null;

const goalValue = useSheetValue<
  'envelope-budget',
  typeof goalBinding
>(goalBinding);

const budgetedValue = useSheetValue<
  'envelope-budget',
  typeof budgetedBinding
>(budgetedBinding);

const longGoalValue = useSheetValue<
  'envelope-budget',
  typeof longGoalBinding
>(longGoalBinding);
```

**Step 2: Verify types compile**

Run: `yarn workspace @actual-app/web typecheck`

Expected: No type errors.

**Step 3: Commit spreadsheet bindings**

```bash
git add packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.tsx
git commit -m "feat: add goal spreadsheet bindings to pinned categories"
```

---

## Task 4: Update Styling Logic for Goal-Aware Colors

**Files:**
- Modify: `packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.tsx:73-82`

**Step 1: Replace makeAmountFullStyle with conditional logic**

Replace the existing style calculation (lines 73-82):

```typescript
<Text
  style={{
    fontSize: 14,
    marginLeft: 12,
    flexShrink: 0,
    ...(budgetType === 'envelope' && goalValue != null
      ? makeBalanceAmountStyle(
          balance ?? 0,
          goalValue,
          longGoalValue === 1 ? balance : budgetedValue,
        )
      : makeAmountFullStyle(balance ?? 0, {
          positiveColor: theme.noticeTextMenu,
          negativeColor: theme.errorTextMenu,
        })),
  }}
>
  {balance != null ? integerToCurrency(balance) : '-'}
</Text>
```

**Step 2: Run tests to verify they pass**

Run: `yarn workspace @actual-app/web test PinnedCategoriesTable.test`

Expected: All tests pass with goal-aware colors working correctly.

**Step 3: Verify types compile**

Run: `yarn workspace @actual-app/web typecheck`

Expected: No type errors.

**Step 4: Commit styling changes**

```bash
git add packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.tsx
git commit -m "feat: use goal-aware colors for pinned categories"
```

---

## Task 5: Manual Testing

**Step 1: Start the development server**

Run: `yarn start:browser`

Expected: Development server starts without errors.

**Step 2: Navigate to overview page**

1. Open browser to `http://localhost:3000`
2. Enable "Overview Page" feature flag in Settings > Experimental Features
3. Navigate to Overview page
4. Verify pinned categories section appears

**Step 3: Test color coding scenarios**

Create test categories with different states:
1. **Green test:** Category with goal, budgeted >= goal → should show green
2. **Yellow test:** Category with goal, budgeted < goal → should show yellow
3. **Red test:** Category with negative balance → should show red
4. **Grey/default test:** Category without goal → should use simple colors
5. **Tracking test:** Switch to tracking budget → should use simple colors

**Step 4: Document testing results**

Take screenshots if colors don't match expectations, note any issues.

---

## Task 6: Update Integration Tests

**Files:**
- Modify: `packages/desktop-client/src/components/mobile/overview/PinnedCategories.integration.test.tsx`

**Step 1: Review integration tests**

Read: `packages/desktop-client/src/components/mobile/overview/PinnedCategories.integration.test.tsx`

Purpose: Ensure integration tests cover goal-aware color scenarios.

**Step 2: Add integration test scenarios**

If not already covered, add tests for:
- Pinned category with goal showing correct color based on funded status
- Pinned category without goal showing simple colors
- Switching between envelope and tracking budget types

**Step 3: Run integration tests**

Run: `yarn workspace @actual-app/web test PinnedCategories.integration.test`

Expected: All integration tests pass.

**Step 4: Commit integration test updates**

```bash
git add packages/desktop-client/src/components/mobile/overview/PinnedCategories.integration.test.tsx
git commit -m "test: update integration tests for goal-aware colors"
```

---

## Task 7: Final Verification and Cleanup

**Step 1: Run full test suite**

Run: `yarn test`

Expected: All tests pass across the entire codebase.

**Step 2: Run linter**

Run: `yarn workspace @actual-app/web lint`

Expected: No linting errors.

**Step 3: Verify TypeScript compilation**

Run: `yarn workspace @actual-app/web typecheck`

Expected: No type errors.

**Step 4: Review all changes**

Run: `git diff integration..HEAD`

Review changes to ensure:
- Only PinnedCategoriesTable.tsx and related tests modified
- No unintended changes
- Code follows project style
- All imports are used

**Step 5: Create final commit if needed**

If any cleanup needed:

```bash
git add .
git commit -m "chore: cleanup and final adjustments"
```

---

## Completion Checklist

- [ ] Tests updated and passing
- [ ] makeBalanceAmountStyle imported
- [ ] Goal spreadsheet bindings added
- [ ] Styling logic updated for goal-aware colors
- [ ] Manual testing completed
- [ ] Integration tests updated
- [ ] Full test suite passes
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Code reviewed and cleaned up

## Next Steps

After completing this plan:
1. Use @superpowers:verification-before-completion to verify all tests pass
2. Use @superpowers:requesting-code-review for code review
3. Use @superpowers:finishing-a-development-branch to create PR or merge

## YAGNI Reminders

- Don't add tooltip functionality (budget page already has it)
- Don't add carryover indicators (not in scope)
- Don't refactor unrelated code
- Don't add extra features beyond color coding
