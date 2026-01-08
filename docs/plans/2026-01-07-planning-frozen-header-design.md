# Planning Page Frozen Header Design

**Date:** 2026-01-07
**Status:** Design Complete, Ready for Implementation
**Feature Flag:** Uses existing `enablePlanningPage` flag

## Overview

Implement a frozen header pattern for the Planning table so the column headers and "Total" summary row stay visible when scrolling through categories and groups, similar to Excel's freeze panes.

## Problem Statement

Currently, when users scroll through categories in the Planning table, the column headers and Total row scroll away, making it hard to reference which column represents what value.

**Desired outcome:**
- Column headers (Category, Overfunded, Underfunded, Goal Target) stay visible at top
- "Total" summary row stays visible below headers
- Categories and groups scroll within a bounded area
- Works on both desktop and mobile

## Architecture & Approach

**Implementation pattern:** Follow existing budget table frozen header pattern (container layout approach, not CSS sticky)

The budget table uses a proven three-part structure:
1. Fixed header section (`flexShrink: 0`, `overflow: 'hidden'`)
2. Scrollable content area (`overflowY: 'scroll'`, `flex: 1`)
3. Parent container constraining layout (`overflow: 'hidden'`)
4. Scrollbar width compensation using `getScrollbarWidth()`

**Why this approach:**
- Consistent with existing Actual Budget codebase patterns
- More robust and predictable than CSS sticky positioning
- Easier to control scrollable area height
- Proper handling of scrollbar width for perfect alignment

## Component Changes

### Modified: `PlanningTable.tsx`

**Restructure layout:**
```tsx
// Outer container constrains space
<View style={{ flex: 1, overflow: 'hidden' }}>
  {/* Fixed section: Header + Summary */}
  <View style={{ overflow: 'hidden', flexShrink: 0 }}>
    {/* Header row (checkbox, category, columns) */}
    {/* Summary "Total" row */}
  </View>

  {/* Scrollable section: Groups + Categories */}
  <View style={{
    overflowY: 'scroll',
    flex: 1,
    paddingRight: 5 + getScrollbarWidth()
  }}>
    {/* Groups and categories */}
  </View>
</View>
```

**Changes:**
- Import `getScrollbarWidth()` from budget/util.ts
- Extract header and summary rows into a fixed container
- Wrap groups/categories in scrollable container
- Apply scrollbar width compensation

### File: `budget/util.ts`

Already provides `getScrollbarWidth()` utility function. Reuse as-is.

## Implementation Details

### Scrollbar Width Handling

```tsx
import { getScrollbarWidth } from '@desktop-client/components/budget/util';

// In fixed header section
<View style={{ marginRight: 5 + getScrollbarWidth() }}>
  {/* Header content */}
</View>

// In scrollable container
<View style={{ paddingRight: 5 + getScrollbarWidth() }}>
  {/* Scrollable content */}
</View>
```

This ensures the header columns align perfectly with the scrollable content below, accounting for platform-specific scrollbar widths.

### Container Height

The `PlanningTable` container is wrapped in a flex parent (Planning component). The table should:
- Use `flex: 1` in the parent to take available vertical space
- Outer View gets `overflow: 'hidden'` to constrain height
- Scrollable area automatically sizes to remaining space via `flex: 1`

### Column Alignment

Fixed header section must have same column widths as scrollable content:
- Checkbox column: 40px
- Category name: flex (variable)
- Data columns: 120px each (or hidden on mobile per existing logic)
- Scrollbar compensation: 5 + getScrollbarWidth()

## Edge Cases

1. **Empty table (no categories):**
   - Header and summary visible
   - Scrollable area empty but present
   - No scrolling occurs (fine—just shows headers)

2. **Few rows (content fits):**
   - Headers stay at top
   - No vertical scrollbar
   - Content doesn't overflow (fine—headers still visible)

3. **Many rows:**
   - Scrollable area fills remaining vertical space
   - Headers stay pinned at top
   - Scrollbar appears on right of content area

4. **Window resize:**
   - Flex layout recalculates automatically
   - Headers adjust to new width
   - Scrollbar width recalculated on layout change

5. **Collapsed/expanded groups:**
   - Height changes but header stays fixed
   - Summary row values update correctly

6. **Mobile responsiveness:**
   - Frozen header works on all screen sizes
   - Column cycling (existing feature) continues to work
   - Touch scrolling supported

## Testing Strategy

### Manual Testing
- **Desktop:** Scroll through planning table, verify headers stay fixed
- **Mobile:** Tap to cycle columns, scroll through categories, verify headers visible
- **Alignment:** Check that header columns align with scrolling content
- **Resize:** Drag window edges, verify layout adapts

### Visual Testing
- No overlap between frozen and scrolling areas
- Scrollbar appears/disappears correctly
- Header and summary rows maintain proper styling
- No visual glitches during scroll

### Cross-browser
- Chrome, Firefox, Safari
- Especially test scrollbar width compensation on different OSes

### Responsive Testing
- Desktop (wide)
- Tablet
- Mobile (narrow)
- Orientation changes

## Implementation Checklist

- [ ] Restructure PlanningTable layout (outer + fixed + scrollable containers)
- [ ] Import and use `getScrollbarWidth()` utility
- [ ] Apply scrollbar width compensation to header and scrollable areas
- [ ] Test horizontal scrolling alignment (verify columns stay aligned)
- [ ] Test vertical scrolling (headers stay fixed)
- [ ] Test on mobile
- [ ] Test with collapsed/expanded groups
- [ ] Manual QA on multiple screen sizes
- [ ] Verify no performance regressions (smooth scrolling)

## Success Criteria

- [ ] Column headers stay visible when scrolling down
- [ ] "Total" summary row stays visible when scrolling down
- [ ] Categories/groups scroll smoothly within bounded area
- [ ] Header columns align perfectly with scrolling content
- [ ] Works on desktop and mobile
- [ ] Scrolling performance is smooth (no jank)
- [ ] Layout adapts correctly on window resize
- [ ] No visual glitches or overlaps

## Notes

- Uses existing `enablePlanningPage` feature flag (no new flag needed)
- Follows established budget table pattern for maintainability
- No core behavior changes—purely layout enhancement
- Reuses `getScrollbarWidth()` utility already in codebase
