# Mobile Overview Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create an experimental mobile overview dashboard with Budget Summary widget, accessible via home button in expanded mobile navigation.

**Architecture:** Feature-flag gated additive extension following AGENTS.md principles. Reuses existing budget calculations, adds seam in mobile navigation, creates new `/overview` route as conditional default landing page.

**Tech Stack:** React, TypeScript, React Router, existing Actual Budget hooks and components

---

## Task 1: Add Feature Flag Type Definition

**Files:**

- Modify: `packages/loot-core/src/types/prefs.ts:1-10`

**Step 1: Add enableOverviewPage to FeatureFlag type**

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
  | 'enableOverviewPage';
```

**Step 2: Commit the type definition**

```bash
git add packages/loot-core/src/types/prefs.ts
git commit -m "feat: add enableOverviewPage feature flag type"
```

---

## Task 2: Add Feature Flag Default State

**Files:**

- Modify: `packages/desktop-client/src/hooks/useFeatureFlag.ts:5-15`

**Step 1: Add default state for enableOverviewPage**

In `packages/desktop-client/src/hooks/useFeatureFlag.ts`, add the default state (false):

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
};
```

**Step 2: Commit the default state**

```bash
git add packages/desktop-client/src/hooks/useFeatureFlag.ts
git commit -m "feat: add enableOverviewPage default state"
```

---

## Task 3: Create useBudgetSummary Hook

**Files:**

- Create: `packages/desktop-client/src/hooks/useBudgetSummary.ts`

**Step 1: Write the implementation**

Create `packages/desktop-client/src/hooks/useBudgetSummary.ts`:

```typescript
import { useMemo } from 'react';
import * as monthUtils from 'loot-core/shared/months';
import { useCategories } from './useCategories';
import { useSyncedPref } from './useSyncedPref';

type BudgetSummary = {
  spent: number;
  budgeted: number;
  goalTarget: number;
  underfunded: number;
  overfunded: number;
};

export function useBudgetSummary(): BudgetSummary {
  const currentMonth = monthUtils.currentMonth();
  const { list: categories } = useCategories();
  const [budgetType] = useSyncedPref('budgetType');

  const summary = useMemo(() => {
    let spent = 0;
    let budgeted = 0;
    let goalTarget = 0;
    let underfunded = 0;
    let overfunded = 0;

    // Aggregate values from all categories
    categories.forEach(category => {
      if (category.hidden || category.is_income) {
        return; // Skip hidden and income categories
      }

      // TODO: Implement actual sheet value reads based on budget type
      // Use existing calculation patterns from BudgetTable
    });

    return {
      spent,
      budgeted,
      goalTarget,
      underfunded,
      overfunded,
    };
  }, [categories, currentMonth, budgetType]);

  return summary;
}
```

**Step 2: Commit**

```bash
git add packages/desktop-client/src/hooks/useBudgetSummary.ts
git commit -m "feat: add useBudgetSummary hook (placeholder calculations)"
```

---

## Task 4: Create BudgetSummaryTable Component

**Files:**

- Create: `packages/desktop-client/src/components/mobile/overview/BudgetSummaryTable.tsx`

**Step 1: Write the component**

Create `packages/desktop-client/src/components/mobile/overview/BudgetSummaryTable.tsx`:

```typescript
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useFormat } from '@desktop-client/hooks/useFormat';
import { useBudgetSummary } from '@desktop-client/hooks/useBudgetSummary';

type SummaryRowProps = {
  label: string;
  value: number;
};

function SummaryRow({ label, value }: SummaryRowProps) {
  const format = useFormat();

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: '10px 15px',
        borderBottom: `1px solid ${theme.tableBorder}`,
      }}
    >
      <Text style={{ fontSize: 15 }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: 500 }}>
        {format(value, 'financial')}
      </Text>
    </View>
  );
}

export function BudgetSummaryTable() {
  const { t } = useTranslation();
  const summary = useBudgetSummary();

  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: 600,
          padding: '10px 15px',
          color: theme.pageTextSubdued,
        }}
      >
        {t('Budget Summary')}
      </Text>
      <View
        style={{
          backgroundColor: theme.tableBackground,
          border: `1px solid ${theme.tableBorder}`,
          borderRadius: 4,
        }}
      >
        <SummaryRow label={t('Spent')} value={summary.spent} />
        <SummaryRow label={t('Budgeted')} value={summary.budgeted} />
        <SummaryRow label={t('Goal Target')} value={summary.goalTarget} />
        <SummaryRow label={t('Underfunded')} value={summary.underfunded} />
        <SummaryRow label={t('Overfunded')} value={summary.overfunded} />
      </View>
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add packages/desktop-client/src/components/mobile/overview/BudgetSummaryTable.tsx
git commit -m "feat: add BudgetSummaryTable component"
```

---

## Task 5: Create OverviewPage Component

**Files:**

- Create: `packages/desktop-client/src/components/mobile/overview/OverviewPage.tsx`
- Create: `packages/desktop-client/src/components/mobile/overview/index.ts`

**Step 1: Write the OverviewPage component**

Create `packages/desktop-client/src/components/mobile/overview/OverviewPage.tsx`:

```typescript
import React from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { BudgetSummaryTable } from './BudgetSummaryTable';

import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { MOBILE_NAV_HEIGHT } from '@desktop-client/components/mobile/MobileNavTabs';

export function OverviewPage() {
  const { t } = useTranslation();

  return (
    <Page
      header={<MobilePageHeader title={t('Overview')} />}
      padding={0}
      style={{
        paddingBottom: MOBILE_NAV_HEIGHT,
      }}
    >
      <View
        style={{
          padding: 15,
          backgroundColor: theme.mobileViewTheme,
          minHeight: '100%',
        }}
      >
        <BudgetSummaryTable />
        {/* Future widgets will be added here */}
      </View>
    </Page>
  );
}
```

**Step 2: Create index.ts for exports**

Create `packages/desktop-client/src/components/mobile/overview/index.ts`:

```typescript
export { OverviewPage } from './OverviewPage';
export { BudgetSummaryTable } from './BudgetSummaryTable';
```

**Step 3: Commit**

```bash
git add packages/desktop-client/src/components/mobile/overview/
git commit -m "feat: add OverviewPage component"
```

---

## Task 6: Add Overview Route

**Files:**

- Modify: `packages/desktop-client/src/components/FinancesApp.tsx`

**Step 1: Import OverviewPage and useFeatureFlag**

At the top of `FinancesApp.tsx`, add imports:

```typescript
import { OverviewPage } from './mobile/overview';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
```

**Step 2: Add feature flag check in component**

Inside the `FinancesApp` component function, add:

```typescript
const overviewEnabled = useFeatureFlag('enableOverviewPage');
```

**Step 3: Modify default route logic**

Find the default route (around line 236-249) and modify it:

```typescript
<Route
  path="/"
  element={
    isAccountsLoaded ? (
      overviewEnabled && isNarrowWidth ? (
        <Navigate to="/overview" replace />
      ) : accounts.length > 0 ? (
        <Navigate to="/budget" replace />
      ) : (
        <Navigate to="/accounts" replace />
      )
    ) : (
      <LoadingIndicator />
    )
  }
/>
```

**Step 4: Add /overview route**

Add the new route in the Routes section:

```typescript
<Route
  path="/overview"
  element={
    <WideNotSupported>
      <OverviewPage />
    </WideNotSupported>
  }
/>
```

**Step 5: Commit**

```bash
git add packages/desktop-client/src/components/FinancesApp.tsx
git commit -m "feat: add /overview route with feature flag"
```

---

## Task 7: Update Mobile Navigation - Add Home Button

**Files:**

- Modify: `packages/desktop-client/src/components/mobile/MobileNavTabs.tsx`

**Step 1: Import Home icon and useFeatureFlag**

At the top of `MobileNavTabs.tsx`, add to existing imports:

```typescript
import { SvgHome } from '@actual-app/components/icons/v2';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
```

**Step 2: Add feature flag check**

Inside the `MobileNavTabs` component function, add:

```typescript
const overviewEnabled = useFeatureFlag('enableOverviewPage');
```

**Step 3: Update COLUMN_COUNT conditionally**

Replace line with COLUMN_COUNT:

```typescript
const COLUMN_COUNT = overviewEnabled ? 4 : 3;
```

**Step 4: Add home tab to navTabs array**

Find the `navTabs` array and add home tab at the beginning (conditionally):

```typescript
const navTabs = [
  ...(overviewEnabled
    ? [
        {
          name: t('Overview'),
          path: '/overview',
          style: navTabStyle,
          Icon: SvgHome,
        },
      ]
    : []),
  {
    name: t('Budget'),
    path: '/budget',
    style: navTabStyle,
    Icon: SvgWallet,
  },
  // ... rest of existing tabs
].map(tab => (
  <NavTab key={tab.path} onClick={() => openDefault()} {...tab} />
));
```

**Step 5: Update icon size**

Find the NavTab component and update icon size from 22 to 20:

```typescript
<TabIcon width={20} height={20} style={{ minHeight: '20px' }} />
```

**Step 6: Commit**

```bash
git add packages/desktop-client/src/components/mobile/MobileNavTabs.tsx
git commit -m "feat: add home button to mobile navigation when flag enabled"
```

---

## Task 8: Add Feature Flag to Experimental Settings

**Files:**

- Modify: `packages/desktop-client/src/components/settings/Experimental.tsx`

**Step 1: Add OverviewPage toggle**

Find the feature toggles section and add:

```typescript
<Setting
  primaryAction={
    <FeatureToggle flag="enableOverviewPage">
      <Trans>Enable mobile overview page (experimental)</Trans>
    </FeatureToggle>
  }
>
  <Text>
    <Trans>
      Adds a new overview dashboard as the default mobile landing page with
      budget summary and other widgets.
    </Trans>
  </Text>
</Setting>
```

**Step 2: Commit**

```bash
git add packages/desktop-client/src/components/settings/Experimental.tsx
git commit -m "feat: add enableOverviewPage toggle to experimental settings"
```

---

## Task 9: Implement Real Budget Calculations

**Files:**

- Modify: `packages/desktop-client/src/hooks/useBudgetSummary.ts`

**Step 1: Research existing budget calculations**

Read:

- `packages/desktop-client/src/components/mobile/budget/BudgetTable.tsx`
- `packages/desktop-client/src/components/budget/util.ts`
- `packages/desktop-client/src/spreadsheet/bindings.ts`

**Step 2: Update useBudgetSummary with real calculations**

Replace placeholder with actual sheet value reads based on patterns found.

**Step 3: Test and verify**

Ensure calculations match budget page.

**Step 4: Commit**

```bash
git add packages/desktop-client/src/hooks/useBudgetSummary.ts
git commit -m "feat: implement real budget calculations in useBudgetSummary"
```

---

## Task 10: Update FORK_NOTES Documentation

**Files:**

- Create: `FORK_NOTES.md`

Document all changes following AGENTS.md principles.

```bash
git add FORK_NOTES.md
git commit -m "docs: add FORK_NOTES documenting overview page changes"
```

---

## Task 11-15: Testing, Cleanup, and Polish

Tasks 11-15 cover:

- Integration testing
- Manual testing
- Code cleanup and linting
- Final polish
- PR description

---

## Completion Checklist

- [ ] Feature flag added to types and hooks
- [ ] useBudgetSummary hook implemented
- [ ] BudgetSummaryTable component created
- [ ] OverviewPage component created
- [ ] /overview route added
- [ ] Mobile navigation updated
- [ ] Feature flag toggle added to settings
- [ ] Real budget calculations implemented
- [ ] FORK_NOTES.md documented
- [ ] Tests written and passing
- [ ] Code formatted and linted
- [ ] All tasks completed
