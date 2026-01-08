# Planning Page Frozen Header Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a frozen header pattern on the Planning table so column headers and Total row stay visible when scrolling through categories.

**Architecture:** Refactor PlanningTable.tsx to use a container layout approach matching the budget table pattern: outer container with `overflow: hidden` constrains space, fixed header/summary section with `flexShrink: 0`, scrollable content area with `overflowY: scroll` and `flex: 1`, and scrollbar width compensation using `getScrollbarWidth()`.

**Tech Stack:** React, TypeScript, CSS-in-JS (inline styles), existing `@actual-app/components` and utilities

---

## Task 1: Import getScrollbarWidth utility

**Files:**
- Modify: `packages/desktop-client/src/components/planning/PlanningTable.tsx:1-15`

**Step 1: Add import for getScrollbarWidth**

Add this line to the imports at the top of PlanningTable.tsx (after other utility imports):

```tsx
import { getScrollbarWidth } from '@desktop-client/components/budget/util';
```

**Step 2: Verify import works**

Run: `npm run build -w @desktop-client 2>&1 | head -50`

Expected: No import errors, build should progress normally.

**Step 3: Commit**

```bash
git add packages/desktop-client/src/components/planning/PlanningTable.tsx
git commit -m "feat: import getScrollbarWidth utility for planning header freeze"
```

---

## Task 2: Restructure PlanningTable outer container

**Files:**
- Modify: `packages/desktop-client/src/components/planning/PlanningTable.tsx:92-102`

**Current structure:**
```tsx
<View
  style={{
    border: `1px solid ${theme.tableBorder}`,
    borderRadius: 4,
    backgroundColor: theme.tableBackground,
    overflow: 'visible',
    maxWidth: isMobile ? '100%' : maxWidth,
    width: isMobile ? '100%' : 'auto',
  }}
>
```

**Step 1: Update outer View to use new layout approach**

Replace the outer View (lines 92-102) with:

```tsx
<View
  style={{
    border: `1px solid ${theme.tableBorder}`,
    borderRadius: 4,
    backgroundColor: theme.tableBackground,
    overflow: 'hidden',
    maxWidth: isMobile ? '100%' : maxWidth,
    width: isMobile ? '100%' : 'auto',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  }}
>
```

**Key changes:**
- `overflow: 'visible'` → `overflow: 'hidden'` (constrains layout)
- Add `display: 'flex'` and `flexDirection: 'column'` for flex layout
- Add `flex: 1` to fill available space

**Step 2: Verify structure compiles**

Run: `npm run build -w @desktop-client 2>&1 | head -50`

Expected: No TypeScript errors related to View styles.

**Step 3: Commit**

```bash
git add packages/desktop-client/src/components/planning/PlanningTable.tsx
git commit -m "feat: update planning table outer container for flex layout"
```

---

## Task 3: Wrap header and summary rows in fixed section

**Files:**
- Modify: `packages/desktop-client/src/components/planning/PlanningTable.tsx:103-217`

**Current structure:**
```tsx
{/* Header Row */}
<View style={{ ... }}>
  {/* header content */}
</View>

{/* Summary Row */}
<View style={{ ... }}>
  {/* summary content */}
</View>

{/* Groups and Categories */}
{groups.map(group => {
```

**Step 1: Create fixed section wrapper**

Wrap the Header Row and Summary Row in a new View with `flexShrink: 0`:

```tsx
{/* Fixed Header Section */}
<View
  style={{
    overflow: 'hidden',
    flexShrink: 0,
  }}
>
  {/* Header Row */}
  <View
    style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      padding: '12px 16px',
      backgroundColor: isFlashing
        ? theme.tableHeaderBackgroundHover
        : theme.tableHeaderBackground,
      borderBottom: `1px solid ${theme.tableBorder}`,
      fontWeight: 600,
      fontSize: 13,
      color: theme.tableHeaderText,
      transition: 'background-color 0.2s ease',
    }}
  >
    {/* existing header content - no changes */}
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
      marginRight: 5 + getScrollbarWidth(),
    }}
  >
    {/* existing summary content - no changes */}
  </View>
</View>
```

**Key additions:**
- Outer wrapper with `overflow: 'hidden'` and `flexShrink: 0`
- Summary row gets `marginRight: 5 + getScrollbarWidth()` to account for scrollbar
- Header row remains unchanged internally

**Step 2: Verify layout compiles**

Run: `npm run build -w @desktop-client 2>&1 | head -50`

Expected: No errors, component builds successfully.

**Step 3: Test locally**

Run the app and navigate to Planning page. Verify:
- Header and Total rows display normally
- No visual breakage
- Layout looks the same as before

Run: `npm run start` (in dev environment, check Planning page visually)

**Step 4: Commit**

```bash
git add packages/desktop-client/src/components/planning/PlanningTable.tsx
git commit -m "feat: wrap header and summary rows in fixed section with scrollbar compensation"
```

---

## Task 4: Wrap groups/categories in scrollable section

**Files:**
- Modify: `packages/desktop-client/src/components/planning/PlanningTable.tsx:219-256`

**Current structure:**
```tsx
{/* Groups and Categories */}
{groups.map(group => {
  // ... group and category rendering
})}
</View>
```

**Step 1: Wrap groups/categories in scrollable container**

Replace the groups rendering section (everything after the Summary Row until the closing View tag) with:

```tsx
{/* Scrollable Content Section */}
<View
  style={{
    overflowY: 'scroll',
    overflowAnchor: 'none',
    flex: 1,
    paddingRight: 5 + getScrollbarWidth(),
  }}
>
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
          isNarrowWidth={isNarrowWidth}
          visibleColumn={visibleColumn}
          isMobile={isMobile}
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
            isNarrowWidth={isNarrowWidth}
            visibleColumn={visibleColumn}
            isMobile={isMobile}
          />
        ))}
      </React.Fragment>
    );
  })}
</View>
```

**Key additions:**
- New outer View with `overflowY: 'scroll'`, `overflowAnchor: 'none'`, `flex: 1`
- `overflowAnchor: 'none'` prevents automatic scroll anchoring that can interfere with smooth scrolling
- `paddingRight: 5 + getScrollbarWidth()` compensates for scrollbar width
- All group/category rendering logic stays exactly the same

**Step 2: Verify structure is complete**

Check that the closing `</View>` for the main table container is still present after this section.

Run: `npm run build -w @desktop-client 2>&1 | head -50`

Expected: No errors, clean build.

**Step 3: Test frozen header behavior**

Run the app and navigate to Planning page:
1. Scroll down in the table—header and Total row should stay at top
2. Verify categories/groups scroll smoothly
3. Check alignment: header columns should align with scrolling content
4. Test on mobile (narrow width) and desktop

Run: `npm run start` (visual check on both mobile and desktop)

**Step 4: Commit**

```bash
git add packages/desktop-client/src/components/planning/PlanningTable.tsx
git commit -m "feat: add scrollable section for groups and categories with frozen header"
```

---

## Task 5: Verify and test complete implementation

**Files:**
- Test: `packages/desktop-client/src/components/planning/Planning.integration.test.tsx`
- Manual: Planning page at various screen sizes

**Step 1: Run existing Planning tests**

Run: `npm run test -- Planning.integration.test.tsx`

Expected: All tests pass, no regressions.

**Step 2: Manual testing checklist**

Test these scenarios and verify frozen header works correctly:

**Desktop (wide screen):**
- [ ] Scroll down—header and Total row stay visible
- [ ] Header columns align perfectly with scrolling content
- [ ] Scrollbar appears on right side only
- [ ] Group collapse/expand works
- [ ] Category selection works

**Mobile (narrow screen):**
- [ ] Scroll down—header and Total row stay visible
- [ ] Column cycling still works (tap header to cycle)
- [ ] Header columns align with scrolling content
- [ ] Scrollbar appears correctly
- [ ] Touch scrolling is smooth

**Edge cases:**
- [ ] Empty planning table (no groups)—header still shows
- [ ] Very few categories (content fits without scroll)—header still visible
- [ ] Window resize—layout adapts correctly
- [ ] Dark and light themes—styling looks correct

**Step 3: Check performance**

Scroll the planning table quickly on desktop and mobile:
- [ ] Scrolling is smooth (no jank)
- [ ] No visual glitches
- [ ] Header stays frozen without stuttering

**Step 4: Commit final changes (if any tweaks were needed)**

If you made any minor CSS adjustments during testing:

```bash
git add packages/desktop-client/src/components/planning/PlanningTable.tsx
git commit -m "fix: minor styling adjustments for frozen header alignment"
```

If no changes were needed, skip this step.

---

## Summary

This plan implements a frozen header pattern on the Planning table by:

1. ✅ Importing the `getScrollbarWidth()` utility from budget components
2. ✅ Restructuring the outer container to use flex layout with `overflow: hidden`
3. ✅ Wrapping header and summary rows in a fixed section (`flexShrink: 0`)
4. ✅ Wrapping groups/categories in a scrollable section (`flex: 1`, `overflowY: scroll`)
5. ✅ Applying scrollbar width compensation to prevent alignment issues
6. ✅ Testing across desktop, mobile, and edge cases

The implementation follows the existing budget table pattern, ensuring consistency with the codebase's established patterns.

**Total estimated effort:** ~15-20 minutes of development + manual testing
