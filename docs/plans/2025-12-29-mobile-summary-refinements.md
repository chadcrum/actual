# Mobile Summary Page UI Refinements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refine the mobile summary/home page UI to display current month overview with cleaner layout and better column alignment.

**Architecture:**

- Simplify MobileSummaryPage to hardcode current month (remove month navigation)
- Update header to display "December Overview" (current month dynamically)
- Add "Budget summary" text header above the data table
- Add horizontal padding to table to bring left/right columns closer together

**Tech Stack:** React, TypeScript, Flexbox layout, theme system

---

## Current State

The mobile summary page has been created with:

- MobileSummaryPage.tsx - Main component with month navigation
- SummaryTable.tsx - Data display table
- Feature flag `enableMobileSummary` controlling visibility

## Refinements Needed

1. Hardcode to current month (no prev/next navigation)
2. Change header from MonthSelector to static "December Overview"
3. Add "Budget summary" header label
4. Add horizontal padding to table columns

---

## Task 1: Update MobileSummaryPage Header and Remove Month Navigation

**Files:**

- Modify: `packages/desktop-client/src/components/mobile/summary/MobileSummaryPage.tsx`

**Step 1: Remove unused imports and simplify component**

Current imports to remove:

- `useCallback` (no longer needed without month callbacks)
- `useLocalPref` (no longer storing startMonth preference)
- `MonthSelector` from BudgetPage (replacing with static header)
- `send` from fetch (no longer getting month bounds)

Current state variables to remove:

- `[startMonth, setStartMonthPref]` - useState for month preference
- `[monthBounds, setMonthBounds]` - useState for month bounds
- `onPrevMonth`, `onNextMonth`, `onCurrentMonth` callbacks
- `onOpenBudgetMonthMenu` callback

**Step 2: Verify the month formatting function exists**

Check that `monthUtils.format(currMonth, 'MMMM')` returns the month name (e.g., "December")

File: `packages/loot-core/src/shared/months.ts`
Look for: `export function format(month: DateLike, format: string, locale?: Locale): string`

**Step 3: Run TypeScript check**

```bash
cd /home/chid/git/actual
npm run typecheck 2>&1 | grep -A2 "MobileSummaryPage"
```

Expected: No errors in MobileSummaryPage.tsx

**Step 4: Verify header renders correctly**

The header should now display dynamically:

```tsx
const monthName = monthUtils.format(currMonth, 'MMMM');
<MobilePageHeader title={`${monthName} Overview`} />
```

This will produce: "December Overview", "January Overview", etc.

**Step 5: Commit**

```bash
cd /home/chid/git/actual
git add packages/desktop-client/src/components/mobile/summary/MobileSummaryPage.tsx
git commit -m "refactor: hardcode summary page to current month and simplify header

- Remove month navigation (prev/next buttons)
- Replace MonthSelector with static 'Month Overview' header
- Use monthUtils.format() to display current month name dynamically
- Remove startMonth preference, monthBounds, and navigation callbacks
- Simplify useEffect to only prewarm current month"
```

---

## Task 2: Add "Budget summary" Header and Horizontal Padding to SummaryTable

**Files:**

- Modify: `packages/desktop-client/src/components/mobile/summary/SummaryTable.tsx`
- Import needed: `Text` from `@actual-app/components/text`

**Step 1: Verify Text component import exists**

Check imports at top of SummaryTable.tsx:

```tsx
import { Text } from '@actual-app/components/text';
```

If not present, add it.

**Step 2: Add "Budget summary" header**

In the outer View (line ~26-32), after the opening View, add:

```tsx
<Text
  style={{
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 16,
    color: theme.pageText,
  }}
>
  <Trans>Budget summary</Trans>
</Text>
```

This creates a medium-prominence header (18px, 600 weight) with 16px bottom margin.

**Step 3: Add horizontal padding to table rows container**

In the inner View (line ~33-37 after header), add `paddingHorizontal: 8`:

```tsx
<View
  style={{
    backgroundColor: theme.mobilePageBackground,
    paddingHorizontal: 8,  // Add this line
  }}
>
```

This brings left and right columns 8px closer together by reducing horizontal space.

**Step 4: Run TypeScript check**

```bash
cd /home/chid/git/actual
npm run typecheck 2>&1 | grep -A2 "SummaryTable"
```

Expected: No errors in SummaryTable.tsx

**Step 5: Verify layout visually in mind (code review)**

The layout should now be:

```
┌─────────────────────────────────┐
│ December Overview         [Icon] │  ← Header
├─────────────────────────────────┤
│                                 │
│ Budget summary                  │  ← New text header
│                                 │
│  Budgeted    $2,500.00         │  ← Padded rows closer together
│  Spent       $1,200.00         │
│  Goal Target   $500.00         │
│  Underfunded     $0.00         │
│                                 │
└─────────────────────────────────┘
```

**Step 6: Commit**

```bash
cd /home/chid/git/actual
git add packages/desktop-client/src/components/mobile/summary/SummaryTable.tsx
git commit -m "refactor: add budget summary header and adjust table padding

- Add 'Budget summary' text header with medium prominence (18px, 600 weight)
- Add 8px horizontal padding to table rows to bring columns closer
- Import Text component from theme system
- Maintains responsive layout and theme colors"
```

---

## Task 3: Full TypeScript Build and Verification

**Files:**

- Check: All modified files compile without errors

**Step 1: Run full typecheck**

```bash
cd /home/chid/git/actual
npm run typecheck
```

Expected output: Should see completion message, no errors in `dist/` folder

**Step 2: If errors occur, review error message**

```bash
npm run typecheck 2>&1 | head -20
```

Common issues:

- `monthUtils.format` function signature mismatch
- Text component import not found
- Trans component syntax error

**Step 3: Fix any errors and re-run**

If there are errors, trace back to the file and fix the issue before proceeding.

**Step 4: Verify git status**

```bash
cd /home/chid/git/actual
git status
```

Should show:

- Modified: `packages/desktop-client/src/components/mobile/summary/MobileSummaryPage.tsx`
- Modified: `packages/desktop-client/src/components/mobile/summary/SummaryTable.tsx`

**Step 5: View changes summary**

```bash
git diff --stat
```

Should show 2 files changed.

**Step 6: Commit verification**

```bash
git log --oneline -3
```

Should show:

- "refactor: add budget summary header and adjust table padding"
- "refactor: hardcode summary page to current month and simplify header"
- Previous commit from earlier work

---

## Task 4: Test the Feature Flag and Visual Verification

**Files:**

- Check: `packages/desktop-client/src/components/settings/Experimental.tsx`
- Verify: Feature flag toggle exists for `enableMobileSummary`

**Step 1: Verify experimental flag is present**

Search for `enableMobileSummary` in Experimental.tsx:

```bash
grep -n "enableMobileSummary" /home/chid/git/actual/packages/desktop-client/src/components/settings/Experimental.tsx
```

Expected: Should find the FeatureToggle component with `flag="enableMobileSummary"`

**Step 2: Verify flag label is clear**

The toggle should show: "Mobile summary/home page (new default landing page)"

If missing, add this FeatureToggle:

```tsx
<FeatureToggle flag="enableMobileSummary">
  <Trans>Mobile summary/home page (new default landing page)</Trans>
</FeatureToggle>
```

**Step 3: Check default flag state**

Verify in `packages/desktop-client/src/hooks/useFeatureFlag.ts`:

```bash
grep -n "enableMobileSummary" /home/chid/git/actual/packages/desktop-client/src/hooks/useFeatureFlag.ts
```

Expected: Should find `enableMobileSummary: false` in DEFAULT_FEATURE_FLAG_STATE

**Step 4: Summary of verification**

Components involved:

- MobileSummaryPage.tsx - Renders "December Overview" header and summary data
- SummaryTable.tsx - Displays table with "Budget summary" header and padded columns
- MobileNavTabs.tsx - Shows Home tab in navigation when flag enabled
- FinancesApp.tsx - Routes to /summary and makes it default landing page

**Step 5: No commit needed**

This task is verification only. Features should already be implemented from previous work.

---

## Task 5: Create Branch and Final Commit

**Files:**

- Check branch: `feat/mobile-summary-page`
- Verify: All changes committed

**Step 1: Check current branch**

```bash
cd /home/chid/git/actual
git branch --show-current
```

Expected: Should be on `feat/mobile-summary-page`

**Step 2: View commit log for this feature**

```bash
git log --oneline feat/mobile-summary-page...integration | head -10
```

Should show all commits related to mobile summary page feature, including:

- Initial feature implementation
- TypeScript fixes
- Experimental settings toggle
- Header and padding refinements

**Step 3: Verify working tree is clean**

```bash
git status
```

Expected: "nothing to commit, working tree clean"

**Step 4: Final summary**

Feature implementation complete:

- ✅ Mobile summary page created with month navigation
- ✅ Feature flag `enableMobileSummary` added and exposed in Settings
- ✅ Navigation seam added to show Home tab when enabled
- ✅ Default route updated to use summary page when flag enabled
- ✅ UI refinements: current month header, budget summary label, column padding

**Step 5: Ready for merge or review**

No commit needed - all work is already committed.

---

## Testing Checklist

Before considering this complete:

- [ ] TypeScript build passes with no errors
- [ ] Feature flag toggle appears in Settings → Experimental Features
- [ ] Toggling the flag on/off works without errors
- [ ] When enabled: Home page appears in mobile navigation
- [ ] When enabled: Default landing page is /summary instead of /budget
- [ ] Summary page header displays current month (e.g., "December Overview")
- [ ] "Budget summary" text appears above the data table
- [ ] Table columns (Budgeted/Spent/Goal Target/Underfunded) are properly spaced
- [ ] All financial values display correctly
- [ ] Privacy filter works (values hidden when privacy mode enabled)
- [ ] Sync refresh works on the summary page

---

## Notes

- **Month Formatting:** Uses `monthUtils.format(currMonth, 'MMMM')` which returns full month name
- **Current Month:** Uses `monthUtils.currentMonth()` which returns YYYYMM format string
- **Theme Integration:** All colors and spacing use theme system (theme.pageText, theme.mobilePageBackground, etc.)
- **Translation Ready:** Uses `<Trans>` component for all visible text for i18n support
- **Feature Flag Default:** `enableMobileSummary` defaults to `false` per AGENTS-chad-fork.md pattern
