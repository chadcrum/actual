# Planning Page Mobile Enhancements Design

**Date:** 2026-01-07
**Status:** Design Complete, Ready for Implementation

## Overview

Enhance the Planning page mobile experience with two improvements:
1. **Column cycling** - Allow users to toggle between Goal Target, Underfunded, and Overfunded columns by tapping the column heading
2. **Full-width layout** - Use full viewport width on mobile instead of constrained centered layout

## Problem Statement

**Current mobile issues:**
- All three numeric columns (Goal Target, Underfunded, Overfunded) are hidden on mobile due to width constraints
- Table uses desktop's centered, constrained-width layout, wasting valuable mobile screen space
- Users cannot see any goal-related metrics on mobile

**Desired outcome:**
- Users can view one numeric column at a time on mobile, cycling through them with a tap
- Table uses full screen width on mobile for better space utilization
- Desktop behavior remains unchanged

## Architecture & Approach

### State Management Hook

Create `useColumnCycling` hook (similar to existing `useCheckboxState` pattern):
- Manages which column is visible: `'goalTarget' | 'underfunded' | 'overfunded'`
- Persists selection to localStorage (`planning_visible_column`)
- Defaults to `'goalTarget'` on first visit
- Returns current visible column and cycle function

### Mobile-Only Behavior

- Use existing responsive utilities (`useResponsive()` or similar)
- Mobile breakpoint: < 768px (match existing Actual Budget breakpoint)
- Desktop: show all three columns (no changes)
- Mobile: show only one column at a time with cycling

### Non-Breaking Implementation

- All existing functionality preserved
- Additive changes only (conditional rendering based on viewport)
- Follows AGENTS-chad-fork.md principles:
  - No new feature flag (enhances existing `enablePlanningPage`)
  - Uses existing responsive seam
  - Single component handles both desktop and mobile variants

## Component Changes

### New: `useColumnCycling.ts`

```typescript
interface ColumnCycling {
  visibleColumn: 'goalTarget' | 'underfunded' | 'overfunded';
  cycleColumn: () => void;
  isMobile: boolean;
}
```

**Responsibilities:**
- Store/retrieve visible column from localStorage
- Provide cycle function that rotates: Goal Target → Underfunded → Overfunded → Goal Target
- Detect mobile viewport
- Handle localStorage errors gracefully (fallback to 'goalTarget')

### Modified: `PlanningTable.tsx`

**Changes:**
- Import and use `useColumnCycling` hook
- Pass `visibleColumn` and `isMobile` to row components
- Header row: render clickable column heading with rotate icon on mobile
- Summary row: show only visible column on mobile (all three on desktop)
- Add click handler with brief visual feedback (flash animation)

### Modified: `GroupRow.tsx`

**Changes:**
- Accept `visibleColumn` and `isMobile` props
- Conditionally render only visible column when `isMobile === true`
- Desktop: render all three columns (no change)

### Modified: `CategoryRow.tsx`

**Changes:**
- Accept `visibleColumn` and `isMobile` props
- Conditionally render only visible column when `isMobile === true`
- Desktop: render all three columns (no change)

### Modified: `Planning` (index.tsx)

**Changes:**
- Use `useResponsive()` to detect mobile viewport
- Apply full-width layout on mobile:
  - Remove max-width constraint
  - Reduce horizontal padding to 16px
  - Remove auto-centering margin
- Desktop: keep existing centered layout with max-width

## Implementation Details

### Column Cycling Logic

```typescript
const COLUMN_ORDER = ['goalTarget', 'underfunded', 'overfunded'] as const;

function getNextColumn(current: ColumnType): ColumnType {
  const currentIndex = COLUMN_ORDER.indexOf(current);
  const nextIndex = (currentIndex + 1) % COLUMN_ORDER.length;
  return COLUMN_ORDER[nextIndex];
}
```

### Mobile Detection

- Use existing `useResponsive()` hook or similar utility
- Check `window.innerWidth < 768` or match existing mobile breakpoint
- Use `matchMedia('(max-width: 767px)')` for performance
- Re-evaluate on window resize with debouncing

### Visual Feedback on Click

```typescript
const [isFlashing, setIsFlashing] = useState(false);

const handleCycle = () => {
  cycleColumn();
  setIsFlashing(true);
  setTimeout(() => setIsFlashing(false), 200);
};

// CSS: background flash using theme.tableHeaderBackgroundHover
```

### Column Header Display (Mobile Only)

- Show: column name + rotate icon (⟳)
- Make entire header cell clickable (not just icon)
- Icon: 16px, positioned 4px right of text
- Touch target: minimum 44px tall

### localStorage Key

- Key: `'planning_visible_column'`
- Value: `'goalTarget' | 'underfunded' | 'overfunded'`
- Separate from existing `'planning_selected_categories'`

### Layout Styles (Mobile)

```typescript
// Planning container on mobile
{
  padding: '20px 16px',      // Reduced horizontal padding
  maxWidth: 'none',          // Full width
  margin: 0,                 // No centering
}

// Planning container on desktop
{
  padding: 20,
  maxWidth: '1200px',
  margin: '0 auto',
}
```

## Edge Cases & Error Handling

### Edge Cases

1. **localStorage corruption** - Invalid stored value falls back to 'goalTarget'
2. **Screen resize** - Smooth transition between desktop/mobile modes
3. **No goals set** - Categories without goals cycle properly, showing "—"
4. **Rapid clicks** - Animation doesn't stack (controlled by single state flag)
5. **Accessibility** - Screen readers announce column changes

### Error Handling

```typescript
// Graceful fallback in useColumnCycling
try {
  const stored = localStorage.getItem('planning_visible_column');
  if (stored && COLUMN_ORDER.includes(stored)) {
    return stored;
  }
} catch (e) {
  console.warn('Failed to load column preference:', e);
}
return 'goalTarget'; // safe default
```

## Accessibility

### ARIA Attributes
- `role="button"` on clickable header
- `aria-label="Cycle between Goal Target, Underfunded, and Overfunded columns"`
- `aria-live="polite"` region for column change announcements

### Keyboard Support
- Enter/Space keys trigger cycle (not just click/tap)
- Visible focus indicator on header cell

### Screen Reader Feedback
- Announce on cycle: "Now showing Underfunded column"
- Clear indication of which column is currently visible

## Visual Design

### Icon
- Character: ⟳ (U+27F3) or custom SVG from existing icon set
- Size: 16px
- Position: 4px right of heading text
- Color: match heading text color

### Flash Animation
- Duration: 200ms
- Effect: background color pulse
- Color: `theme.tableHeaderBackgroundHover`
- Trigger: on click/tap

### Column Width
- Mobile: 100-120px fixed width (consistent with desktop)
- Desktop: unchanged

### Touch Target
- Minimum height: 44px for comfortable mobile tapping
- Full header cell is clickable area

## Testing Strategy

### Unit Tests
- `useColumnCycling` hook:
  - Cycle logic (correct order)
  - localStorage persistence
  - Error handling (corrupt data)
  - Default value

### Component Tests
- Mobile rendering: only one column visible
- Desktop rendering: all three columns visible
- Column header click triggers cycle
- Summary row matches visible column on mobile

### Integration Tests
- Click interaction cycles through all three states
- State persists across page navigation
- Responsive breakpoint switches rendering mode

### Manual Testing
- Actual mobile devices (iOS/Android)
- Touch interaction responsiveness
- Performance (no jank on animation)
- Screen reader behavior
- Keyboard navigation

## Implementation Checklist

- [ ] Create `useColumnCycling.ts` hook
- [ ] Modify `PlanningTable.tsx` for column cycling
- [ ] Modify `GroupRow.tsx` for conditional rendering
- [ ] Modify `CategoryRow.tsx` for conditional rendering
- [ ] Update `Planning/index.tsx` for full-width mobile layout
- [ ] Add accessibility attributes
- [ ] Implement keyboard support
- [ ] Add flash animation
- [ ] Write unit tests for hook
- [ ] Write component tests
- [ ] Write integration tests
- [ ] Manual testing on mobile devices
- [ ] Update Planning README.md with new feature

## Success Criteria

- [ ] Mobile users can cycle through all three columns by tapping header
- [ ] Column selection persists across sessions
- [ ] Desktop behavior completely unchanged
- [ ] Table uses full width on mobile with reasonable padding
- [ ] Smooth transition when resizing between mobile/desktop
- [ ] All tests pass
- [ ] No accessibility regressions
- [ ] Performance: no visible lag or jank

## Notes

- This enhancement fits within the existing Planning page feature flag
- Follows AGENTS-chad-fork.md responsive design rules
- No new feature flag required
- Uses existing responsive utilities
- Single component approach (no /mobile and /wide duplication)
