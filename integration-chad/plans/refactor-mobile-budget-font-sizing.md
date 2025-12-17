# Refactor Mobile Budget Font Sizing - Seam Architecture

## Problem Statement

The `increaseMobileBudgetTableFontSize` feature (commit 6ae70465c) violates AGENTS-chad-fork.md principles by:

1. **Scattered edits across 7 component files** - Same conditional logic repeated in BalanceCell, BudgetCell, BudgetTable, ExpenseCategoryListItem, ExpenseGroupListItem, IncomeGroup, and SpentCell
2. **No intentional seam** - Changes are scattered leaf components instead of at layout boundaries
3. **High merge conflict risk** - Upstream changes to any mobile budget component will conflict
4. **Difficult to remove** - Disabling this feature requires touching 7+ files (warning sign per AGENTS)
5. **Code duplication** - `useFeatureFlag()` + `useSyncedPref()` pattern repeated identically

## Objectives

- Consolidate font sizing logic into **one source of truth** (a custom hook)
- Reduce surface area from 7 files to 1 hook definition
- Make the feature a true additive extension via seam pattern
- Maintain identical visual/behavioral output
- Prepare for potential layout-level seam in future if needed

## Approach

### Phase 1: Create Custom Hook (Seam)

Create `packages/desktop-client/src/hooks/useMobileBudgetFontSize.ts` that encapsulates:

- Feature flag check
- Preference reading
- Computed values for minFontSizePx, maxFontSizePx, fontSize styles

### Phase 2: Refactor Components

Update the 7 mobile budget components to use the hook instead of inline logic.

### Phase 3: Clean Up

- Remove agent log comments (`/* #region agent log */`)
- Verify visual parity with before/after
- Document changes in FORK_NOTES.md

## Detailed Implementation Steps

### Step 1: Create New Hook File

**File:** `packages/desktop-client/src/hooks/useMobileBudgetFontSize.ts`

```typescript
import { useFeatureFlag } from './useFeatureFlag';
import { useSyncedPref } from './useSyncedPref';
import { theme } from '@actual-app/components/theme';

type FontSizingConfig = {
  isEnabled: boolean;
  fontSize: number;
  minFontSizePx: number;
  maxFontSizePx: number;
  fontSizeStyle: string | number;
};

/**
 * Hook providing mobile budget font sizing logic.
 *
 * When the `increaseMobileBudgetTableFontSize` feature flag is enabled,
 * applies user-selected font size (12-20px). When disabled, uses default sizing.
 *
 * Centralizes the feature flag logic to reduce scattered edits across components.
 * This is the intentional seam for the mobile budget font sizing feature.
 */
export function useMobileBudgetFontSize(): FontSizingConfig {
  const isEnabled = useFeatureFlag('increaseMobileBudgetTableFontSize');
  const [fontSizePref = '14'] = useSyncedPref('mobileBudgetTableFontSize');
  const fontSize = parseInt(fontSizePref);

  return {
    isEnabled,
    fontSize,
    minFontSizePx: isEnabled ? 8 : 6,
    maxFontSizePx: isEnabled ? fontSize : 12,
    fontSizeStyle: isEnabled ? `${fontSize}px` : theme.mobileBudgetTableFontSize,
  };
}
```

### Step 2: Update BalanceCell.tsx

**File:** `packages/desktop-client/src/components/mobile/budget/BalanceCell.tsx`

**Changes:**

1. Remove `useFeatureFlag` and `useSyncedPref` imports for font sizing
2. Add `import { useMobileBudgetFontSize }`
3. Remove these lines:
   ```tsx
   const increaseFonts = useFeatureFlag('increaseMobileBudgetTableFontSize');
   const [fontSize = '14'] = useSyncedPref('mobileBudgetTableFontSize');
   ```
4. Add:
   ```tsx
   const fontSizing = useMobileBudgetFontSize();
   ```
5. Replace all occurrences of:
   ```tsx
   minFontSizePx={increaseFonts ? 8 : 6}
   maxFontSizePx={increaseFonts ? parseInt(fontSize) : 12}
   fontSize: increaseFonts ? `${fontSize}px` : theme.mobileBudgetTableFontSize,
   ```
   with:
   ```tsx
   minFontSizePx={fontSizing.minFontSizePx}
   maxFontSizePx={fontSizing.maxFontSizePx}
   fontSize: fontSizing.fontSizeStyle,
   ```

**Location of changes:**

- Line ~50: Remove old hook calls
- Line ~50: Add new hook call
- Lines ~100-115: Update AutoTextSize properties in BalanceCell render
- (Search file for "increaseFonts" and "fontSize =" to find all occurrences)

### Step 3: Update BudgetCell.tsx

**File:** `packages/desktop-client/src/components/mobile/budget/BudgetCell.tsx`

Follow same pattern as BalanceCell.tsx:

1. Replace useFeatureFlag/useSyncedPref with useMobileBudgetFontSize
2. Update all AutoTextSize min/maxFontSizePx properties
3. Update fontSize style property

**Locations:**

- Line ~50: Hook setup
- Lines ~150-160: First AutoTextSize block

### Step 4: Update BudgetTable.tsx

**File:** `packages/desktop-client/src/components/mobile/budget/BudgetTable.tsx`

**Additional cleanup:** Remove agent log comments

1. In `ToBudget()` function (~line 74):
   - Replace font sizing setup (lines ~76-77)
   - Update AutoTextSize calls (lines ~91-95, ~110-116)
   - **Remove** lines with `{/* #region agent log */}` and `{/* #endregion */}`

2. In `Saved()` function (~line 165):
   - Replace font sizing setup (lines ~167-168)
   - Update AutoTextSize calls (lines ~184-190, ~215-222)
   - **Remove** agent log comments

3. In `BudgetTableHeader()` function (~line 422):
   - Replace font sizing setup (lines ~426-427)
   - Update amountStyle fontSize (line ~436)
   - Update AutoTextSize calls in both "Budgeted" and "Spent" column sections

### Step 5: Update ExpenseCategoryListItem.tsx

**File:** `packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx`

1. In `ExpenseCategoryName()` function (~line 42):
   - Replace lines ~51-52 (old hook calls)
   - Add useMobileBudgetFontSize call
   - Update Text style fontSize at line ~92-94

**Search pattern:** Look for `increaseFonts` and replace the conditional style block.

### Step 6: Update ExpenseGroupListItem.tsx

**File:** `packages/desktop-client/src/components/mobile/budget/ExpenseGroupListItem.tsx`

1. In `ExpenseGroupName()` function (~line 191):
   - Replace lines ~194-195
   - Add useMobileBudgetFontSize call
   - Update Text style fontSize at lines ~257-259

2. In `ExpenseGroupCells()` function (~line 283):
   - Replace lines ~286-287
   - Add useMobileBudgetFontSize call
   - Update amountStyle fontSize at line ~298
   - Update all AutoTextSize min/maxFontSizePx in three places (budgeted, spent, balance columns)

### Step 7: Update IncomeGroup.tsx

**File:** `packages/desktop-client/src/components/mobile/budget/IncomeGroup.tsx`

Follow the same pattern - search for `increaseFonts` and `useSyncedPref('mobileBudgetTableFontSize')` and replace with useMobileBudgetFontSize hook.

### Step 8: Update SpentCell.tsx

**File:** `packages/desktop-client/src/components/mobile/budget/SpentCell.tsx`

Follow the same pattern as other Cell components.

### Step 9: Create FORK_NOTES.md

**File:** `FORK_NOTES.md` (in root or integration-chad/)

Document the seam and feature flags:

```markdown
# Fork Customizations

## Feature Flags

### increaseMobileBudgetTableFontSize
- **Location:** `loot-core/src/types/prefs.ts` (flag definition)
- **Hook:** `useMobileBudgetFontSize()` in `@desktop-client/hooks`
- **UI Control:** Experimental settings > "Increase mobile budget table font size"
- **Seam Point:** Custom hook centralizes logic, all mobile budget components use this hook
- **Rationale:** Allow users to increase mobile budget table font sizes (12-20px) for accessibility
- **Removable:** Yes - hook is the only integration point, feature can be cleanly removed

### budget-tooltip-goals
- **Location:** `loot-core/src/types/prefs.ts` (flag definition)
- **Component:** `TotalsList.tsx` - renders additional row in "To Budget" tooltip
- **UI Control:** Experimental settings > "Budget tooltip goals"
- **Seam Point:** Component-level conditional rendering
- **Rationale:** [To be determined - placeholder for future features related to budget goals in tooltip]
- **Removable:** Yes - simple conditional, no scattered changes

## Seams

### useMobileBudgetFontSize Hook
- **Purpose:** Encapsulate mobile budget font sizing logic
- **Scope:** Used by 7 mobile budget components (BalanceCell, BudgetCell, BudgetTable, etc.)
- **Architecture:** Single source of truth for feature flag + preference reading + computed values
- **Upstream safe:** No modifications to upstream component logic, only hook usage

## Core Changes

None - all changes are UI/presentation only in `@actual-app/web` (desktop-client).

## Code Organization

- Feature-specific hooks: `packages/desktop-client/src/hooks/useMobileBudgetFontSize.ts`
- Feature-specific UI settings: `packages/desktop-client/src/components/settings/Experimental.tsx`
- Components that use features: Standard mobile budget components (no custom directory needed yet)
```

### Step 10: Verify and Test

After all changes:

1. **Build verification:**

   ```bash
   npm run build
   ```

2. **Visual verification:**
   - Open mobile budget view
   - Toggle "Increase mobile budget table font size" in experimental settings
   - Verify font sizes change correctly for:
     - Category names
     - Group names
     - Budget amounts
     - Spent amounts
     - Balance amounts
   - Verify all text still fits and doesn't overlap
   - Test with font sizes 12px through 20px

3. **No regression verification:**
   - Budget tooltip goals feature still works
   - Mobile budget layout unchanged when feature is disabled
   - No console errors

4. **Code quality:**
   - No unused imports in refactored files
   - TypeScript compilation clean
   - No lint errors

## File Checklist

Files to create:

- [ ] `packages/desktop-client/src/hooks/useMobileBudgetFontSize.ts`
- [ ] `FORK_NOTES.md`

Files to modify:

- [ ] `packages/desktop-client/src/components/mobile/budget/BalanceCell.tsx`
- [ ] `packages/desktop-client/src/components/mobile/budget/BudgetCell.tsx`
- [ ] `packages/desktop-client/src/components/mobile/budget/BudgetTable.tsx` (also remove agent log comments)
- [ ] `packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx`
- [ ] `packages/desktop-client/src/components/mobile/budget/ExpenseGroupListItem.tsx`
- [ ] `packages/desktop-client/src/components/mobile/budget/IncomeGroup.tsx`
- [ ] `packages/desktop-client/src/components/mobile/budget/SpentCell.tsx`

Files NOT to modify (no changes needed):

- `loot-core/src/types/prefs.ts` - Flag definition already correct
- `packages/desktop-client/src/hooks/useFeatureFlag.ts` - Hook already correct
- `packages/desktop-client/src/components/settings/Experimental.tsx` - UI already correct

## Success Criteria

✅ All 7 mobile budget component files use `useMobileBudgetFontSize()` hook
✅ No `const increaseFonts = useFeatureFlag()` inline in components
✅ No `const [fontSize] = useSyncedPref()` inline in components
✅ All agent log comments removed
✅ Visual behavior identical before/after
✅ TypeScript compilation clean
✅ No new console errors/warnings
✅ FORK_NOTES.md documents the seam and feature flags
✅ Feature can be toggled in experimental settings without errors

## Rollback Plan

If something breaks:

1. Git diff against current commit to see what was changed
2. Reset to current commit: `git reset --hard HEAD`
3. Review this plan for what went wrong

## Merge Impact

After this refactor:

- **Smaller conflict surface:** Font sizing changes consolidated to 1 hook instead of 7 files
- **Easier upstream merges:** Only need to update hook if font sizing logic changes
- **Better AGENTS alignment:** Single intentional seam instead of scattered edits
- **Removable feature:** Can remove entire feature by deleting hook and 7 import lines
