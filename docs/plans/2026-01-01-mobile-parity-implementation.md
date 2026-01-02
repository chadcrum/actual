# Mobile Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `mobileParity` feature flag and enable "Create Rule" action in mobile transaction menu.

**Architecture:** Flag gates conditional UI rendering of "Create rule" menu item in mobile transaction floating action bar. Reuses existing desktop rule creation handler—no new business logic. Follows AGENTS-chad-fork.md principles of additive, flag-gated changes.

**Tech Stack:** TypeScript, React, React Testing Library, Git

---

## Task 1: Add mobileParity Flag to Type Definition

**Files:**
- Modify: `packages/loot-core/src/types/prefs.ts:1-11`

**Step 1: View current FeatureFlag type**

Run: `git show HEAD:packages/loot-core/src/types/prefs.ts | head -20`

Expected output shows existing flags like `enableOverviewPage`

**Step 2: Edit prefs.ts to add mobileParity**

File: `packages/loot-core/src/types/prefs.ts`

Find the FeatureFlag type definition (lines 1-11) and modify it:

```typescript
export type FeatureFlag =
  | 'goalTemplatesEnabled'
  | 'goalTemplatesUIEnabled'
  | 'actionTemplating'
  | 'formulaMode'
  | 'currency'
  | 'crossoverReport'
  | 'plugins'
  | 'forceReload'
  | 'increaseMobileBudgetTableFontSize'
  | 'enableOverviewPage'
  | 'mobileParity';
```

**Step 3: Verify syntax is correct**

Run: `cd packages/loot-core && npx tsc --noEmit`

Expected: No errors

**Step 4: Commit**

```bash
git add packages/loot-core/src/types/prefs.ts
git commit -m "feat(mobile-parity): add mobileParity flag to type definition"
```

---

## Task 2: Add mobileParity to Default Feature Flag State

**Files:**
- Modify: `packages/desktop-client/src/hooks/useFeatureFlag.ts:5-16`

**Step 1: View current default state**

Run: `git show HEAD:packages/desktop-client/src/hooks/useFeatureFlag.ts | head -20`

Expected output shows `DEFAULT_FEATURE_FLAG_STATE` with all flags

**Step 2: Edit useFeatureFlag.ts to add default**

File: `packages/desktop-client/src/hooks/useFeatureFlag.ts`

Find the `DEFAULT_FEATURE_FLAG_STATE` constant (lines 5-16) and add the new flag:

```typescript
const DEFAULT_FEATURE_FLAG_STATE: Record<FeatureFlag, boolean> = {
  goalTemplatesEnabled: false,
  goalTemplatesUIEnabled: false,
  actionTemplating: false,
  formulaMode: false,
  currency: false,
  crossoverReport: false,
  plugins: false,
  forceReload: false,
  increaseMobileBudgetTableFontSize: false,
  enableOverviewPage: false,
  mobileParity: false,
};
```

**Step 3: Verify syntax**

Run: `cd packages/desktop-client && npx tsc --noEmit`

Expected: No errors

**Step 4: Commit**

```bash
git add packages/desktop-client/src/hooks/useFeatureFlag.ts
git commit -m "feat(mobile-parity): add mobileParity to default feature flag state"
```

---

## Task 3: Add mobileParity Toggle to Experimental Settings

**Files:**
- Modify: `packages/desktop-client/src/components/settings/Experimental.tsx:210-212`

**Step 1: View current experimental toggles**

Run: `grep -A 2 "enableOverviewPage" packages/desktop-client/src/components/settings/Experimental.tsx`

Expected output shows the FeatureToggle for enableOverviewPage around line 210

**Step 2: Edit Experimental.tsx to add toggle**

File: `packages/desktop-client/src/components/settings/Experimental.tsx`

Find the `enableOverviewPage` FeatureToggle (around line 210) and add the mobileParity toggle after it:

```typescript
            <FeatureToggle flag="enableOverviewPage">
              <Trans>Mobile overview page</Trans>
            </FeatureToggle>
            <FeatureToggle flag="mobileParity">
              <Trans>Mobile parity features</Trans>
            </FeatureToggle>
```

**Step 3: Verify syntax**

Run: `cd packages/desktop-client && npx tsc --noEmit`

Expected: No errors

**Step 4: Commit**

```bash
git add packages/desktop-client/src/components/settings/Experimental.tsx
git commit -m "feat(mobile-parity): add mobileParity toggle to experimental settings"
```

---

## Task 4: Add Flag Check and Conditional "Create Rule" Menu Item

**Files:**
- Modify: `packages/desktop-client/src/components/mobile/transactions/TransactionList.tsx:380-408`

**Step 1: View current menu items construction**

Run: `sed -n '380,408p' packages/desktop-client/src/components/mobile/transactions/TransactionList.tsx`

Expected output shows the `moreOptionsMenuItems` array construction

**Step 2: Add flag hook at component level**

Find the `SelectedTransactionsFloatingActionBar` component. Near the beginning (before the `moreOptionsMenuItems` construction), add:

```typescript
const mobileParity = useFeatureFlag('mobileParity');
```

Location: Look for other `useFeatureFlag` calls in this component to understand the pattern, or add near line 380.

**Step 3: Update moreOptionsMenuItems to conditionally include "Create rule"**

File: `packages/desktop-client/src/components/mobile/transactions/TransactionList.tsx`

Replace the `moreOptionsMenuItems` array (around lines 388-408) with:

```typescript
const moreOptionsMenuItems: MenuItem<string>[] = [
  {
    name: 'duplicate',
    text: t('Duplicate'),
  },
  {
    name: allTransactionsAreLinked ? 'unlink-schedule' : 'link-schedule',
    text: allTransactionsAreLinked
      ? t('Unlink schedule')
      : t('Link schedule'),
  },
  ...(mobileParity ? [
    {
      name: 'create-rule',
      text: t('Create rule'),
    }
  ] : []),
  {
    name: 'delete',
    text: t('Delete'),
  },
  {
    name: 'merge',
    text: t('Merge'),
    disabled: !canMerge,
  },
];
```

**Step 4: Verify syntax**

Run: `cd packages/desktop-client && npx tsc --noEmit`

Expected: No errors

**Step 5: Commit**

```bash
git add packages/desktop-client/src/components/mobile/transactions/TransactionList.tsx
git commit -m "feat(mobile-parity): add conditional create-rule menu item to transaction menu"
```

---

## Task 5: Add Handler for "Create Rule" Action

**Files:**
- Modify: `packages/desktop-client/src/components/mobile/transactions/TransactionList.tsx:599-669`

**Step 1: View current menu selection handler**

Run: `sed -n '599,669p' packages/desktop-client/src/components/mobile/transactions/TransactionList.tsx`

Expected output shows the `onMenuSelect` switch statement in the "More options" Popover

**Step 2: Identify where to add handler**

Find the switch statement inside `onMenuSelect` that handles `'link-schedule'`, `'delete'`, etc. (around line 612-668).

**Step 3: Add create-rule handler**

Find the section with other action handlers (like `'link-schedule'` around line 612). Add the create-rule handler:

```typescript
} else if (type === 'create-rule') {
  onCreateRule?.({
    ids: selectedTransactionsArray,
  });
```

Insert this right before the closing brace of the menu selection switch, after the 'merge' handler.

**Step 4: Verify onCreateRule prop exists**

View the component's prop types (look for the function signature or prop interface for `SelectedTransactionsFloatingActionBar`). Confirm it receives `onCreateRule` as a prop. If not, add it:

```typescript
onCreateRule?: (params: { ids: string[] }) => void;
```

**Step 5: Verify syntax**

Run: `cd packages/desktop-client && npx tsc --noEmit`

Expected: No errors

**Step 6: Commit**

```bash
git add packages/desktop-client/src/components/mobile/transactions/TransactionList.tsx
git commit -m "feat(mobile-parity): add create-rule action handler in transaction menu"
```

---

## Task 6: Write Unit Test for Conditional Menu Item

**Files:**
- Create: `packages/desktop-client/src/components/mobile/transactions/__tests__/TransactionList.test.tsx`

**Step 1: Create test file**

Create new file: `packages/desktop-client/src/components/mobile/transactions/__tests__/TransactionList.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { SelectedTransactionsFloatingActionBar } from '../TransactionList';

// Mock the feature flag hook
vi.mock('@desktop-client/hooks/useFeatureFlag', () => ({
  useFeatureFlag: vi.fn((flag) => {
    if (flag === 'mobileParity') {
      return true; // Test with flag enabled
    }
    return false;
  }),
}));

describe('SelectedTransactionsFloatingActionBar', () => {
  it('should show "Create rule" option when mobileParity flag is enabled', () => {
    const mockOnCreateRule = vi.fn();
    const mockOnBatchLinkSchedule = vi.fn();
    const mockOnBatchDuplicate = vi.fn();
    const mockOnBatchDelete = vi.fn();

    render(
      <SelectedTransactionsFloatingActionBar
        selectedTransactions={new Map([['tx1', true]])}
        onCreateRule={mockOnCreateRule}
        onBatchLinkSchedule={mockOnBatchLinkSchedule}
        onBatchDuplicate={mockOnBatchDuplicate}
        onBatchDelete={mockOnBatchDelete}
        onBatchUnlinkSchedule={() => {}}
        onMerge={() => {}}
        onSetTransfer={() => {}}
        dispatchSelected={() => {}}
        allTransactionsAreLinked={false}
      />
    );

    // Open more options menu
    const moreButton = screen.getByLabelText('More options');
    fireEvent.click(moreButton);

    // Verify "Create rule" appears
    expect(screen.getByText('Create rule')).toBeInTheDocument();
  });

  it('should hide "Create rule" option when mobileParity flag is disabled', () => {
    // Mock with flag disabled
    vi.mock('@desktop-client/hooks/useFeatureFlag', () => ({
      useFeatureFlag: vi.fn(() => false),
    }));

    const mockOnCreateRule = vi.fn();
    const mockOnBatchLinkSchedule = vi.fn();
    const mockOnBatchDuplicate = vi.fn();
    const mockOnBatchDelete = vi.fn();

    render(
      <SelectedTransactionsFloatingActionBar
        selectedTransactions={new Map([['tx1', true]])}
        onCreateRule={mockOnCreateRule}
        onBatchLinkSchedule={mockOnBatchLinkSchedule}
        onBatchDuplicate={mockOnBatchDuplicate}
        onBatchDelete={mockOnBatchDelete}
        onBatchUnlinkSchedule={() => {}}
        onMerge={() => {}}
        onSetTransfer={() => {}}
        dispatchSelected={() => {}}
        allTransactionsAreLinked={false}
      />
    );

    // Open more options menu
    const moreButton = screen.getByLabelText('More options');
    fireEvent.click(moreButton);

    // Verify "Create rule" does NOT appear
    expect(screen.queryByText('Create rule')).not.toBeInTheDocument();
  });

  it('should call onCreateRule when create-rule menu item is clicked', () => {
    const mockOnCreateRule = vi.fn();
    const mockOnBatchLinkSchedule = vi.fn();
    const mockOnBatchDuplicate = vi.fn();
    const mockOnBatchDelete = vi.fn();
    const selectedTxIds = ['tx1', 'tx2'];

    render(
      <SelectedTransactionsFloatingActionBar
        selectedTransactions={new Map(selectedTxIds.map(id => [id, true]))}
        onCreateRule={mockOnCreateRule}
        onBatchLinkSchedule={mockOnBatchLinkSchedule}
        onBatchDuplicate={mockOnBatchDuplicate}
        onBatchDelete={mockOnBatchDelete}
        onBatchUnlinkSchedule={() => {}}
        onMerge={() => {}}
        onSetTransfer={() => {}}
        dispatchSelected={() => {}}
        allTransactionsAreLinked={false}
      />
    );

    // Open more options menu
    const moreButton = screen.getByLabelText('More options');
    fireEvent.click(moreButton);

    // Click "Create rule"
    const createRuleButton = screen.getByText('Create rule');
    fireEvent.click(createRuleButton);

    // Verify handler was called with correct IDs
    expect(mockOnCreateRule).toHaveBeenCalledWith({
      ids: selectedTxIds,
    });
  });
});
```

**Step 2: Run tests to verify they work**

Run: `cd packages/desktop-client && npm test -- TransactionList.test.tsx`

Expected: All 3 tests pass (or mark as skip if infrastructure issues)

**Step 3: Commit**

```bash
git add packages/desktop-client/src/components/mobile/transactions/__tests__/TransactionList.test.tsx
git commit -m "test(mobile-parity): add unit tests for create-rule menu item"
```

---

## Task 7: Update FORK_NOTES.md with New Feature Documentation

**Files:**
- Modify: `FORK_NOTES.md`

**Step 1: View current FORK_NOTES.md**

Run: `head -100 FORK_NOTES.md`

Expected: Shows existing fork documentation structure

**Step 2: Add mobileParity section**

Add a new section documenting the mobileParity flag. Insert after other feature flag documentation:

```markdown
## Mobile Parity Features (mobileParity flag)

**Purpose:** Enable features in mobile web client that the desktop web client has.

**When added:** 2026-01-01

**Features gated by this flag:**
- Create rule action in mobile transaction menu (Phase 1)

**Future features planned:**
- Additional transaction actions
- Other mobile parity features as identified

**How to enable for testing:**
1. Open Settings → Experimental Features
2. Check "Mobile parity features"
3. Return to mobile transaction list
4. Select one or more transactions
5. Tap "..." (More options) button
6. "Create rule" should appear in menu (if not, flag may not be enabled)

**Implementation notes:**
- Flag is defined in `packages/loot-core/src/types/prefs.ts`
- Default state set in `packages/desktop-client/src/hooks/useFeatureFlag.ts`
- UI toggle in `packages/desktop-client/src/components/settings/Experimental.tsx`
- Mobile menu conditional in `packages/desktop-client/src/components/mobile/transactions/TransactionList.tsx`
- Reuses existing desktop rule creation logic (no new business logic)
```

**Step 3: Verify formatting**

Run: `cat FORK_NOTES.md | tail -30`

Expected: Shows the new section properly formatted

**Step 4: Commit**

```bash
git add FORK_NOTES.md
git commit -m "docs: add mobile parity flag documentation to FORK_NOTES"
```

---

## Task 8: Final Verification and Manual Testing

**Files:**
- No modifications, verification only

**Step 1: Verify all changes are committed**

Run: `git status`

Expected: `working tree clean`

**Step 2: View full commit history for this feature**

Run: `git log --oneline origin/integration..HEAD`

Expected: Shows all 7 commits for this feature in order

**Step 3: Manual test - flag disabled (default)**

Run: `cd packages/desktop-client && npm run dev`

1. Open app in browser
2. Navigate to mobile transactions
3. Select transactions
4. Tap "..." (More options)
5. Verify "Create rule" is NOT in menu (flag defaults to false)

**Step 4: Manual test - flag enabled**

1. Navigate to Settings → Experimental Features
2. Check "Mobile parity features"
3. Return to mobile transactions
4. Select transactions again
5. Tap "..." (More options)
6. Verify "Create rule" IS in menu now

**Step 5: Manual test - create rule action**

1. With flag enabled, select 1-2 transactions
2. Tap "..." → "Create rule"
3. Verify rule editor modal opens with pre-filled data from selected transactions

**Step 6: Final commit summary**

Run: `git log --oneline -8`

Expected output:
```
<latest> docs: add mobile parity flag documentation to FORK_NOTES
<-1>    test(mobile-parity): add unit tests for create-rule menu item
<-2>    feat(mobile-parity): add create-rule action handler in transaction menu
<-3>    feat(mobile-parity): add conditional create-rule menu item to transaction menu
<-4>    feat(mobile-parity): add mobileParity toggle to experimental settings
<-5>    feat(mobile-parity): add mobileParity to default feature flag state
<-6>    feat(mobile-parity): add mobileParity flag to type definition
<-7>    docs: add mobile parity feature flag design
```

---

## Success Criteria Checklist

- [ ] All type definitions compile without errors
- [ ] All feature flag state is properly defined
- [ ] Experimental settings toggle is visible and toggleable
- [ ] "Create rule" menu item appears when flag is enabled
- [ ] "Create rule" menu item hidden when flag is disabled
- [ ] Clicking "Create rule" invokes the correct handler
- [ ] Rule editor opens with correct transaction IDs
- [ ] All unit tests pass
- [ ] FORK_NOTES.md is updated with feature documentation
- [ ] All changes are committed to feature branch
- [ ] Working tree is clean
