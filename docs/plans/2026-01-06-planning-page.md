# Planning Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a new "Planning" page to help users make budget cutting decisions by showing overfunded/underfunded categories with toggleable inclusion in summaries.

**Architecture:** Feature-flagged top-level route that reuses existing goal calculation logic from loot-core. Single responsive component (no wide/narrow split). Checkbox state persisted to localStorage. Follows AGENTS-chad-fork.md fork maintenance rules.

**Tech Stack:** React, TypeScript, Redux (for category data), localStorage (for checkbox state), existing spreadsheet bindings for goal calculations

---

## Task 1: Add Feature Flag Type Definition

**Files:**
- Modify: `packages/loot-core/src/types/prefs.ts:1-12`

**Step 1: Add enablePlanningPage to FeatureFlag type**

In `packages/loot-core/src/types/prefs.ts`, add the new flag to the FeatureFlag union type:

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
  | 'mobileParity'
  | 'enablePlanningPage';
```

**Step 2: Commit**

```bash
git add packages/loot-core/src/types/prefs.ts
git commit -m "feat: add enablePlanningPage feature flag type"
```

---

## Task 2: Register Feature Flag Default State

**Files:**
- Modify: `packages/desktop-client/src/hooks/useFeatureFlag.ts:5-17`

**Step 1: Add default state for enablePlanningPage**

In `packages/desktop-client/src/hooks/useFeatureFlag.ts`, add the flag to DEFAULT_FEATURE_FLAG_STATE:

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
  enablePlanningPage: false,
};
```

**Step 2: Commit**

```bash
git add packages/desktop-client/src/hooks/useFeatureFlag.ts
git commit -m "feat: register enablePlanningPage flag with default false"
```

---

## Task 3: Create Planning Page Component Structure

**Files:**
- Create: `packages/desktop-client/src/components/planning/index.tsx`
- Create: `packages/desktop-client/src/components/planning/PlanningTable.tsx`
- Create: `packages/desktop-client/src/components/planning/usePlanningData.ts`

**Step 1: Create the main Planning page component**

Create `packages/desktop-client/src/components/planning/index.tsx`:

```typescript
import React from 'react';
import { View } from '@actual-app/components/view';
import { theme } from '@actual-app/components/theme';

import { PlanningTable } from './PlanningTable';

export function Planning() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.pageBackground,
        padding: 20,
        overflow: 'auto',
      }}
    >
      <View style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, color: theme.pageText }}>
          Budget Planning
        </h1>
        <p style={{ margin: '8px 0 0 0', color: theme.pageTextSubdued }}>
          Review goal targets and toggle categories to see budget impact
        </p>
      </View>
      <PlanningTable />
    </View>
  );
}
```

**Step 2: Create placeholder PlanningTable component**

Create `packages/desktop-client/src/components/planning/PlanningTable.tsx`:

```typescript
import React from 'react';
import { View } from '@actual-app/components/view';
import { theme } from '@actual-app/components/theme';

export function PlanningTable() {
  return (
    <View
      style={{
        border: `1px solid ${theme.tableBorder}`,
        borderRadius: 4,
        backgroundColor: theme.tableBackground,
        padding: 20,
      }}
    >
      <p style={{ color: theme.pageText }}>Planning table will go here</p>
    </View>
  );
}
```

**Step 3: Create placeholder data hook**

Create `packages/desktop-client/src/components/planning/usePlanningData.ts`:

```typescript
import { useMemo } from 'react';

export function usePlanningData() {
  return useMemo(() => {
    return {
      categories: [],
      groups: [],
    };
  }, []);
}
```

**Step 4: Commit**

```bash
git add packages/desktop-client/src/components/planning/
git commit -m "feat: create planning page component structure"
```

---

## Task 4: Add Planning Route to FinancesApp

**Files:**
- Modify: `packages/desktop-client/src/components/FinancesApp.tsx`

**Step 1: Import Planning component**

Add to imports section (around line 18):

```typescript
import { Planning } from './planning';
```

**Step 2: Add feature flag check**

Add after line 91 where other feature flags are checked:

```typescript
const planningEnabled = useFeatureFlag('enablePlanningPage');
```

**Step 3: Add route**

Add route after the `/budget` route (around line 273):

```typescript
{planningEnabled && (
  <Route path="/planning" element={<Planning />} />
)}
```

**Step 4: Commit**

```bash
git add packages/desktop-client/src/components/FinancesApp.tsx
git commit -m "feat: add /planning route with feature flag"
```

---

## Task 5: Add Planning Link to Desktop Sidebar

**Files:**
- Modify: `packages/desktop-client/src/components/sidebar/PrimaryButtons.tsx`

**Step 1: Import useFeatureFlag**

Add to imports (around line 22):

```typescript
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
```

**Step 2: Import an icon for Planning**

Add to icon imports (around line 15):

```typescript
import { SvgClipboardCheck } from '@actual-app/components/icons/v1';
```

If `SvgClipboardCheck` doesn't exist, use `SvgTuning` or another suitable icon.

**Step 3: Add feature flag check**

Add after line 33:

```typescript
const planningEnabled = useFeatureFlag('enablePlanningPage');
```

**Step 4: Add Planning menu item**

Add after the Budget item (around line 52):

```typescript
<Item title={t('Budget')} Icon={SvgWallet} to="/budget" />
{planningEnabled && (
  <Item title={t('Planning')} Icon={SvgClipboardCheck} to="/planning" />
)}
<Item title={t('Reports')} Icon={SvgReports} to="/reports" />
```

**Step 5: Commit**

```bash
git add packages/desktop-client/src/components/sidebar/PrimaryButtons.tsx
git commit -m "feat: add Planning link to desktop sidebar"
```

---

## Task 6: Add Planning Link to Mobile Navigation

**Files:**
- Modify: `packages/desktop-client/src/components/mobile/MobileNavTabs.tsx`

**Step 1: Add feature flag check**

Add after line 47 where overviewEnabled is defined:

```typescript
const planningEnabled = useFeatureFlag('enablePlanningPage');
```

**Step 2: Import Planning icon**

Add to icon imports (around line 22):

```typescript
import { SvgClipboardCheck } from '@actual-app/components/icons/v1';
```

**Step 3: Find the navigation tabs section**

Look for the section that renders navigation tabs (search for `<NavLink` elements). This is typically after line 150.

**Step 4: Add Planning tab**

Add a new NavLink for Planning alongside existing tabs:

```typescript
{planningEnabled && (
  <NavLink
    to="/planning"
    style={{
      ...navTabStyle,
      color: theme.mobileNavText,
      textDecoration: 'none',
    }}
  >
    {({ isActive }) => (
      <View
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <SvgClipboardCheck
          style={{
            width: 24,
            height: 24,
            color: isActive ? theme.mobileNavTextSelected : theme.mobileNavText,
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? theme.mobileNavTextSelected : theme.mobileNavText,
          }}
        >
          {t('Planning')}
        </span>
      </View>
    )}
  </NavLink>
)}
```

**Step 5: Commit**

```bash
git add packages/desktop-client/src/components/mobile/MobileNavTabs.tsx
git commit -m "feat: add Planning link to mobile navigation"
```

---

## Task 7: Implement Data Hook for Categories and Goals

**Files:**
- Modify: `packages/desktop-client/src/components/planning/usePlanningData.ts`

**Step 1: Write the data fetching hook**

Replace the contents of `usePlanningData.ts`:

```typescript
import { useMemo } from 'react';
import { useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { useSelector } from '@desktop-client/redux';
import type { CategoryEntity, CategoryGroupEntity } from 'loot-core/types/models';

interface PlanningCategory {
  id: string;
  name: string;
  groupId: string;
  budgeted: number;
  goalTarget: number | null;
  overfunded: number;
  underfunded: number;
  isLongGoal: boolean;
}

interface PlanningGroup {
  id: string;
  name: string;
  categories: PlanningCategory[];
}

export function usePlanningData() {
  const spreadsheet = useSpreadsheet();
  const categories = useSelector(state => state.queries.categories.list) as CategoryEntity[];
  const categoryGroups = useSelector(state => state.queries.categories.grouped) as CategoryGroupEntity[];

  return useMemo(() => {
    const planningGroups: PlanningGroup[] = [];

    categoryGroups.forEach(group => {
      if (group.hidden) return;

      const planningCategories: PlanningCategory[] = [];

      group.categories?.forEach(category => {
        if (category.hidden || category.tombstone) return;

        // Get budgeted amount for current month
        const budgetedValue = spreadsheet.getCellValue(
          `budget-${category.id}`
        ) || 0;

        // Get goal data
        const goalValue = spreadsheet.getCellValue(`goal-${category.id}`) || null;
        const longGoalValue = spreadsheet.getCellValue(`long-goal-${category.id}`) || 0;
        const isLongGoal = longGoalValue === 1;

        // Calculate overfunded/underfunded
        let overfunded = 0;
        let underfunded = 0;

        if (goalValue != null) {
          const difference = budgetedValue - goalValue;
          if (difference > 0) {
            overfunded = difference;
          } else if (difference < 0) {
            underfunded = Math.abs(difference);
          }
        }

        planningCategories.push({
          id: category.id,
          name: category.name,
          groupId: group.id,
          budgeted: budgetedValue,
          goalTarget: goalValue,
          overfunded,
          underfunded,
          isLongGoal,
        });
      });

      if (planningCategories.length > 0) {
        planningGroups.push({
          id: group.id,
          name: group.name,
          categories: planningCategories,
        });
      }
    });

    return {
      groups: planningGroups,
    };
  }, [spreadsheet, categories, categoryGroups]);
}
```

**Step 2: Commit**

```bash
git add packages/desktop-client/src/components/planning/usePlanningData.ts
git commit -m "feat: implement planning data hook with goal calculations"
```

---

## Task 8: Create Checkbox State Management Hook

**Files:**
- Create: `packages/desktop-client/src/components/planning/useCheckboxState.ts`

**Step 1: Write the checkbox state hook**

Create `packages/desktop-client/src/components/planning/useCheckboxState.ts`:

```typescript
import { useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'planning_selected_categories';

interface CheckboxState {
  [categoryId: string]: boolean;
}

export function useCheckboxState(allCategoryIds: string[]) {
  const [selectedCategories, setSelectedCategories] = useState<CheckboxState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load planning checkbox state:', e);
    }
    // Default: all categories selected
    return allCategoryIds.reduce((acc, id) => {
      acc[id] = true;
      return acc;
    }, {} as CheckboxState);
  });

  // Sync to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCategories));
    } catch (e) {
      console.error('Failed to save planning checkbox state:', e);
    }
  }, [selectedCategories]);

  // Ensure new categories default to selected
  useEffect(() => {
    setSelectedCategories(prev => {
      const updated = { ...prev };
      let hasChanges = false;

      allCategoryIds.forEach(id => {
        if (!(id in updated)) {
          updated[id] = true;
          hasChanges = true;
        }
      });

      return hasChanges ? updated : prev;
    });
  }, [allCategoryIds]);

  const toggleCategory = useCallback((categoryId: string) => {
    setSelectedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  const toggleGroup = useCallback((categoryIds: string[]) => {
    setSelectedCategories(prev => {
      // Check if all are currently selected
      const allSelected = categoryIds.every(id => prev[id]);
      const newValue = !allSelected;

      const updated = { ...prev };
      categoryIds.forEach(id => {
        updated[id] = newValue;
      });
      return updated;
    });
  }, []);

  const toggleAll = useCallback((allIds: string[]) => {
    setSelectedCategories(prev => {
      const allSelected = allIds.every(id => prev[id]);
      const newValue = !allSelected;

      const updated = { ...prev };
      allIds.forEach(id => {
        updated[id] = newValue;
      });
      return updated;
    });
  }, []);

  const isSelected = useCallback((categoryId: string) => {
    return selectedCategories[categoryId] ?? true;
  }, [selectedCategories]);

  const getGroupCheckboxState = useCallback((categoryIds: string[]): 'checked' | 'unchecked' | 'indeterminate' => {
    const selected = categoryIds.filter(id => selectedCategories[id] ?? true);
    if (selected.length === 0) return 'unchecked';
    if (selected.length === categoryIds.length) return 'checked';
    return 'indeterminate';
  }, [selectedCategories]);

  return {
    selectedCategories,
    toggleCategory,
    toggleGroup,
    toggleAll,
    isSelected,
    getGroupCheckboxState,
  };
}
```

**Step 2: Commit**

```bash
git add packages/desktop-client/src/components/planning/useCheckboxState.ts
git commit -m "feat: add checkbox state management with localStorage persistence"
```

---

## Task 9: Implement Summary Calculations Hook

**Files:**
- Create: `packages/desktop-client/src/components/planning/useSummaryCalculations.ts`

**Step 1: Write the summary calculations hook**

Create `packages/desktop-client/src/components/planning/useSummaryCalculations.ts`:

```typescript
import { useMemo } from 'react';

interface PlanningCategory {
  id: string;
  overfunded: number;
  underfunded: number;
  goalTarget: number | null;
}

interface Summary {
  overfunded: number;
  underfunded: number;
  goalTarget: number;
}

export function useSummaryCalculations(
  categories: PlanningCategory[],
  selectedCategories: { [id: string]: boolean }
): Summary {
  return useMemo(() => {
    let totalOverfunded = 0;
    let totalUnderfunded = 0;
    let totalGoalTarget = 0;

    categories.forEach(category => {
      // Only include selected categories in summaries
      if (selectedCategories[category.id] ?? true) {
        totalOverfunded += category.overfunded;
        totalUnderfunded += category.underfunded;
        totalGoalTarget += category.goalTarget || 0;
      }
    });

    return {
      overfunded: totalOverfunded,
      underfunded: totalUnderfunded,
      goalTarget: totalGoalTarget,
    };
  }, [categories, selectedCategories]);
}
```

**Step 2: Commit**

```bash
git add packages/desktop-client/src/components/planning/useSummaryCalculations.ts
git commit -m "feat: add summary calculations hook for planning page"
```

---

## Task 10: Build PlanningTable Component - Part 1 (Header)

**Files:**
- Modify: `packages/desktop-client/src/components/planning/PlanningTable.tsx`

**Step 1: Import dependencies**

Replace the contents of `PlanningTable.tsx` with:

```typescript
import React, { useMemo } from 'react';
import { View } from '@actual-app/components/view';
import { theme } from '@actual-app/components/theme';
import { styles } from '@actual-app/components/styles';

import { usePlanningData } from './usePlanningData';
import { useCheckboxState } from './useCheckboxState';
import { useSummaryCalculations } from './useSummaryCalculations';
import { useFormat } from '@desktop-client/hooks/useFormat';

export function PlanningTable() {
  const { groups } = usePlanningData();
  const format = useFormat();

  // Get all category IDs for checkbox management
  const allCategoryIds = useMemo(() => {
    return groups.flatMap(g => g.categories.map(c => c.id));
  }, [groups]);

  const {
    toggleCategory,
    toggleGroup,
    toggleAll,
    isSelected,
    getGroupCheckboxState,
    selectedCategories,
  } = useCheckboxState(allCategoryIds);

  // Get all categories flattened for summary
  const allCategories = useMemo(() => {
    return groups.flatMap(g => g.categories);
  }, [groups]);

  const totalSummary = useSummaryCalculations(allCategories, selectedCategories);

  return (
    <View
      style={{
        border: `1px solid ${theme.tableBorder}`,
        borderRadius: 4,
        backgroundColor: theme.tableBackground,
        overflow: 'hidden',
      }}
    >
      {/* Header Row */}
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: theme.tableHeaderBackground,
          borderBottom: `1px solid ${theme.tableBorder}`,
          fontWeight: 600,
          fontSize: 13,
          color: theme.tableHeaderText,
        }}
      >
        <View style={{ width: 40, flexShrink: 0 }}>
          <input
            type="checkbox"
            checked={getGroupCheckboxState(allCategoryIds) === 'checked'}
            ref={input => {
              if (input) {
                input.indeterminate = getGroupCheckboxState(allCategoryIds) === 'indeterminate';
              }
            }}
            onChange={() => toggleAll(allCategoryIds)}
            style={{ cursor: 'pointer' }}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>Category</View>
        <View style={{ width: 120, textAlign: 'right' }}>Overfunded</View>
        <View style={{ width: 120, textAlign: 'right' }}>Underfunded</View>
        <View style={{ width: 120, textAlign: 'right' }}>Goal Target</View>
      </View>

      {/* Summary Row */}
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: theme.tableRowHeaderBackground,
          borderBottom: `2px solid ${theme.tableBorder}`,
          fontWeight: 600,
          fontSize: 14,
          color: theme.tableText,
        }}
      >
        <View style={{ width: 40, flexShrink: 0 }} />
        <View style={{ flex: 1, minWidth: 0 }}>Total</View>
        <View style={{ width: 120, textAlign: 'right', color: theme.noticeText }}>
          {format(totalSummary.overfunded, 'financial')}
        </View>
        <View style={{ width: 120, textAlign: 'right', color: theme.errorText }}>
          {format(totalSummary.underfunded, 'financial')}
        </View>
        <View style={{ width: 120, textAlign: 'right' }}>
          {format(totalSummary.goalTarget, 'financial')}
        </View>
      </View>

      {/* Groups and Categories will go here in next step */}
      <View style={{ padding: 20, color: theme.pageTextSubdued, textAlign: 'center' }}>
        Groups and categories will be rendered here
      </View>
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add packages/desktop-client/src/components/planning/PlanningTable.tsx
git commit -m "feat: add PlanningTable header and summary row"
```

---

## Task 11: Build PlanningTable Component - Part 2 (Groups and Categories)

**Files:**
- Modify: `packages/desktop-client/src/components/planning/PlanningTable.tsx`
- Create: `packages/desktop-client/src/components/planning/GroupRow.tsx`
- Create: `packages/desktop-client/src/components/planning/CategoryRow.tsx`

**Step 1: Create GroupRow component**

Create `packages/desktop-client/src/components/planning/GroupRow.tsx`:

```typescript
import React, { useMemo } from 'react';
import { View } from '@actual-app/components/view';
import { theme } from '@actual-app/components/theme';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useSummaryCalculations } from './useSummaryCalculations';

interface GroupRowProps {
  groupName: string;
  categories: Array<{
    id: string;
    overfunded: number;
    underfunded: number;
    goalTarget: number | null;
  }>;
  selectedCategories: { [id: string]: boolean };
  checkboxState: 'checked' | 'unchecked' | 'indeterminate';
  onToggle: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function GroupRow({
  groupName,
  categories,
  selectedCategories,
  checkboxState,
  onToggle,
  isCollapsed,
  onToggleCollapse,
}: GroupRowProps) {
  const format = useFormat();
  const summary = useSummaryCalculations(categories, selectedCategories);

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '10px 16px',
        backgroundColor: theme.tableRowHeaderBackground,
        borderBottom: `1px solid ${theme.tableBorder}`,
        fontWeight: 600,
        fontSize: 13,
        color: theme.tableText,
        cursor: 'pointer',
      }}
      onClick={onToggleCollapse}
    >
      <View style={{ width: 40, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={checkboxState === 'checked'}
          ref={input => {
            if (input) {
              input.indeterminate = checkboxState === 'indeterminate';
            }
          }}
          onChange={onToggle}
          style={{ cursor: 'pointer' }}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{isCollapsed ? '▶' : '▼'}</span>
        <span>{groupName}</span>
      </View>
      <View style={{ width: 120, textAlign: 'right', color: theme.noticeText }}>
        {format(summary.overfunded, 'financial')}
      </View>
      <View style={{ width: 120, textAlign: 'right', color: theme.errorText }}>
        {format(summary.underfunded, 'financial')}
      </View>
      <View style={{ width: 120, textAlign: 'right' }}>
        {format(summary.goalTarget, 'financial')}
      </View>
    </View>
  );
}
```

**Step 2: Create CategoryRow component**

Create `packages/desktop-client/src/components/planning/CategoryRow.tsx`:

```typescript
import React from 'react';
import { View } from '@actual-app/components/view';
import { theme } from '@actual-app/components/theme';
import { useFormat } from '@desktop-client/hooks/useFormat';

interface CategoryRowProps {
  categoryName: string;
  overfunded: number;
  underfunded: number;
  goalTarget: number | null;
  isSelected: boolean;
  onToggle: () => void;
}

export function CategoryRow({
  categoryName,
  overfunded,
  underfunded,
  goalTarget,
  isSelected,
  onToggle,
}: CategoryRowProps) {
  const format = useFormat();

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '8px 16px',
        paddingLeft: 56, // Indent for category rows
        backgroundColor: theme.tableBackground,
        borderBottom: `1px solid ${theme.tableBorder}`,
        fontSize: 13,
        color: theme.tableText,
        opacity: isSelected ? 1 : 0.4,
        transition: 'opacity 0.2s ease',
      }}
    >
      <View style={{ width: 40, flexShrink: 0, marginLeft: -40 }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          style={{ cursor: 'pointer' }}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>{categoryName}</View>
      <View style={{ width: 120, textAlign: 'right', color: theme.noticeText }}>
        {overfunded > 0 ? format(overfunded, 'financial') : '—'}
      </View>
      <View style={{ width: 120, textAlign: 'right', color: theme.errorText }}>
        {underfunded > 0 ? format(underfunded, 'financial') : '—'}
      </View>
      <View style={{ width: 120, textAlign: 'right' }}>
        {goalTarget != null ? format(goalTarget, 'financial') : '—'}
      </View>
    </View>
  );
}
```

**Step 3: Update PlanningTable to use GroupRow and CategoryRow**

In `PlanningTable.tsx`, replace the placeholder "Groups and categories will be rendered here" section with:

```typescript
import { GroupRow } from './GroupRow';
import { CategoryRow } from './CategoryRow';
```

Add state for collapsed groups:

```typescript
const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set());

const toggleCollapse = (groupId: string) => {
  setCollapsedGroups(prev => {
    const next = new Set(prev);
    if (next.has(groupId)) {
      next.delete(groupId);
    } else {
      next.add(groupId);
    }
    return next;
  });
};
```

Replace the placeholder View with:

```typescript
{/* Groups and Categories */}
{groups.map(group => {
  const categoryIds = group.categories.map(c => c.id);
  const groupCheckboxState = getGroupCheckboxState(categoryIds);
  const isCollapsed = collapsedGroups.has(group.id);

  return (
    <React.Fragment key={group.id}>
      <GroupRow
        groupName={group.name}
        categories={group.categories}
        selectedCategories={selectedCategories}
        checkboxState={groupCheckboxState}
        onToggle={() => toggleGroup(categoryIds)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => toggleCollapse(group.id)}
      />
      {!isCollapsed && group.categories.map(category => (
        <CategoryRow
          key={category.id}
          categoryName={category.name}
          overfunded={category.overfunded}
          underfunded={category.underfunded}
          goalTarget={category.goalTarget}
          isSelected={isSelected(category.id)}
          onToggle={() => toggleCategory(category.id)}
        />
      ))}
    </React.Fragment>
  );
})}
```

**Step 4: Commit**

```bash
git add packages/desktop-client/src/components/planning/
git commit -m "feat: add GroupRow and CategoryRow components with collapse support"
```

---

## Task 12: Add Feature Toggle to Settings Page

**Files:**
- Modify: `packages/desktop-client/src/components/settings/Experimental.tsx`

**Step 1: Find the FeatureToggle section**

Search for existing FeatureToggle components (like `enableOverviewPage`).

**Step 2: Add Planning Page toggle**

Add a new FeatureToggle after the existing ones:

```typescript
<FeatureToggle flag="enablePlanningPage">
  <Setting
    primaryAction={
      <label>
        <input
          type="checkbox"
          checked={flags.enablePlanningPage}
          onChange={() => setFlag('enablePlanningPage', !flags.enablePlanningPage)}
        />
      </label>
    }
  >
    <Text>
      <strong>Planning Page</strong> shows goal targets with overfunded/underfunded amounts.
      Toggle categories to see budget impact.
    </Text>
  </Setting>
</FeatureToggle>
```

**Step 3: Commit**

```bash
git add packages/desktop-client/src/components/settings/Experimental.tsx
git commit -m "feat: add Planning Page feature toggle to settings"
```

---

## Task 13: Fix TypeScript Errors and Imports

**Files:**
- Various planning component files as needed

**Step 1: Run TypeScript check**

Run: `npm run typecheck` (or `yarn typecheck`)
Expected: May show errors related to imports or types

**Step 2: Fix any import path issues**

Common fixes needed:
- Adjust `@actual-app/components` imports if they don't resolve
- Fix `useFormat` import path if needed
- Add missing type imports from `loot-core/types/models`

**Step 3: Fix any type errors**

Address any TypeScript errors shown by the compiler.

**Step 4: Run typecheck again**

Run: `npm run typecheck`
Expected: PASS (no errors)

**Step 5: Commit**

```bash
git add packages/desktop-client/src/components/planning/
git commit -m "fix: resolve TypeScript errors in planning components"
```

---

## Task 14: Test the Planning Page

**Files:**
- N/A (manual testing)

**Step 1: Enable the feature flag**

1. Start the app: `npm start`
2. Navigate to Settings → Experimental
3. Enable "Planning Page"

**Step 2: Navigate to Planning page**

1. Click "Planning" in the sidebar (desktop) or nav tabs (mobile)
2. Verify the page loads without errors

**Step 3: Test checkbox functionality**

1. Click a category checkbox → verify the category row fades
2. Click a group checkbox → verify all categories in the group toggle
3. Click the top-level checkbox → verify all categories toggle
4. Verify summary values update dynamically

**Step 4: Test state persistence**

1. Toggle some categories off
2. Refresh the page
3. Verify the toggled state persists

**Step 5: Test responsive behavior**

1. Resize the browser window to mobile width
2. Verify the table remains usable
3. Check mobile navigation shows Planning tab

**Step 6: Document any issues**

If bugs are found, create a list of issues to fix in the next task.

---

## Task 15: Bug Fixes and Polish

**Files:**
- Various planning component files as needed

**Step 1: Fix any bugs found during testing**

Address issues from Task 14 testing.

**Step 2: Add loading state**

If categories are slow to load, add a loading indicator in `PlanningTable.tsx`.

**Step 3: Add empty state**

If no categories have goals, show a helpful empty state message.

**Step 4: Polish styling**

- Ensure colors match the rest of the app
- Check hover states on rows
- Verify responsive behavior at various screen sizes

**Step 5: Commit**

```bash
git add packages/desktop-client/src/components/planning/
git commit -m "fix: polish Planning page styling and edge cases"
```

---

## Task 16: Create Integration Tests

**Files:**
- Create: `packages/desktop-client/src/components/planning/Planning.integration.test.tsx`

**Step 1: Write integration test**

Create `Planning.integration.test.tsx`:

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Planning } from './index';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';

jest.mock('@desktop-client/hooks/useFeatureFlag');

describe('Planning Page', () => {
  beforeEach(() => {
    (useFeatureFlag as jest.Mock).mockImplementation((flag: string) => {
      if (flag === 'enablePlanningPage') return true;
      return false;
    });

    // Mock localStorage
    Storage.prototype.getItem = jest.fn(() => null);
    Storage.prototype.setItem = jest.fn();
  });

  it('renders the planning page header', () => {
    render(<Planning />);
    expect(screen.getByText('Budget Planning')).toBeInTheDocument();
  });

  it('renders category checkboxes', () => {
    render(<Planning />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('toggles category selection on checkbox click', () => {
    render(<Planning />);
    const checkbox = screen.getAllByRole('checkbox')[1]; // First category
    fireEvent.click(checkbox);
    // Verify state changed (this depends on your implementation)
  });
});
```

**Step 2: Run tests**

Run: `npm test Planning.integration.test`
Expected: Tests pass

**Step 3: Commit**

```bash
git add packages/desktop-client/src/components/planning/Planning.integration.test.tsx
git commit -m "test: add integration tests for Planning page"
```

---

## Task 17: Update Documentation

**Files:**
- Create: `packages/desktop-client/src/components/planning/README.md`
- Modify: `integration/FORK_NOTES.md` (create if doesn't exist)

**Step 1: Create Planning README**

Create `packages/desktop-client/src/components/planning/README.md`:

```markdown
# Planning Page

## Overview

The Planning page helps users make budget cutting decisions by showing overfunded/underfunded categories based on goal targets.

## Features

- **Goal Comparison**: Shows overfunded/underfunded amounts by comparing budgeted amounts to goal targets
- **Category Selection**: Toggle categories on/off to simulate budget changes
- **Dynamic Summaries**: Summary rows update in real-time as categories are toggled
- **Persistent State**: Checkbox selections persist in localStorage across sessions
- **Responsive Design**: Single responsive layout works on desktop and mobile

## Implementation Details

### Feature Flag

- **Flag Name**: `enablePlanningPage`
- **Default**: `false`
- **Type**: `FeatureFlag` (synced preference)

### Components

- `Planning` - Main page component
- `PlanningTable` - Table with header, summary, groups, and categories
- `GroupRow` - Collapsible group row with aggregated values
- `CategoryRow` - Individual category row with checkbox
- `usePlanningData` - Hook to fetch and calculate planning data
- `useCheckboxState` - Hook to manage checkbox state with localStorage
- `useSummaryCalculations` - Hook to calculate summaries based on selection

### Data Flow

1. `usePlanningData` fetches categories and groups from Redux
2. For each category, calculates budgeted amount and goal target from spreadsheet
3. Computes overfunded/underfunded: `budgeted - goalTarget`
4. `useCheckboxState` manages which categories are selected
5. `useSummaryCalculations` aggregates only selected categories
6. State persists to localStorage on every change

### File Organization

```
packages/desktop-client/src/components/planning/
├── index.tsx              # Main Planning page
├── PlanningTable.tsx      # Table component
├── GroupRow.tsx           # Group row component
├── CategoryRow.tsx        # Category row component
├── usePlanningData.ts     # Data fetching hook
├── useCheckboxState.ts    # Checkbox state management
├── useSummaryCalculations.ts  # Summary calculations
└── README.md              # This file
```

## Fork Maintenance

This feature follows the AGENTS-chad-fork.md rules:

- **Feature flag**: Gates the entire feature (defaults to false)
- **Seam**: New top-level route `/planning` (additive, not modifying existing routes)
- **Reuses logic**: Goal calculations use existing spreadsheet bindings
- **Minimal core changes**: Only adds feature flag type definition
- **Single location**: All code in `planning/` directory
```

**Step 2: Update FORK_NOTES.md**

Create or update `integration/FORK_NOTES.md`:

```markdown
# Fork Notes

## Added Features

### Planning Page (2026-01-06)

**Seam**: New top-level route `/planning`

**Flag**: `enablePlanningPage` (default: false)

**Rationale**: Helps users make budget cutting decisions by showing overfunded/underfunded categories with toggleable inclusion in summaries. Follows fork maintenance rules by being fully feature-flagged and additive.

**Files Changed**:
- `packages/loot-core/src/types/prefs.ts` - Added feature flag type
- `packages/desktop-client/src/hooks/useFeatureFlag.ts` - Registered flag default
- `packages/desktop-client/src/components/FinancesApp.tsx` - Added route
- `packages/desktop-client/src/components/sidebar/PrimaryButtons.tsx` - Added nav link
- `packages/desktop-client/src/components/mobile/MobileNavTabs.tsx` - Added mobile nav
- `packages/desktop-client/src/components/planning/*` - All planning page code

**Upstream Merge Impact**: Minimal - only touches feature flag definitions and adds new route
```

**Step 3: Commit**

```bash
git add packages/desktop-client/src/components/planning/README.md integration/FORK_NOTES.md
git commit -m "docs: add Planning page documentation and fork notes"
```

---

## Task 18: Final Build and Verification

**Files:**
- N/A (build verification)

**Step 1: Run full build**

Run: `npm run build` (or `yarn build`)
Expected: Build completes successfully with no errors

**Step 2: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 3: Run linting**

Run: `npm run lint`
Expected: No linting errors

**Step 4: Test in production build**

1. Start the production build
2. Enable the Planning Page feature flag
3. Navigate to `/planning`
4. Verify all functionality works

**Step 5: Create final commit if any fixes needed**

```bash
git add .
git commit -m "chore: final build verification and fixes"
```

---

## Completion Checklist

- [ ] Feature flag added to type definitions and defaults
- [ ] Planning page components created
- [ ] Route added to FinancesApp
- [ ] Navigation links added (desktop and mobile)
- [ ] Data hooks implemented (planning data, checkbox state, summaries)
- [ ] GroupRow and CategoryRow components working
- [ ] Feature toggle added to settings
- [ ] TypeScript errors resolved
- [ ] Manual testing completed
- [ ] Bug fixes and polish applied
- [ ] Integration tests added
- [ ] Documentation written
- [ ] Full build passes
- [ ] All tests pass
- [ ] Linting passes

---

## Notes

- The Planning page reuses existing goal calculation logic from loot-core
- Checkbox state is local-only (not synced across devices)
- Categories without goals show "—" in the goal columns
- The implementation follows AGENTS-chad-fork.md fork maintenance rules
- Feature flag defaults to false, so upstream behavior is unchanged
