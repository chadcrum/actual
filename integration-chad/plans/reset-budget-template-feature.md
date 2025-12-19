# Reset Budget Template Feature

## Overview

**Feature**: Add ability to reset/unapply budget templates for a specific month without removing template definitions.

**Issue Found**: Initial implementation was incorrect - only set budgets to $0 but didn't clear template state. Templates persist as goal state (goal, long_goal) which affects balance colors and behavior. This update corrects the logic and ensures fork compliance.

**User Story**: As a user with budget templates, I want to unapply/reset a template for a specific month so that balance colors return to normal and template behavior stops, while preserving the template definition for future use, without having to manually remove and re-add #template lines from category notes.

**Fork Compliance**: This implementation strictly follows the fork conventions from `AGENTS-chad-fork.md`:

- ✅ Completely separate from upstream (new file, not modifying goal-template.ts)
- ✅ Feature flag gated (defaults to false)
- ✅ Easy to remove (clean rollback)
- ✅ Behavior in loot-core, presentation in web
- ✅ High-level seams at menu boundaries
- ✅ No merge conflicts with upstream template code

---

## Issue Analysis & Correction

### Initial Implementation Problem

The original implementation incorrectly used `setBudgets()` which only sets the budgeted amount to $0. This doesn't actually unapply templates because templates create persistent goal state (`goal`, `long_goal` in database) that affects:

- Balance colors (template colors vs gray/black)
- Category behavior (treated as templated category)
- Menu options availability

### Root Cause

Templates store state in multiple places:

1. **categories.goal_def** - JSON template definition (should persist)
2. **{zero|reflect}\_budgets.goal** - Per-month goal value (should be cleared)
3. **{zero|reflect}\_budgets.long_goal** - Per-month goal type flag (should be cleared)
4. **Spreadsheet cells** - goal-{id} and long-goal-{id} (should be cleared)

Setting budget to $0 only affects the budgeted amount, not the goal state.

### User's Manual Workaround

Users discovered they could unapply templates by:

1. Removing `#template` line from notes
2. Clicking "Apply template" → This triggers storeNoteTemplates which sets goal_def to NULL, then processTemplate clears orphaned goals
3. Re-adding `#template` line to preserve template definition

### Corrected Approach

Instead of only setting budgets to $0:

- **Clear goal state** (goal: null, longGoal: null) → removes template colors and behavior
- **Keep goal_def intact** → template definition persists
- **Leave budget amount unchanged** → simpler, cleaner separation of concerns
- **Create separate file** → avoids merge conflicts with upstream, maintains fork compliance

---

## Requirements Summary

**What it does**:

- **Clears template goal state** (goal, long_goal) for specified month → removes template colors and behavior
- **Keeps template definitions intact** (goal_def, template_settings, category notes)
- **Leaves budgeted amounts unchanged** (user can set to 0 separately if desired)
- Only affects the specified month (no impact on other months)
- Works for both notes-based (#template) and UI-based templates
- Balance colors return to normal (gray/black) instead of template colors

**Where it appears**:

1. **Month kebab menu**: "Reset budget template" - resets ALL categories in that month
2. **Category budget modal**: "Reset template" - resets individual category for that month

**Feature flags required**:

- `goalTemplatesEnabled` (existing) - must be enabled
- `resetBudgetTemplates` (new) - experimental flag for this feature

---

## Implementation Phases

### PHASE 0: Branch Setup

**Create feature branch from integration branch**

```bash
git checkout custom/integration
git pull origin custom/integration
git checkout -b feature/reset-budget-templates
```

---

### PHASE 1: Feature Flag Setup

#### File 1: `/home/chid/git/actual/packages/loot-core/src/types/prefs.ts`

**Location**: Line 1-11 (FeatureFlag type definition)

**Action**: Add new feature flag to the union type

**Before**:

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
  | 'budget-tooltip-goals';
```

**After**:

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
  | 'budget-tooltip-goals'
  | 'resetBudgetTemplates';  // NEW: Experimental reset template feature
```

**Commit**: `feat: Add resetBudgetTemplates feature flag type definition`

---

#### File 2: `/home/chid/git/actual/packages/desktop-client/src/hooks/useFeatureFlag.ts`

**Location**: Line 5-16 (DEFAULT_FEATURE_FLAG_STATE)

**Action**: Add default value (false) for new flag

**Before**:

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
  'budget-tooltip-goals': false,
};
```

**After**:

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
  'budget-tooltip-goals': false,
  resetBudgetTemplates: false,  // NEW
};
```

**Commit**: `feat: Add resetBudgetTemplates default state (disabled)`

---

### PHASE 2: Backend - Core Reset Logic (NEW FILE - Fork Compliant)

#### File 3a: CREATE NEW FILE - `/home/chid/git/actual/packages/loot-core/src/server/budget/reset-goal-template.ts`

**Action**: Create completely new file (not modifying upstream goal-template.ts)

**File content**:

```typescript
import { CategoryEntity } from '../../types/models';
import { Notification } from '../../client/state-types/notifications';
import { getTemplates, storeNoteTemplates } from './goal-template';
import { setGoal } from './actions';
import { batchMessages } from '../sync';

type TemplateGoal = {
  category: CategoryEntity['id'];
  goal: number | null;
  longGoal: number | null;
};

async function setGoals(month: string, templateGoal: TemplateGoal[]) {
  await batchMessages(async () => {
    templateGoal.forEach(element => {
      setGoal({
        month,
        category: element.category,
        goal: element.goal,
        long_goal: element.longGoal,
      });
    });
  });
}

/**
 * Reset all templates for a month by clearing goal state.
 * Template definitions (goal_def) remain intact.
 * Budgeted amounts remain unchanged.
 */
export async function resetTemplatesForMonth({
  month,
}: {
  month: string;
}): Promise<Notification> {
  await storeNoteTemplates();
  const categoryTemplates = await getTemplates();

  // Get all categories that have templates
  const categoriesWithTemplates = Object.keys(categoryTemplates);

  if (categoriesWithTemplates.length === 0) {
    return {
      type: 'message',
      message: 'No templates found for this month',
    };
  }

  // Clear goal state for all categories with templates
  const templateGoals: TemplateGoal[] = categoriesWithTemplates.map(
    categoryId => ({
      category: categoryId,
      goal: null,
      longGoal: null,
    }),
  );

  await setGoals(month, templateGoals);

  return {
    type: 'message',
    message: `Successfully reset ${categoriesWithTemplates.length} templates`,
  };
}

/**
 * Reset a single category template by clearing goal state.
 * Template definition (goal_def) remains intact.
 * Budgeted amount remains unchanged.
 */
export async function resetSingleCategoryTemplate({
  month,
  category,
}: {
  month: string;
  category: CategoryEntity['id'];
}): Promise<Notification> {
  await storeNoteTemplates();
  const categoryTemplates = await getTemplates(c => c.id === category);

  if (!categoryTemplates[category]) {
    return {
      type: 'error',
      message: 'No template found for this category',
    };
  }

  await setGoals(month, [{ category, goal: null, longGoal: null }]);

  return {
    type: 'message',
    message: 'Template reset successfully',
  };
}
```

**Why this approach**:

- ✅ Completely separate from upstream goal-template.ts
- ✅ No merge conflicts with upstream template code
- ✅ Imports only stable upstream helpers (getTemplates, storeNoteTemplates, setGoal)
- ✅ Uses setGoals() to clear goal state, not setBudgets()
- ✅ Self-contained and easy to remove

**Commit**: `feat: Create reset-goal-template.ts with proper goal-clearing logic`

---

#### File 3b: CLEANUP - Remove incorrect functions from `goal-template.ts`

**File**: `/home/chid/git/actual/packages/loot-core/src/server/budget/goal-template.ts`

**Action**: Delete lines 311-376 (the incorrectly added resetTemplatesForMonth and resetSingleCategoryTemplate functions)

These functions should not be in the upstream file.

**Commit**: `refactor: Remove reset template functions from goal-template.ts (moved to separate file)`

---

### PHASE 3: Backend - API Registration

#### File 4: `/home/chid/git/actual/packages/loot-core/src/server/budget/app.ts`

**Action 1**: Add import for new file

**Location**: Top of file (around line 3-4)

**Find**:

```typescript
import * as goalActions from './goal-template';
```

**Add after**:

```typescript
import * as resetTemplateActions from './reset-goal-template';
```

**Action 2**: Update type definitions to use new module

**Location**: After line 34 (within BudgetHandlers interface)

**Find**:

```typescript
  'budget/apply-single-template': typeof goalActions.applySingleCategoryTemplate;
  'budget/cleanup-goal-template': typeof cleanupActions.cleanupTemplate;
  'budget/hold-for-next-month': typeof actions.holdForNextMonth;
```

**Replace with**:

```typescript
  'budget/apply-single-template': typeof goalActions.applySingleCategoryTemplate;
  'budget/cleanup-goal-template': typeof cleanupActions.cleanupTemplate;
  'budget/reset-templates-for-month': typeof resetTemplateActions.resetTemplatesForMonth;  // NEW
  'budget/reset-single-category-template': typeof resetTemplateActions.resetSingleCategoryTemplate;  // NEW
  'budget/hold-for-next-month': typeof actions.holdForNextMonth;
```

**Action 3**: Register API endpoints

**Location**: After line 103 (within app method registrations)

**Find**:

```typescript
app.method(
  'budget/cleanup-goal-template',
  mutator(undoable(cleanupActions.cleanupTemplate)),
);
app.method(
  'budget/hold-for-next-month',
  mutator(undoable(actions.holdForNextMonth)),
);
```

**Replace with**:

```typescript
app.method(
  'budget/cleanup-goal-template',
  mutator(undoable(cleanupActions.cleanupTemplate)),
);
app.method(
  'budget/reset-templates-for-month',
  mutator(undoable(resetTemplateActions.resetTemplatesForMonth)),
);  // NEW
app.method(
  'budget/reset-single-category-template',
  mutator(undoable(resetTemplateActions.resetSingleCategoryTemplate)),
);  // NEW
app.method(
  'budget/hold-for-next-month',
  mutator(undoable(actions.holdForNextMonth)),
);
```

**Notes**:

- Wrapped with `mutator` and `undoable` like existing template endpoints
- Imports from new reset-goal-template.ts file (not from goal-template.ts)
- Minimal change to app.ts - only import path changes

**Commit**: `feat: Register reset template API endpoints from reset-goal-template module`

---

### PHASE 4: Redux Actions

#### File 5: `/home/chid/git/actual/packages/desktop-client/src/budget/budgetSlice.ts`

**Action 1**: Add action types to `ApplyBudgetActionPayload`

**Location**: After line 318 (within ApplyBudgetActionPayload type)

**Find**:

```typescript
  | {
      type: 'cleanup-goal-template';
      month: string;
      args: never;
    }
  | {
      type: 'hold';
      month: string;
      args: {
        amount: number;
      };
    }
```

**Replace with**:

```typescript
  | {
      type: 'cleanup-goal-template';
      month: string;
      args: never;
    }
  | {
      type: 'reset-templates-for-month';
      month: string;
      args: never;
    }  // NEW
  | {
      type: 'reset-single-category-template';
      month: string;
      args: {
        category: CategoryEntity['id'];
      };
    }  // NEW
  | {
      type: 'hold';
      month: string;
      args: {
        amount: number;
      };
    }
```

**Action 2**: Add handlers in `applyBudgetAction` switch statement

**Location**: After line 489 (within applyBudgetAction function's switch statement)

**Find**:

```typescript
      case 'cleanup-goal-template':
        dispatch(
          addNotification({
            notification: await send('budget/cleanup-goal-template', { month }),
          }),
        );
        break;
      case 'hold':
        await send('budget/hold-for-next-month', {
          month,
          amount: args.amount,
        });
        break;
```

**Replace with**:

```typescript
      case 'cleanup-goal-template':
        dispatch(
          addNotification({
            notification: await send('budget/cleanup-goal-template', { month }),
          }),
        );
        break;
      case 'reset-templates-for-month':
        dispatch(
          addNotification({
            notification: await send('budget/reset-templates-for-month', { month }),
          }),
        );
        break;  // NEW
      case 'reset-single-category-template':
        dispatch(
          addNotification({
            notification: await send('budget/reset-single-category-template', {
              month,
              category: args.category,
            }),
          }),
        );
        break;  // NEW
      case 'hold':
        await send('budget/hold-for-next-month', {
          month,
          amount: args.amount,
        });
        break;
```

**Commit**: `feat: Add reset template Redux action types and handlers`

---

### PHASE 5: UI - Envelope Month Menu

#### File 6: `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/BudgetMonthMenu.tsx`

**Action 1**: Add prop type

**Location**: Line 8-19 (BudgetMonthMenuProps type)

**Find**:

```typescript
type BudgetMonthMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  onCopyLastMonthBudget: () => void;
  onSetBudgetsToZero: () => void;
  onSetMonthsAverage: (numberOfMonths: number) => void;
  onCheckTemplates: () => void;
  onApplyBudgetTemplates: () => void;
  onOverwriteWithBudgetTemplates: () => void;
  onEndOfMonthCleanup: () => void;
};
```

**Replace with**:

```typescript
type BudgetMonthMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  onCopyLastMonthBudget: () => void;
  onSetBudgetsToZero: () => void;
  onSetMonthsAverage: (numberOfMonths: number) => void;
  onCheckTemplates: () => void;
  onApplyBudgetTemplates: () => void;
  onOverwriteWithBudgetTemplates: () => void;
  onEndOfMonthCleanup: () => void;
  onResetBudgetTemplates: () => void;  // NEW
};
```

**Action 2**: Add prop to function signature

**Location**: Line 20-28

**Find**:

```typescript
export function BudgetMonthMenu({
  onCopyLastMonthBudget,
  onSetBudgetsToZero,
  onSetMonthsAverage,
  onCheckTemplates,
  onApplyBudgetTemplates,
  onOverwriteWithBudgetTemplates,
  onEndOfMonthCleanup,
  ...props
}: BudgetMonthMenuProps) {
```

**Replace with**:

```typescript
export function BudgetMonthMenu({
  onCopyLastMonthBudget,
  onSetBudgetsToZero,
  onSetMonthsAverage,
  onCheckTemplates,
  onApplyBudgetTemplates,
  onOverwriteWithBudgetTemplates,
  onEndOfMonthCleanup,
  onResetBudgetTemplates,  // NEW
  ...props
}: BudgetMonthMenuProps) {
```

**Action 3**: Add feature flag check

**Location**: Line 32 (after isGoalTemplatesEnabled)

**Find**:

```typescript
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  return (
```

**Replace with**:

```typescript
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const isResetTemplatesEnabled = useFeatureFlag('resetBudgetTemplates');  // NEW
  return (
```

**Action 4**: Add switch case handler

**Location**: After line 62 (within switch statement)

**Find**:

```typescript
        case 'cleanup-goal-template':
          onEndOfMonthCleanup();
          break;
      }
```

**Replace with**:

```typescript
        case 'cleanup-goal-template':
          onEndOfMonthCleanup();
          break;
        case 'reset-templates-for-month':
          onResetBudgetTemplates();
          break;  // NEW
      }
```

**Action 5**: Add nested menu item

**Location**: Within the isGoalTemplatesEnabled spread (around line 82-101)

**Find**:

```typescript
        ...(isGoalTemplatesEnabled
          ? [
              {
                name: 'check-templates',
                text: t('Check templates'),
              },
              {
                name: 'apply-goal-template',
                text: t('Apply budget template'),
              },
              {
                name: 'overwrite-goal-template',
                text: t('Overwrite with budget template'),
              },
              {
                name: 'cleanup-goal-template',
                text: t('End of month cleanup'),
              },
            ]
          : []),
```

**Replace with**:

```typescript
        ...(isGoalTemplatesEnabled
          ? [
              {
                name: 'check-templates',
                text: t('Check templates'),
              },
              {
                name: 'apply-goal-template',
                text: t('Apply budget template'),
              },
              {
                name: 'overwrite-goal-template',
                text: t('Overwrite with budget template'),
              },
              {
                name: 'cleanup-goal-template',
                text: t('End of month cleanup'),
              },
              ...(isResetTemplatesEnabled
                ? [
                    {
                      name: 'reset-templates-for-month',
                      text: t('Reset budget template'),
                    },
                  ]
                : []),  // NEW: Nested flag check
            ]
          : []),
```

**Commit**: `feat: Add reset template option to envelope month menu`

---

#### File 7: `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/BudgetSummary.tsx`

**Action**: Add handler to BudgetMonthMenu component

**Location**: Find where `<BudgetMonthMenu` is rendered (around line 250-260)

**Find the closing of the BudgetMonthMenu component props** (after `onEndOfMonthCleanup`)

**Add before the closing**:

```typescript
                  onResetBudgetTemplates={() => {
                    onBudgetAction(month, 'reset-templates-for-month');
                    onMenuClose();
                    showUndoNotification({
                      message: t(
                        '{{displayMonth}} budget templates have been reset to zero.',
                        { displayMonth },
                      ),
                    });
                  }}
```

**Notes**: This should be added after the `onEndOfMonthCleanup` handler, following the same pattern.

**Commit**: `feat: Wire up reset template handler in envelope budget summary`

---

### PHASE 6: UI - Tracking Month Menu

#### File 8: `/home/chid/git/actual/packages/desktop-client/src/components/budget/tracking/budgetsummary/BudgetMonthMenu.tsx`

Apply the same 5 actions as File 6:

1. Add `onResetBudgetTemplates: () => void;` to prop type
2. Add `onResetBudgetTemplates` to function signature
3. Add `const isResetTemplatesEnabled = useFeatureFlag('resetBudgetTemplates');`
4. Add switch case for `'reset-templates-for-month'`
5. Add nested menu item within template section

**Note**: Structure is similar to envelope version but may have slight differences in line numbers.

**Commit**: `feat: Add reset template option to tracking month menu`

---

#### File 9: Find and update the parent component for tracking budget summary

**Action**: Find where `BudgetMonthMenu` is used in tracking budget and add the `onResetBudgetTemplates` handler

**Search pattern**: Look for files in `/home/chid/git/actual/packages/desktop-client/src/components/budget/tracking/budgetsummary/` that render `BudgetMonthMenu`

**Handler to add**:

```typescript
onResetBudgetTemplates={() => {
  onBudgetAction(month, 'reset-templates-for-month');
  onMenuClose();
  showUndoNotification({
    message: t(
      '{{displayMonth}} budget templates have been reset to zero.',
      { displayMonth },
    ),
  });
}}
```

**Commit**: `feat: Wire up reset template handler in tracking budget summary`

---

### PHASE 7: UI - Envelope Category Menu

#### File 10: `/home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/BudgetMenu.tsx`

**Action 1**: Add prop type

**Location**: Line 8-15

**Find**:

```typescript
type BudgetMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  onCopyLastMonthAverage: () => void;
  onSetMonthsAverage: (numberOfMonths: number) => void;
  onApplyBudgetTemplate: () => void;
};
```

**Replace with**:

```typescript
type BudgetMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  onCopyLastMonthAverage: () => void;
  onSetMonthsAverage: (numberOfMonths: number) => void;
  onApplyBudgetTemplate: () => void;
  onResetBudgetTemplate: () => void;  // NEW
};
```

**Action 2**: Add prop to function signature

**Location**: Line 16-21

**Find**:

```typescript
export function BudgetMenu({
  onCopyLastMonthAverage,
  onSetMonthsAverage,
  onApplyBudgetTemplate,
  ...props
}: BudgetMenuProps) {
```

**Replace with**:

```typescript
export function BudgetMenu({
  onCopyLastMonthAverage,
  onSetMonthsAverage,
  onApplyBudgetTemplate,
  onResetBudgetTemplate,  // NEW
  ...props
}: BudgetMenuProps) {
```

**Action 3**: Add feature flag

**Location**: Line 24 (after isGoalTemplatesEnabled)

**Find**:

```typescript
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const onMenuSelect = (name: string) => {
```

**Replace with**:

```typescript
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const isResetTemplatesEnabled = useFeatureFlag('resetBudgetTemplates');  // NEW
  const onMenuSelect = (name: string) => {
```

**Action 4**: Add switch case

**Location**: After line 39 (within switch statement)

**Find**:

```typescript
      case 'apply-single-category-template':
        onApplyBudgetTemplate?.();
        break;
      default:
        throw new Error(`Unrecognized menu item: ${name}`);
```

**Replace with**:

```typescript
      case 'apply-single-category-template':
        onApplyBudgetTemplate?.();
        break;
      case 'reset-single-category-template':
        onResetBudgetTemplate?.();
        break;  // NEW
      default:
        throw new Error(`Unrecognized menu item: ${name}`);
```

**Action 5**: Add nested menu item

**Location**: Within isGoalTemplatesEnabled spread (around line 68-75)

**Find**:

```typescript
        ...(isGoalTemplatesEnabled
          ? [
              {
                name: 'apply-single-category-template',
                text: t('Overwrite with template'),
              },
            ]
          : []),
```

**Replace with**:

```typescript
        ...(isGoalTemplatesEnabled
          ? [
              {
                name: 'apply-single-category-template',
                text: t('Overwrite with template'),
              },
              ...(isResetTemplatesEnabled
                ? [
                    {
                      name: 'reset-single-category-template',
                      text: t('Reset template'),
                    },
                  ]
                : []),  // NEW
            ]
          : []),
```

**Commit**: `feat: Add reset template option to envelope category menu`

---

#### File 11: Find and update parent component that renders envelope BudgetMenu

**Action**: Find where `BudgetMenu` is used (likely in the modal component) and add the handler

**Search locations**:

- `/home/chid/git/actual/packages/desktop-client/src/components/modals/EnvelopeBudgetMenuModal.tsx`
- Or files that render the budget menu for individual categories

**Handler to add**:

```typescript
onResetBudgetTemplate={() => {
  onBudgetAction(month, 'reset-single-category-template', {
    category: categoryId
  });
  onClose();
  showUndoNotification({
    message: t('Category template has been reset to zero.'),
  });
}}
```

**Note**: The exact location depends on the modal/component structure. You'll need to pass `month` and `categoryId` from the modal props.

**Commit**: `feat: Wire up reset template handler in envelope category modal`

---

### PHASE 8: UI - Tracking Category Menu

#### File 12: `/home/chid/git/actual/packages/desktop-client/src/components/budget/tracking/BudgetMenu.tsx`

Apply the same 5 actions as File 10:

1. Add `onResetBudgetTemplate: () => void;` to prop type
2. Add `onResetBudgetTemplate` to function signature
3. Add `const isResetTemplatesEnabled = useFeatureFlag('resetBudgetTemplates');`
4. Add switch case for `'reset-single-category-template'`
5. Add nested menu item within template section

**Commit**: `feat: Add reset template option to tracking category menu`

---

#### File 13: Find and update parent component for tracking category menu

**Action**: Find where tracking `BudgetMenu` is used and add the handler

**Search locations**:

- `/home/chid/git/actual/packages/desktop-client/src/components/modals/TrackingBudgetMenuModal.tsx`

**Handler to add**: (same as File 11)

**Commit**: `feat: Wire up reset template handler in tracking category modal`

---

### PHASE 9: Testing & Documentation

#### Manual Testing Checklist

1. **Setup**:
   - [ ] Enable `goalTemplatesEnabled` feature flag
   - [ ] Enable `resetBudgetTemplates` experimental flag
   - [ ] Create test categories with both notes-based (#template) and UI-based templates
   - [ ] Apply templates to set budgeted amounts

2. **Test Month Menu (Envelope)**:
   - [ ] Open month kebab menu
   - [ ] Verify "Reset budget template" appears (when both flags enabled)
   - [ ] Click "Reset budget template"
   - [ ] Verify all templated categories reset to $0
   - [ ] Verify template definitions still exist (check notes/goal_def)
   - [ ] Verify undo notification appears
   - [ ] Test undo functionality
   - [ ] Verify can re-apply templates successfully

3. **Test Month Menu (Tracking)**:
   - [ ] Repeat all tests from step 2 in tracking budget view

4. **Test Category Menu (Envelope)**:
   - [ ] Click on category budget field to open modal
   - [ ] Verify "Reset template" appears in menu
   - [ ] Click "Reset template"
   - [ ] Verify only that category resets to $0
   - [ ] Verify template definition still exists
   - [ ] Verify undo works
   - [ ] Verify can re-apply template

5. **Test Category Menu (Tracking)**:
   - [ ] Repeat tests from step 4 in tracking budget view

6. **Test Flag Gating**:
   - [ ] Disable `resetBudgetTemplates` flag
   - [ ] Verify "Reset template" options disappear from all menus
   - [ ] Verify other template options still work
   - [ ] Disable `goalTemplatesEnabled` flag
   - [ ] Verify all template options disappear

7. **Test Edge Cases**:
   - [ ] Try resetting month with no templates (verify message)
   - [ ] Try resetting category with no template (verify error)
   - [ ] Test with mix of notes-based and UI-based templates
   - [ ] Test in different months

#### Update FORK_NOTES.md

Add to `/home/chid/git/actual/integration-chad/FORK_NOTES.md`:

```markdown
## Reset Budget Templates Feature

**Flag**: `resetBudgetTemplates` (experimental)

**Added**: [DATE]

**Purpose**: Allow users to reset/unapply budget templates for a specific month without removing template definitions.

**Seams Added**:
- Month menu items (nested within goalTemplatesEnabled check)
- Category menu items (nested within goalTemplatesEnabled check)

**Core Logic**:
- `resetTemplatesForMonth()` - Sets all templated categories to $0 for a month
- `resetSingleCategoryTemplate()` - Sets single category to $0 for a month
- API endpoints: `budget/reset-templates-for-month`, `budget/reset-single-category-template`

**Files Modified** (additive changes only):
- Feature flag: `prefs.ts`, `useFeatureFlag.ts`
- Backend: `goal-template.ts`, `app.ts`
- Redux: `budgetSlice.ts`
- UI: 4 menu components + 4 parent components (envelope/tracking × month/category)

**Rationale**: Users frequently need to "undo" template applications without losing their template definitions. Previously required manually removing `#template` from notes, re-applying, then adding back.

**Removal**: Can be cleanly removed by deleting all NEW comments in the above files and removing the feature flag.
```

**Commit**: `docs: Add reset budget templates feature to FORK_NOTES`

---

## Implementation Summary

### Files Created: 1

1. `packages/loot-core/src/server/budget/reset-goal-template.ts` - New module with reset logic (completely separate from upstream)

### Files Modified: 12

**Backend (loot-core)**:

1. `packages/loot-core/src/types/prefs.ts` - Feature flag type (PHASE 1)
2. `packages/loot-core/src/server/budget/goal-template.ts` - Delete incorrect functions (PHASE 2b)
3. `packages/loot-core/src/server/budget/app.ts` - API registration with new imports (PHASE 3)

**Frontend (desktop-client)**:

4. `packages/desktop-client/src/hooks/useFeatureFlag.ts` - Feature flag default (PHASE 1)
5. `packages/desktop-client/src/budget/budgetSlice.ts` - Redux actions (PHASE 4)
6. `packages/desktop-client/src/components/budget/envelope/budgetsummary/BudgetMonthMenu.tsx` - Envelope month menu (PHASE 5)
7. `packages/desktop-client/src/components/budget/envelope/budgetsummary/BudgetSummary.tsx` - Envelope month handler (PHASE 5)
8. `packages/desktop-client/src/components/budget/tracking/budgetsummary/BudgetMonthMenu.tsx` - Tracking month menu (PHASE 6)
9. `packages/desktop-client/src/components/budget/tracking/budgetsummary/[Parent].tsx` - Tracking month handler (PHASE 6)
10. `packages/desktop-client/src/components/budget/envelope/BudgetMenu.tsx` - Envelope category menu (PHASE 7)
11. `packages/desktop-client/src/components/modals/EnvelopeBudgetMenuModal.tsx` - Envelope category handler (PHASE 7)
12. `packages/desktop-client/src/components/budget/tracking/BudgetMenu.tsx` - Tracking category menu (PHASE 8)
13. `packages/desktop-client/src/components/modals/TrackingBudgetMenuModal.tsx` - Tracking category handler (PHASE 8)

### Estimated Lines of Code: ~200 LOC

- New file: ~150 LOC
- Deletions from goal-template.ts: ~70 LOC
- Changes in app.ts: ~5 LOC
- UI/Redux changes: ~50 LOC

---

## Rollback Instructions

If this feature needs to be removed:

1. Delete `/packages/loot-core/src/server/budget/reset-goal-template.ts`
2. Remove import of `resetTemplateActions` from `/packages/loot-core/src/server/budget/app.ts`
3. Remove API type definitions and method registrations from `app.ts` (marked with `// NEW`)
4. Remove `resetBudgetTemplates` from `prefs.ts` and `useFeatureFlag.ts`
5. Search for `// NEW` comments in all UI files and remove those lines
6. Git commit with messages:
   - `revert: Delete reset-goal-template.ts module`
   - `revert: Remove reset template API registrations`
   - `revert: Remove resetBudgetTemplates feature flag and UI extensions`

All changes are isolated, marked, and in a separate file making removal clean.

---

## Fork Compliance Verification

Per AGENTS-chad-fork.md:

✅ **Upstream is source of truth**: Default behavior unchanged when flags disabled
✅ **Prefer additive changes**: New file created, no modifications to upstream goal-template.ts core logic
✅ **Flags gate extensions**: Menu items only appear when both goalTemplatesEnabled AND resetBudgetTemplates flags enabled
✅ **Behavior in core, presentation in web**: Reset logic in loot-core (new file), UI in desktop-client
✅ **Flags default to false**: resetBudgetTemplates defaults false
✅ **Seams independent**: API registration seam at app.ts is minimal (only import path)
✅ **High-level seams**: Extensions at menu item level, uses existing menu infrastructure
✅ **Easy to remove**: All changes marked with `// NEW` comments, separate file, easy deletion
✅ **Documented**: FORK_NOTES.md will be updated with rationale
✅ **No merge conflicts**: Reset logic completely separate from upstream goal-template.ts
✅ **Stable imports**: Only imports stable helpers (getTemplates, storeNoteTemplates, setGoal)

---

## Next Steps

1. Create feature branch from `custom/integration`
2. Implement phases 1-8 sequentially
3. Test thoroughly using checklist in Phase 9
4. Update FORK_NOTES.md
5. Commit and push feature branch
6. Test with actual templates in real budget
7. Merge to `custom/integration` when stable
