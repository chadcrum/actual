# Pinned Categories Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to pin individual budget categories from the balance modal, displaying them in a new widget on the mobile overview page with persistent cross-device syncing.

**Architecture:** Data layer stores pinned category IDs in user preferences (syncing via existing Actual mechanism). UI components reuse existing mobile table styling and category ordering logic. Feature is gated by existing `enableOverviewPage` flag, requiring no new flags.

**Tech Stack:** React hooks, TypeScript, Redux (existing preference management), mobile table components from Actual

---

## Phase 1: Data Layer - Preference Type & Hook

### Task 1: Add pinnedCategoryIds to Preference Types

**Files:**

- Modify: `packages/loot-core/src/types/prefs.ts`

**Step 1: Examine current preference types**

Run: `grep -A 10 "export type.*Prefs\|export interface.*Prefs" packages/loot-core/src/types/prefs.ts | head -30`

Look for how other preferences are defined (boolean flags, strings, arrays, etc.)

**Step 2: Add pinnedCategoryIds type definition**

Find the existing preferences type and add this field:

```typescript
// In the preferences type definition
pinnedCategoryIds?: string[];
```

Example location might be around line 50-100. Add it near other optional preference fields.

**Step 3: Verify syntax and type correctness**

Run: `npm run type-check --workspace loot-core`

Expected: No type errors

**Step 4: Commit**

```bash
git add packages/loot-core/src/types/prefs.ts
git commit -m "feat: add pinnedCategoryIds preference type"
```

---

### Task 2: Create usePinnedCategories Hook

**Files:**

- Create: `packages/desktop-client/src/components/budget/hooks/usePinnedCategories.ts`
- Test: `packages/desktop-client/src/components/budget/hooks/usePinnedCategories.test.ts`

**Step 1: Write the test file**

Create `packages/desktop-client/src/components/budget/hooks/usePinnedCategories.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { usePreferences } from '../../../hooks/usePreferences';
import { usePinnedCategories } from './usePinnedCategories';

// Mock usePreferences
jest.mock('../../../hooks/usePreferences');

describe('usePinnedCategories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns empty array when no categories pinned', () => {
    (usePreferences as jest.Mock).mockReturnValue({
      pinnedCategoryIds: undefined,
      savePreferences: jest.fn(),
    });

    const { result } = renderHook(() => usePinnedCategories());

    expect(result.current.pinnedCategoryIds).toEqual([]);
  });

  test('isPinned returns true for pinned category', () => {
    (usePreferences as jest.Mock).mockReturnValue({
      pinnedCategoryIds: ['cat-1', 'cat-2'],
      savePreferences: jest.fn(),
    });

    const { result } = renderHook(() => usePinnedCategories());

    expect(result.current.isPinned('cat-1')).toBe(true);
    expect(result.current.isPinned('cat-3')).toBe(false);
  });

  test('togglePin adds category to pinned list', () => {
    const mockSavePreferences = jest.fn();
    (usePreferences as jest.Mock).mockReturnValue({
      pinnedCategoryIds: ['cat-1'],
      savePreferences: mockSavePreferences,
    });

    const { result } = renderHook(() => usePinnedCategories());

    act(() => {
      result.current.togglePin('cat-2');
    });

    expect(mockSavePreferences).toHaveBeenCalledWith({
      pinnedCategoryIds: ['cat-1', 'cat-2'],
    });
  });

  test('togglePin removes category from pinned list', () => {
    const mockSavePreferences = jest.fn();
    (usePreferences as jest.Mock).mockReturnValue({
      pinnedCategoryIds: ['cat-1', 'cat-2'],
      savePreferences: mockSavePreferences,
    });

    const { result } = renderHook(() => usePinnedCategories());

    act(() => {
      result.current.togglePin('cat-1');
    });

    expect(mockSavePreferences).toHaveBeenCalledWith({
      pinnedCategoryIds: ['cat-2'],
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- usePinnedCategories.test.ts`

Expected: FAIL - usePinnedCategories is not exported from ./usePinnedCategories

**Step 3: Implement the hook**

Create `packages/desktop-client/src/components/budget/hooks/usePinnedCategories.ts`:

```typescript
import { useCallback, useMemo } from 'react';
import { usePreferences } from '../../../hooks/usePreferences';
import { useCategories } from '../../../hooks/useCategories';

export function usePinnedCategories() {
  const { pinnedCategoryIds = [], savePreferences } = usePreferences();
  const categories = useCategories();

  const isPinned = useCallback(
    (categoryId: string) => {
      return pinnedCategoryIds.includes(categoryId);
    },
    [pinnedCategoryIds]
  );

  const togglePin = useCallback(
    (categoryId: string) => {
      const isCurrentlyPinned = pinnedCategoryIds.includes(categoryId);
      const newPinnedIds = isCurrentlyPinned
        ? pinnedCategoryIds.filter((id) => id !== categoryId)
        : [...pinnedCategoryIds, categoryId];

      savePreferences({ pinnedCategoryIds: newPinnedIds });
    },
    [pinnedCategoryIds, savePreferences]
  );

  const getPinnedCategories = useCallback(() => {
    if (!categories) return [];

    // Filter categories to only pinned ones, maintaining budget page order
    return categories.filter((cat) => pinnedCategoryIds.includes(cat.id));
  }, [categories, pinnedCategoryIds]);

  return {
    pinnedCategoryIds,
    isPinned,
    togglePin,
    getPinnedCategories,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- usePinnedCategories.test.ts`

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add packages/desktop-client/src/components/budget/hooks/usePinnedCategories.ts packages/desktop-client/src/components/budget/hooks/usePinnedCategories.test.ts
git commit -m "feat: add usePinnedCategories hook for managing pinned category state"
```

---

## Phase 2: UI Components - PinnedCategoriesTable Widget

### Task 3: Create PinnedCategoriesTable Component

**Files:**

- Create: `packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.tsx`
- Test: `packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.test.tsx`

**Step 1: Write the test file**

Create `packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { PinnedCategoriesTable } from './PinnedCategoriesTable';
import { usePinnedCategories } from '../../budget/hooks/usePinnedCategories';

jest.mock('../../budget/hooks/usePinnedCategories');

describe('PinnedCategoriesTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays empty state when no categories pinned', () => {
    (usePinnedCategories as jest.Mock).mockReturnValue({
      getPinnedCategories: () => [],
    });

    render(<PinnedCategoriesTable onCategoryClick={jest.fn()} />);

    expect(screen.getByText('Pinned Categories')).toBeInTheDocument();
    expect(
      screen.getByText(/No pinned categories/)
    ).toBeInTheDocument();
  });

  test('displays pinned categories in table format', () => {
    (usePinnedCategories as jest.Mock).mockReturnValue({
      getPinnedCategories: () => [
        { id: 'cat-1', name: 'Groceries', balance: 150.5 },
        { id: 'cat-2', name: 'Utilities', balance: -25.0 },
      ],
    });

    render(<PinnedCategoriesTable onCategoryClick={jest.fn()} />);

    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Utilities')).toBeInTheDocument();
  });

  test('calls onCategoryClick when category row is clicked', () => {
    const mockOnClick = jest.fn();
    (usePinnedCategories as jest.Mock).mockReturnValue({
      getPinnedCategories: () => [
        { id: 'cat-1', name: 'Groceries', balance: 150.5 },
      ],
    });

    const { container } = render(
      <PinnedCategoriesTable onCategoryClick={mockOnClick} />
    );

    const row = container.querySelector('[data-testid="category-row-cat-1"]');
    row?.click();

    expect(mockOnClick).toHaveBeenCalledWith('cat-1');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- PinnedCategoriesTable.test.tsx`

Expected: FAIL - PinnedCategoriesTable is not exported

**Step 3: Implement the component**

Create `packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.tsx`:

```typescript
import React from 'react';
import { usePinnedCategories } from '../../budget/hooks/usePinnedCategories';
import { formatCurrency } from '../../../util/format';
import { getCategoryColor } from '../../../util/budgetColors';
import s from './PinnedCategoriesTable.module.css';

interface PinnedCategoriesTableProps {
  onCategoryClick: (categoryId: string) => void;
}

export function PinnedCategoriesTable({
  onCategoryClick,
}: PinnedCategoriesTableProps) {
  const { getPinnedCategories } = usePinnedCategories();
  const pinnedCategories = getPinnedCategories();

  if (pinnedCategories.length === 0) {
    return (
      <div className={s.container}>
        <h2 className={s.title}>Pinned Categories</h2>
        <div className={s.emptyState}>
          No pinned categories. Pin categories from the budget page to see
          them here.
        </div>
      </div>
    );
  }

  return (
    <div className={s.container}>
      <h2 className={s.title}>Pinned Categories</h2>
      <div className={s.table}>
        {pinnedCategories.map((category) => {
          const color = getCategoryColor(category);
          return (
            <div
              key={category.id}
              className={s.row}
              onClick={() => onCategoryClick(category.id)}
              data-testid={`category-row-${category.id}`}
            >
              <div className={s.categoryName}>{category.name}</div>
              <div className={s.balance} style={{ color }}>
                {formatCurrency(category.balance)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 4: Create stylesheet**

Create `packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.module.css`:

```css
.container {
  margin-top: 20px;
  margin-bottom: 20px;
  padding: 0;
}

.title {
  font-size: 18px;
  font-weight: 500;
  margin: 0 0 12px 0;
  padding: 0 16px;
  color: var(--color-text);
}

.table {
  border: 1px solid var(--color-border);
  border-radius: 4px;
  overflow: hidden;
  margin: 0 16px;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  user-select: none;
}

.row:last-child {
  border-bottom: none;
}

.row:active {
  background-color: var(--color-background-hover);
}

.categoryName {
  flex: 1;
  font-size: 14px;
  color: var(--color-text);
  text-align: left;
}

.balance {
  font-size: 14px;
  font-weight: 500;
  text-align: right;
  min-width: 80px;
}

.emptyState {
  padding: 24px 16px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  margin: 0 16px;
  background-color: var(--color-background-secondary);
}
```

**Step 5: Run tests to verify they pass**

Run: `npm test -- PinnedCategoriesTable.test.tsx`

Expected: PASS (all tests)

**Step 6: Commit**

```bash
git add packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.tsx packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.test.tsx packages/desktop-client/src/components/mobile/overview/PinnedCategoriesTable.module.css
git commit -m "feat: add PinnedCategoriesTable widget component with empty state"
```

---

## Phase 3: Balance Modal - Add Pin Checkbox

### Task 4: Modify Balance Modal to Add Pin Checkbox

**Files:**

- Modify: `packages/desktop-client/src/components/mobile/budget/BalanceMenu.tsx` (or appropriate balance modal file)
- Test: Update existing balance modal tests

**Step 1: Examine balance modal component**

Run: `find packages/desktop-client/src/components -name "*alance*" -o -name "*odal*" | grep -i budget`

Look for the component that renders the balance modal. Common names: `BalanceMenu.tsx`, `CategoryBalance.tsx`, `BudgetCategoryModal.tsx`

Once found, examine the structure:

Run: `head -50 packages/desktop-client/src/components/mobile/budget/<BalanceComponent>.tsx`

**Step 2: Understand current modal structure**

Look for:

- Where "Cover overspending" and "Rollover overspending" buttons are rendered
- How the modal handles layout and sections
- Existing imports and hook usage

**Step 3: Add usePinnedCategories hook import**

In the balance modal component, add:

```typescript
import { usePinnedCategories } from '../hooks/usePinnedCategories';
```

(Adjust path if the hook location differs)

**Step 4: Add hook usage in component**

Inside the component function, add:

```typescript
const { isPinned, togglePin } = usePinnedCategories();
const overviewEnabled = useFeatureFlag('enableOverviewPage');
```

**Step 5: Add checkbox JSX**

Find where the action buttons are rendered ("Cover overspending", etc.) and add this after those buttons:

```typescript
{overviewEnabled && (
  <div className={s.checkboxContainer}>
    <input
      type="checkbox"
      id="pin-to-overview"
      checked={isPinned(category.id)}
      onChange={() => togglePin(category.id)}
      className={s.checkbox}
    />
    <label htmlFor="pin-to-overview" className={s.checkboxLabel}>
      Pin to Overview
    </label>
  </div>
)}
```

**Step 6: Add styles for checkbox**

In the balance modal stylesheet, add:

```css
.checkboxContainer {
  display: flex;
  align-items: center;
  padding: 16px;
  border-top: 1px solid var(--color-border);
  margin-top: 8px;
}

.checkbox {
  width: 18px;
  height: 18px;
  margin-right: 8px;
  cursor: pointer;
}

.checkboxLabel {
  font-size: 14px;
  color: var(--color-text);
  cursor: pointer;
  user-select: none;
}
```

**Step 7: Run tests**

Run: `npm test -- balance modal component tests`

Expected: PASS (existing tests should still pass)

**Step 8: Commit**

```bash
git add packages/desktop-client/src/components/mobile/budget/<BalanceComponent>.tsx
git commit -m "feat: add pin checkbox to balance modal when overview page enabled"
```

---

## Phase 4: Integration - Overview Page & Testing

### Task 5: Integrate PinnedCategoriesTable into Overview Page

**Files:**

- Modify: `packages/desktop-client/src/components/mobile/overview/OverviewPage.tsx`
- Modify: `packages/desktop-client/src/components/mobile/overview/MobileRoutes.tsx` (if balance modal is opened from overview)

**Step 1: Add PinnedCategoriesTable import**

In `OverviewPage.tsx`, add:

```typescript
import { PinnedCategoriesTable } from './PinnedCategoriesTable';
```

**Step 2: Import useNavigate hook**

```typescript
import { useNavigate } from 'react-router-dom';
```

**Step 3: Create handler for category click**

Inside the OverviewPage component, add:

```typescript
const navigate = useNavigate();

const handleCategoryClick = (categoryId: string) => {
  // Navigate to budget page and pass category ID to open its balance modal
  navigate('/budget', { state: { openBalanceModal: categoryId } });
};
```

(Adjust this based on how the app currently handles navigation to modals)

**Step 4: Add component to render**

Find where `<BudgetSummaryTable />` is rendered and add below it:

```typescript
<PinnedCategoriesTable onCategoryClick={handleCategoryClick} />
```

**Step 5: Test the integration**

Run: `npm test -- OverviewPage.test.tsx`

Expected: PASS

Run the dev server and manually test:

```bash
npm run dev
# Navigate to overview page
# Verify Budget Summary table appears
# Verify Pinned Categories table appears below it with empty state
```

**Step 6: Commit**

```bash
git add packages/desktop-client/src/components/mobile/overview/OverviewPage.tsx
git commit -m "feat: integrate PinnedCategoriesTable into overview page layout"
```

---

### Task 6: Cross-Component Integration Testing

**Files:**

- Create: `packages/desktop-client/src/components/mobile/overview/integration.test.tsx`

**Step 1: Write end-to-end flow test**

Create `packages/desktop-client/src/components/mobile/overview/integration.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { OverviewPage } from './OverviewPage';
import { usePreferences } from '../../../hooks/usePreferences';

jest.mock('../../../hooks/usePreferences');
jest.mock('../../../hooks/useCategories');
jest.mock('../../../hooks/useFeatureFlag', () => ({
  useFeatureFlag: (flag: string) => flag === 'enableOverviewPage',
}));

describe('Pinned Categories Integration', () => {
  test('displays empty state initially, then shows pinned category after pinning', async () => {
    const mockPreferences = {
      pinnedCategoryIds: [],
      savePreferences: jest.fn(),
    };

    (usePreferences as jest.Mock).mockReturnValue(mockPreferences);

    const { rerender } = render(
      <BrowserRouter>
        <OverviewPage />
      </BrowserRouter>
    );

    // Initially should show empty state
    expect(
      screen.getByText(/No pinned categories/)
    ).toBeInTheDocument();

    // Simulate pinning a category
    mockPreferences.pinnedCategoryIds = ['cat-1'];
    mockPreferences.savePreferences.mockImplementation((prefs) => {
      mockPreferences.pinnedCategoryIds = prefs.pinnedCategoryIds;
    });

    rerender(
      <BrowserRouter>
        <OverviewPage />
      </BrowserRouter>
    );

    // Should show the pinned category
    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument();
    });
  });
});
```

**Step 2: Run integration tests**

Run: `npm test -- integration.test.tsx`

Expected: PASS

**Step 3: Commit**

```bash
git add packages/desktop-client/src/components/mobile/overview/integration.test.tsx
git commit -m "test: add integration tests for pinned categories flow"
```

---

### Task 7: Update FORK_NOTES.md Documentation

**Files:**

- Modify: `FORK_NOTES.md` or `integration/FORK_NOTES.md`

**Step 1: Examine current FORK_NOTES**

Run: `head -50 FORK_NOTES.md`

**Step 2: Add new section for Pinned Categories feature**

Add this section to the document:

```markdown
## Feature: Pinned Categories (enableOverviewPage)

### Purpose
Allow users to quickly access key budget categories from the mobile overview page by pinning them from individual category balance modals.

### Implementation Details

**Data Storage:** User preferences via `pinnedCategoryIds` (string array)
- Location: `packages/loot-core/src/types/prefs.ts`
- Syncs across devices via standard Actual preference mechanism
- Defaults to empty array

**New Components:**
- `usePinnedCategories()` hook: Manages pin state and provides category data
- `PinnedCategoriesTable`: Widget component displaying pinned categories below Budget Summary
- Balance modal checkbox: Allows users to pin/unpin from category details

**Modified Files:**
- `packages/desktop-client/src/components/mobile/overview/OverviewPage.tsx`: Integrates PinnedCategoriesTable widget
- `packages/desktop-client/src/components/mobile/budget/BalanceMenu.tsx`: Adds pin/unpin checkbox
- `packages/loot-core/src/types/prefs.ts`: Adds pinnedCategoryIds preference type

**Feature Flag:** Uses existing `enableOverviewPage` flag
- When disabled: No pin/unpin UI or pinned categories widget appears
- Backward compatible: No changes to existing budget behavior

**Design Rationale:**
- Minimal, additive changes following AGENTS-chad-fork.md principles
- Single seam point at layout boundary (overview page)
- Reuses existing category ordering and preference systems
- No limits on pinned categories gives users maximum flexibility
```

**Step 3: Commit**

```bash
git add FORK_NOTES.md
git commit -m "docs: document pinned categories feature in FORK_NOTES"
```

---

## Phase 5: Final Verification

### Task 8: Run Full Test Suite

**Step 1: Run all tests for modified packages**

Run: `npm test -- --testPathPattern="(budget|overview)" --coverage`

Expected: All tests pass with >80% coverage for new components

**Step 2: Run type checking**

Run: `npm run type-check`

Expected: No type errors

**Step 3: Run linting**

Run: `npm run lint`

Expected: No linting errors (may have warnings that can be ignored)

**Step 4: Manual testing checklist**

With dev server running:

- [ ] Navigate to overview page
- [ ] Verify Budget Summary table displays correctly
- [ ] Verify Pinned Categories widget shows empty state
- [ ] Go to Budget page
- [ ] Click on a category balance
- [ ] Verify balance modal opens
- [ ] Verify "Pin to Overview" checkbox appears at bottom
- [ ] Check the checkbox
- [ ] Close modal
- [ ] Return to overview page
- [ ] Verify pinned category appears in Pinned Categories table
- [ ] Verify balance is displayed correctly
- [ ] Verify color coding matches budget page
- [ ] Click on pinned category in widget
- [ ] Verify balance modal opens for that category
- [ ] Verify checkbox is checked
- [ ] Uncheck checkbox
- [ ] Close modal
- [ ] Return to overview page
- [ ] Verify category no longer appears in Pinned Categories table
- [ ] Refresh page
- [ ] Verify pinned state persists

**Step 5: Final commit**

If all tests pass:

```bash
git log --oneline -8
# Should see all pinned categories feature commits
```

---

## Success Criteria Verification

After completing all tasks:

- [ ] `pinnedCategoryIds` preference type defined in prefs.ts
- [ ] `usePinnedCategories()` hook fully implemented and tested
- [ ] `PinnedCategoriesTable` widget displays correctly
- [ ] Empty state shows when no categories pinned
- [ ] Pin/unpin checkbox appears in balance modal when flag enabled
- [ ] Pinned categories display in budget page order
- [ ] Balance values show with goal-based color coding
- [ ] Clicking pinned category opens balance modal
- [ ] Feature is gated by `enableOverviewPage` flag
- [ ] All tests pass (unit, integration, manual)
- [ ] No TypeScript errors
- [ ] FORK_NOTES.md updated
- [ ] All changes committed with clear commit messages
