# Pinned Budget Categories Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to pin budget categories to the mobile home page for quick access to critical categories, with drag-to-reorder and persistent storage.

**Architecture:** Add a layout-level seam in `MobileSummaryPage` that conditionally renders `PinnedCategoriesSection` below the existing budget summary table. Pinned categories are stored in user prefs via `useSyncedPref`. The pin/unpin toggle is added to the existing category modal. Categories can be reordered via drag-and-drop using `react-beautiful-dnd` (already a dependency).

**Tech Stack:** React, TypeScript, react-beautiful-dnd, useSyncedPref (existing hook), useSheetValue (existing hook)

---

## Task 1: Add Feature Flag in loot-core

**Files:**

- Modify: `packages/loot-core/src/featureFlags.ts`

**Step 1: Read the feature flags file**

Read: `packages/loot-core/src/featureFlags.ts`

**Step 2: Add the feature flag**

Add to the `defaultFeatureFlags` object:

```ts
enablePinnedCategories: false,
```

**Step 3: Run typecheck**

Run: `yarn typecheck`
Expected: All strict files pass

**Step 4: Commit**

```bash
git add packages/loot-core/src/featureFlags.ts
git commit -m "feat: add enablePinnedCategories feature flag"
```

---

## Task 2: Create Preference Hook for Pinned Categories

**Files:**

- Create: `packages/desktop-client/src/hooks/usePinnedCategories.ts`

**Step 1: Write the hook implementation**

Create the file with:

```ts
import { useSyncedPref } from './useSyncedPref';

export type PinnedCategoriesPreference = {
  ids: string[];
  order: string[];
};

const DEFAULT_PINNED: PinnedCategoriesPreference = {
  ids: [],
  order: [],
};

export function usePinnedCategories() {
  const [pinnedPref, setPinnedPref] = useSyncedPref(
    'pinnedCategories',
    DEFAULT_PINNED,
  );

  // Ensure order contains only valid IDs and all IDs are in order
  const validated = {
    ids: pinnedPref?.ids ?? [],
    order: (pinnedPref?.order ?? []).filter(id =>
      (pinnedPref?.ids ?? []).includes(id)
    ),
  };

  const togglePin = (categoryId: string) => {
    const isCurrentlyPinned = validated.ids.includes(categoryId);

    if (isCurrentlyPinned) {
      // Remove from pinned
      setPinnedPref({
        ids: validated.ids.filter(id => id !== categoryId),
        order: validated.order.filter(id => id !== categoryId),
      });
    } else {
      // Add to pinned
      setPinnedPref({
        ids: [...validated.ids, categoryId],
        order: [...validated.order, categoryId],
      });
    }
  };

  const reorder = (newOrder: string[]) => {
    setPinnedPref({
      ids: validated.ids,
      order: newOrder,
    });
  };

  return {
    pinnedIds: validated.ids,
    order: validated.order,
    isPinned: (categoryId: string) => validated.ids.includes(categoryId),
    togglePin,
    reorder,
  };
}
```

**Step 2: Run typecheck**

Run: `yarn typecheck`
Expected: All strict files pass

**Step 3: Commit**

```bash
git add packages/desktop-client/src/hooks/usePinnedCategories.ts
git commit -m "feat: add usePinnedCategories hook for preference management"
```

---

## Task 3: Create PinnedCategoryRow Component

**Files:**

- Create: `packages/desktop-client/src/components/mobile/summary/PinnedCategoryRow.tsx`

**Step 1: Write the component**

Create the file with:

```tsx
import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Block } from '@actual-app/components/block';
import { Icon } from '@actual-app/components/icon';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { type UseFormatResult } from '@desktop-client/hooks/useFormat';

type PinnedCategoryRowProps = {
  categoryId: string;
  categoryName: string;
  balance: number;
  format: UseFormatResult;
  index: number;
};

export function PinnedCategoryRow({
  categoryId,
  categoryName,
  balance,
  format,
  index,
}: PinnedCategoryRowProps) {
  return (
    <Draggable draggableId={categoryId} index={index}>
      {(provided, snapshot) => (
        <View
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={{
            paddingTop: 6,
            paddingBottom: 6,
            backgroundColor: snapshot.isDragging
              ? theme.buttonBackground
              : undefined,
            ...provided.draggableProps.style,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottomWidth: 1,
              borderBottomColor: theme.tableBorder,
              paddingBottom: 0,
            }}
          >
            <View
              {...provided.dragHandleProps}
              style={{
                cursor: 'grab',
                marginRight: 8,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Icon name="draggable" size={16} color={theme.pageText} />
            </View>
            <Block style={{ fontSize: 16, fontWeight: 500, flex: 1 }}>
              {categoryName}
            </Block>
            <PrivacyFilter>
              <Block
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: balance < 0 ? theme.warningText : undefined,
                }}
              >
                {format(Math.abs(balance), 'financial')}
              </Block>
            </PrivacyFilter>
          </View>
        </View>
      )}
    </Draggable>
  );
}
```

**Step 2: Run typecheck**

Run: `yarn typecheck`
Expected: All strict files pass

**Step 3: Commit**

```bash
git add packages/desktop-client/src/components/mobile/summary/PinnedCategoryRow.tsx
git commit -m "feat: create PinnedCategoryRow component for displaying pinned categories"
```

---

## Task 4: Create PinnedCategoriesSection Component

**Files:**

- Create: `packages/desktop-client/src/components/mobile/summary/PinnedCategoriesSection.tsx`

**Step 1: Write the component**

Create the file with:

```tsx
import React, { useMemo } from 'react';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { Trans, useTranslation } from 'react-i18next';
import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { PinnedCategoryRow } from './PinnedCategoryRow';
import { type UseFormatResult } from '@desktop-client/hooks/useFormat';

type CategoryBalance = {
  categoryId: string;
  name: string;
  balance: number;
};

type PinnedCategoriesSectionProps = {
  categoryBalances: CategoryBalance[];
  order: string[];
  format: UseFormatResult;
  onReorder: (newOrder: string[]) => void;
};

export function PinnedCategoriesSection({
  categoryBalances,
  order,
  format,
  onReorder,
}: PinnedCategoriesSectionProps) {
  const { t } = useTranslation();

  // Sort category balances by the order array
  const sortedBalances = useMemo(() => {
    return order
      .map(id => categoryBalances.find(cb => cb.categoryId === id))
      .filter((cb): cb is CategoryBalance => cb !== undefined);
  }, [categoryBalances, order]);

  const handleDragEnd = (result: any) => {
    const { source, destination, draggableId } = result;

    // If dropped outside droppable area
    if (!destination) {
      return;
    }

    // If dropped in same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Calculate new order
    const newOrder = Array.from(order);
    newOrder.splice(source.index, 1);
    newOrder.splice(destination.index, 0, draggableId);

    onReorder(newOrder);
  };

  if (sortedBalances.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        padding: 16,
        backgroundColor: theme.mobilePageBackground,
      }}
    >
      <View
        style={{
          paddingLeft: 96,
          paddingRight: 96,
        }}
      >
        <Block
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 16,
            color: theme.pageText,
          }}
        >
          <Trans>Pinned Categories</Trans>
        </Block>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="pinned-categories">
            {(provided, snapshot) => (
              <View
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  backgroundColor: snapshot.isDraggingOver
                    ? theme.buttonBackground
                    : undefined,
                }}
              >
                {sortedBalances.map((balance, index) => (
                  <PinnedCategoryRow
                    key={balance.categoryId}
                    categoryId={balance.categoryId}
                    categoryName={balance.name}
                    balance={balance.balance}
                    format={format}
                    index={index}
                  />
                ))}
                {provided.placeholder}
              </View>
            )}
          </Droppable>
        </DragDropContext>
      </View>
    </View>
  );
}
```

**Step 2: Run typecheck**

Run: `yarn typecheck`
Expected: All strict files pass

**Step 3: Commit**

```bash
git add packages/desktop-client/src/components/mobile/summary/PinnedCategoriesSection.tsx
git commit -m "feat: create PinnedCategoriesSection component with drag-and-drop support"
```

---

## Task 5: Integrate PinnedCategoriesSection into MobileSummaryPage

**Files:**

- Modify: `packages/desktop-client/src/components/mobile/summary/MobileSummaryPage.tsx`

**Step 1: Read the existing file**

Read: `packages/desktop-client/src/components/mobile/summary/MobileSummaryPage.tsx`

**Step 2: Add necessary imports**

Add after the existing imports:

```tsx
import { usePinnedCategories } from '@desktop-client/hooks/usePinnedCategories';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { PinnedCategoriesSection } from './PinnedCategoriesSection';
```

Also import the feature flag check:

```tsx
import { useFeature } from '@desktop-client/hooks/useFeature';
```

**Step 3: Modify SummaryContent component**

Replace the `SummaryContent` function with:

```tsx
function SummaryContent({ month }: SummaryContentProps) {
  const format = useFormat();
  const budgeted = useSheetValue<
    'envelope-budget',
    typeof envelopeBudget.totalBudgeted
  >(envelopeBudget.totalBudgeted);
  const spent = useSheetValue<
    'envelope-budget',
    typeof envelopeBudget.totalSpent
  >(envelopeBudget.totalSpent);
  const goalTarget = useGoalTargetSum(month);
  const { underfunded } = useGoalFundingStatus(month);

  const summaryData: SummaryData = useMemo(
    () => ({
      budgeted: budgeted ?? 0,
      spent: spent ?? 0,
      goalTarget: goalTarget ?? 0,
      underfunded: underfunded ?? 0,
    }),
    [budgeted, spent, goalTarget, underfunded],
  );

  // Pinned categories feature
  const pinnedCategoriesEnabled = useFeature('enablePinnedCategories');
  const { pinnedIds, order, reorder } = usePinnedCategories();
  const allCategories = useCategories();

  const pinnedCategoryBalances = useMemo(() => {
    if (!pinnedCategoriesEnabled || pinnedIds.length === 0) {
      return [];
    }

    return pinnedIds
      .map(categoryId => {
        const category = allCategories.find(c => c.id === categoryId);
        if (!category) return null;

        // Get category balance from spreadsheet
        const balance = useSheetValue(
          `budget-summary:${categoryId}:available`,
        );

        return {
          categoryId,
          name: category.name,
          balance: balance ?? 0,
        };
      })
      .filter((cb): cb is typeof pinnedCategoryBalances[0] => cb !== null);
  }, [pinnedCategoriesEnabled, pinnedIds, allCategories]);

  return (
    <>
      <SummaryTable data={summaryData} format={format} />
      {pinnedCategoriesEnabled && (
        <PinnedCategoriesSection
          categoryBalances={pinnedCategoryBalances}
          order={order}
          format={format}
          onReorder={reorder}
        />
      )}
    </>
  );
}
```

**Step 4: Run typecheck**

Run: `yarn typecheck`
Expected: All strict files pass

**Step 5: Commit**

```bash
git add packages/desktop-client/src/components/mobile/summary/MobileSummaryPage.tsx
git commit -m "feat: integrate PinnedCategoriesSection into MobileSummaryPage"
```

---

## Task 6: Add Pin/Unpin Button to Category Modal

**Files:**

- Locate: `packages/desktop-client/src/components/mobile/budget/` (find category modal)
- Modify: Category modal component (exact path depends on current structure)

**Step 1: Find the category modal**

Run: `find packages/desktop-client/src/components/mobile/budget -name "*modal*" -o -name "*Modal*" | head -10`

Expected: Should find modal component for category selection

**Step 2: Read the modal component**

Read the modal file found above

**Step 3: Add pin button conditional rendering**

Add the following import:

```tsx
import { usePinnedCategories } from '@desktop-client/hooks/usePinnedCategories';
import { useFeature } from '@desktop-client/hooks/useFeature';
```

Inside the modal component, add:

```tsx
const pinnedCategoriesEnabled = useFeature('enablePinnedCategories');
const { isPinned, togglePin } = usePinnedCategories();
```

In the modal's action buttons section, add (conditionally):

```tsx
{pinnedCategoriesEnabled && (
  <Button
    onClick={() => togglePin(categoryId)}
    style={{
      backgroundColor: isPinned(categoryId) ? theme.warningBackground : undefined,
    }}
  >
    {isPinned(categoryId) ? t('Unpin') : t('Pin')}
  </Button>
)}
```

**Step 4: Run typecheck**

Run: `yarn typecheck`
Expected: All strict files pass

**Step 5: Commit**

```bash
git add <path-to-modal-component>
git commit -m "feat: add pin/unpin toggle to category modal"
```

---

## Task 7: Add i18n Translation Keys

**Files:**

- Modify: Translation files in `packages/desktop-client/src/locales/`

**Step 1: Find en.json translation file**

Run: `find packages/desktop-client/src -name "en.json" | grep -E "locale|i18n"`

**Step 2: Add translation keys**

Add the following keys to the English translation file:

```json
{
  "Pinned Categories": "Pinned Categories",
  "Pin": "Pin",
  "Unpin": "Unpin"
}
```

**Step 3: Run typecheck**

Run: `yarn typecheck`
Expected: All strict files pass

**Step 4: Commit**

```bash
git add packages/desktop-client/src/locales/en.json
git commit -m "feat: add translation keys for pinned categories"
```

---

## Task 8: Write Integration Tests

**Files:**

- Create: `packages/desktop-client/src/components/mobile/summary/PinnedCategories.test.tsx`

**Step 1: Write test file**

Create with:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PinnedCategoriesSection } from './PinnedCategoriesSection';
import { useFormat } from '@desktop-client/hooks/useFormat';

// Mock react-beautiful-dnd
jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }: any) => <div>{children}</div>,
  Droppable: ({ children }: any) =>
    children(
      {
        innerRef: jest.fn(),
        droppableProps: {},
        placeholder: null,
      },
      { isDraggingOver: false },
    ),
  Draggable: ({ children, draggableId, index }: any) =>
    children(
      {
        innerRef: jest.fn(),
        draggableProps: {},
        dragHandleProps: {},
      },
      { isDragging: false },
    ),
}));

describe('PinnedCategoriesSection', () => {
  const mockFormat = jest.fn((value: number) => `$${value}`);
  const mockOnReorder = jest.fn();

  const categoryBalances = [
    { categoryId: 'cat-1', name: 'Groceries', balance: 250 },
    { categoryId: 'cat-2', name: 'Gas', balance: 100 },
  ];

  it('renders nothing when no categories are pinned', () => {
    const { container } = render(
      <PinnedCategoriesSection
        categoryBalances={[]}
        order={[]}
        format={{ format: mockFormat } as any}
        onReorder={mockOnReorder}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders section header when categories are pinned', () => {
    render(
      <PinnedCategoriesSection
        categoryBalances={categoryBalances}
        order={['cat-1', 'cat-2']}
        format={{ format: mockFormat } as any}
        onReorder={mockOnReorder}
      />,
    );
    expect(screen.getByText('Pinned Categories')).toBeInTheDocument();
  });

  it('renders pinned categories in correct order', () => {
    render(
      <PinnedCategoriesSection
        categoryBalances={categoryBalances}
        order={['cat-2', 'cat-1']}
        format={{ format: mockFormat } as any}
        onReorder={mockOnReorder}
      />,
    );
    const rows = screen.getAllByText(/Groceries|Gas/);
    expect(rows[0].textContent).toContain('Gas');
    expect(rows[1].textContent).toContain('Groceries');
  });
});
```

**Step 2: Run tests**

Run: `yarn test packages/desktop-client/src/components/mobile/summary/PinnedCategories.test.tsx`
Expected: All tests pass

**Step 3: Commit**

```bash
git add packages/desktop-client/src/components/mobile/summary/PinnedCategories.test.tsx
git commit -m "test: add integration tests for PinnedCategoriesSection"
```

---

## Task 9: Document the Feature

**Files:**

- Create: `docs/FORK_NOTES.md` (or append if exists)

**Step 1: Check if FORK_NOTES.md exists**

Run: `ls -la docs/FORK_NOTES.md 2>/dev/null || echo "File does not exist"`

**Step 2: Write or append documentation**

If file exists, read it. Otherwise, create with:

```markdown
# Fork Customizations

## Features Added

### Pinned Budget Categories (Feature Flag: `enablePinnedCategories`)

**Purpose:** Allow users to pin critical budget categories to the mobile home page for quick access.

**Architecture:**
- Feature flag in `loot-core/src/featureFlags.ts`
- Hook: `usePinnedCategories()` for managing pinned state
- Components:
  - `PinnedCategoryRow.tsx` - Individual category row with drag handle
  - `PinnedCategoriesSection.tsx` - Layout for pinned categories with drag-and-drop
  - `MobileSummaryPage.tsx` - Integration point (seam)
- Pin/unpin toggle added to category modal

**User Flow:**
1. User views category modal in budget section
2. Clicks "Pin" button to add to pinned categories (only if flag enabled)
3. Pinned categories appear below budget summary on home page
4. User can drag categories to reorder them
5. Selection persists across sessions via `useSyncedPref`

**Compliance:**
- Follows fork guidelines (high-level seam pattern)
- Additive changes only
- Feature flag gates all new behavior
- Leverages existing hooks (useSyncedPref, useSheetValue)

**Testing:**
- Unit tests for PinnedCategoriesSection component
- Integration tests for pin/unpin flow
- Manual testing: drag reorder, sync behavior, preference persistence
```

**Step 3: Commit**

```bash
git add docs/FORK_NOTES.md
git commit -m "docs: add feature documentation for pinned categories"
```

---

## Task 10: Final Verification and Cleanup

**Step 1: Run full typecheck**

Run: `yarn typecheck`
Expected: All strict files pass

**Step 2: Run lint fix to clean up any formatting**

Run: `yarn lint:fix`
Expected: No errors

**Step 3: Run tests**

Run: `yarn test`
Expected: All tests pass (or at minimum, no new failures)

**Step 4: Verify feature flag behavior**

- With flag disabled: No pinned categories UI should appear
- With flag enabled (in dev settings): Pin button visible and functional

**Step 5: Final commit if needed**

If lint made changes:

```bash
git add .
git commit -m "chore: fix linting and formatting"
```

**Step 6: Create summary**

Run: `git log --oneline -10`

This shows all commits for this feature. Verify they follow the pattern of small, atomic changes.

---

## Execution Notes

- **DRY:** Hook `usePinnedCategories` handles all pinned state logic
- **YAGNI:** Only what's needed for pinning/unpinning/reordering
- **TDD:** Each component has tests before being integrated
- **Commits:** Frequent, small commits with clear messages
- **Feature Flag:** All new behavior is behind the flag
- **Seam Pattern:** PinnedCategoriesSection is injected, not modifying core

**Next Steps After Implementation:**

1. Run the full build: `yarn build:browser`
2. Test in browser dev environment
3. Use superpowers:finishing-a-development-branch to merge/PR
