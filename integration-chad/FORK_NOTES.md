# Fork Customizations & Architecture Notes

## Overview

This document tracks all customizations to the Actual Budget fork, including feature flags, seams (extension points), and architectural decisions. See `AGENTS-chad-fork.md` for governance principles.

**Status:** Work in progress - seam refactoring planned to improve alignment with AGENTS principles.

---

## Feature Flags

### `increaseMobileBudgetTableFontSize`

**Status:** ⚠️ Needs refactoring (see `plans/refactor-mobile-budget-font-sizing.md`)

**Purpose:** Allow users to increase mobile budget table font sizes for accessibility

**Current Implementation:**
- Flag type: `loot-core/src/types/prefs.ts`
- Hook: `packages/desktop-client/src/hooks/useFeatureFlag.ts`
- Preference: `mobileBudgetTableFontSize` (values: 12-20px, default 14)
- UI Control: Settings > Experimental > "Increase mobile budget table font size"
- Font size dropdown: 12px to 20px

**Technical Details:**
- When enabled: Adjusts `minFontSizePx` and `maxFontSizePx` props for `AutoTextSize` components
- When disabled: Uses default sizing (minFontSizePx=6, maxFontSizePx=12)
- Applies to: Category names, group headers, amounts (budget/spent/balance)

**Issues (As of commit 6ae70465c):**
- ❌ Scattered across 7 component files (BalanceCell, BudgetCell, BudgetTable, ExpenseCategoryListItem, ExpenseGroupListItem, IncomeGroup, SpentCell)
- ❌ Same logic duplicated in each component
- ❌ No intentional seam - leaf component changes instead of layout-level extension
- ❌ High merge conflict risk when upstream changes mobile budget components
- 🔧 Planned refactor: Consolidate into `useMobileBudgetFontSize()` hook (see `plans/refactor-mobile-budget-font-sizing.md`)

**Removability:** Moderate (7 files require changes, but refactor will make it easy)

---

### `budget-tooltip-goals`

**Status:** ✅ Well-implemented seam

**Purpose:** Enhance "To Budget" tooltip with additional goal-related information

**Current Implementation:**
- Flag type: `loot-core/src/types/prefs.ts`
- Component: `packages/desktop-client/src/components/budget/envelope/budgetsummary/TotalsList.tsx`
- UI Control: Settings > Experimental > "Budget tooltip goals"
- Behavior: Conditionally renders "test" label with value "133" and separator line

**Technical Details:**
- Implemented as component-level conditional rendering
- When enabled: Adds test row and horizontal separator to tooltip
- When disabled: No changes to default tooltip
- No code duplication
- Single point of change

**AGENTS Alignment:** ✅ Good
- Simple conditional addition (seam pattern)
- No scattered edits
- Easy to remove
- Upstream behavior unchanged when flag disabled

**Removability:** High (delete conditional block from one component)

**Future Work:** This is a placeholder. Actual implementation would:
- Display progress toward budget goals
- Show goal targets (e.g., "Save $500 by month-end")
- Provide visual feedback on goal status

---

## Seams (Extension Points)

### Experimental Settings UI Seam

**Location:** `packages/desktop-client/src/components/settings/Experimental.tsx`

**Purpose:** Central location to toggle all experimental/fork features

**Pattern:**
```tsx
<FeatureToggle flag="featureName">
  <Trans>Display Label</Trans>
</FeatureToggle>
```

**Benefits:**
- Users discover fork features in one place
- Consistent toggle UI
- Easy to add new features

**Connected features:**
- `budget-tooltip-goals` (line 182-184)
- `increaseMobileBudgetTableFontSize` (line 185-212)
  - Includes sub-control for font size dropdown when enabled (lines 188-212)

---

## Core Logic Changes

**Status:** ✅ None required

All fork customizations are UI/presentation layer only in `@actual-app/web` (desktop-client). No changes to `loot-core` behavior logic.

---

## Theme Modifications

### Mobile Budget Font Size Tokens

**Location:** `packages/component-library/src/theme.ts` and theme files

**Issue:** ⚠️ Token naming inconsistency

**Current:**
```typescript
mobileBudgetTableFontSize: 'var(--color-mobileBudgetTableFontSize)',
mobileBudgetTableFontSizeLarge: 'var(--color-mobileBudgetTableFontSizeLarge)',
```

**Problem:** Named with `--color-` prefix but contain font sizes (not colors)

**Planned fix:** Rename to use semantic naming:
```typescript
mobileBudgetTableFontSize: 'var(--mobile-budget-table-font-size)',
mobileBudgetTableFontSizeLarge: 'var(--mobile-budget-table-font-size-large)',
```

---

## Code Quality Issues

### Agent Log Comments

**Location:** `packages/desktop-client/src/components/mobile/budget/BudgetTable.tsx`

**Issue:** Lines with `/* #region agent log */` and `/* #endregion */` are present

**Status:** Needs removal

**Why:** These are debugging/tracing artifacts, not production code

**Files affected:**
- BudgetTable.tsx (lines in ToBudget and Saved functions)

---

### Unrelated Changes

**Location:** `packages/desktop-client/src/components/formula/codeMirror-excelLanguage.tsx`

**Issue:** ~150 lines of changes including tooltip styling, autocomplete themes, i18n wrapping

**Status:** Needs clarification

**Action needed:** Document rationale - are these:
- Fork-only improvements (document in this file)?
- General improvements to upstream (upstream-merge candidates)?
- Accident merges (should be reverted)?

---

### Query.js Additions

**Location:** `packages/api/app/query.js`

**Added methods:**
```javascript
reset() { return q(this.state.table); }
serializeAsString() { return JSON.stringify(this.serialize()); }
```

**Issue:** Unclear if these are used by fork features or unrelated additions

**Status:** Needs documentation

**Action needed:** Clarify:
- What uses these methods?
- Are they fork-specific or upstream candidates?
- Should they be documented in architecture?

---

## Documentation Structure

Fork documentation is organized as:

```
integration-chad/
├── AGENTS-chad-fork.md          # Governance rules & principles
├── FORK_NOTES.md                # This file - customization tracking
└── plans/
    ├── refactor-mobile-budget-font-sizing.md   # In progress
    ├── budget-tooltip-goals.md                 # Original planning doc
    └── [future features].md
```

**Purpose of `plans/`:** Technical proposals, implementation roadmaps, and architectural decisions. Not for daily maintenance notes.

**Purpose of `FORK_NOTES.md`:** Track what's been customized, why, current issues, and ongoing refactoring work.

---

## Merge Strategy

### Upstream Merge Checklist

When merging upstream commits:

1. **Check for conflicts in:**
   - `packages/desktop-client/src/components/mobile/budget/` (high risk until font-sizing seam is consolidated)
   - `packages/desktop-client/src/components/settings/Experimental.tsx` (medium risk)
   - `loot-core/src/types/prefs.ts` (low risk - only needs new FeatureFlag types added)

2. **Verify no regression:**
   - Mobile budget renders correctly
   - Experimental settings toggles work
   - No console errors

3. **Document merge conflicts** if they occur

---

## Recommended Next Steps

### High Priority
1. ✅ Create detailed refactor plan ← **DONE** (see `plans/refactor-mobile-budget-font-sizing.md`)
2. ⬜ Execute font sizing seam refactoring
3. ⬜ Remove agent log comments
4. ⬜ Document unrelated changes (codeMirror, Query.js)

### Medium Priority
5. ⬜ Clarify theme token naming and migrate to semantic CSS variable names
6. ⬜ Plan actual implementation of `budget-tooltip-goals` feature (currently placeholder)

### Low Priority
7. ⬜ Consider creating layout-level seam for font sizing in future (if feature grows)

---

## Appendix: Alignment with AGENTS Principles

| Principle | Status | Notes |
|-----------|--------|-------|
| **Upstream is source of truth** | ✅ | Flags default to false, upstream behavior unchanged when disabled |
| **Prefer additive changes** | ⚠️ | budget-tooltip-goals is good, font sizing needs refactoring |
| **Flags gate extensions, not rewrites** | ⚠️ | Flags gate correctly, but implementation scattered |
| **Seams are intentional** | ⚠️ | budget-tooltip-goals excellent, font sizing needs seam |
| **Behavior in core, UI in web** | ✅ | All customizations are UI-only (desktop-client) |
| **Code organization** | ⚠️ | No custom directory yet, scattered changes in standard dirs |
| **Sustainability** | ⚠️ | Font sizing high merge-conflict risk, budget-tooltip-goals low risk |

**Summary:** Core architecture is sound. Main work is consolidating the mobile budget font sizing feature into a proper seam.
