# Add Clickable Schedule Date Links in Mobile Budget Detailed View

## Overview
Make schedule dates in the mobile budget detailed view clickable, opening the schedule edit modal when tapped. This allows users to quickly navigate from a budget category to edit its associated schedules.

## Key Findings

### Current Implementation
- **File**: packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx
- **Component**: `ScheduleDatesDisplay` (lines 220-267)
- **Current behavior**: Displays schedule dates as plain `Text` components with no interaction
- **Data available**: Each schedule has `scheduleId`, `scheduleName`, and `nextDate`

### Navigation Architecture
- **Cannot navigate to /schedules**: The schedules page is desktop-only (wrapped in `<NarrowNotSupported>`)
- **Solution**: Use modal-based editing via Redux `pushModal` action
- **Modal name**: `'schedule-edit'` with options `{ id: scheduleId }`
- **Precedent**: Already used throughout the app (SpentCell, BalanceCell, etc.)

### Required Imports
All necessary imports are **already present** in ExpenseCategoryListItem.tsx:
- `Button` from '@actual-app/components/button' (line 5)
- `pushModal` from '@desktop-client/modals/modalsSlice' (line 28)
- `useDispatch` from '@desktop-client/redux' (line 29)

## Implementation Plan

### 1. Create ScheduleDateButton Component

**Location**: Add above `ScheduleDatesDisplay` (~line 215)

**Implementation**:
```typescript
type ScheduleDateButtonProps = {
  schedule: ScheduleDateInfo;
  showComma: boolean;
};

function ScheduleDateButton({ schedule, showComma }: ScheduleDateButtonProps) {
  const dispatch = useDispatch();

  const handlePress = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'schedule-edit',
          options: { id: schedule.scheduleId },
        },
      }),
    );
  };

  return (
    <Button
      variant="bare"
      onPress={handlePress}
      style={{
        padding: 2,
        minHeight: 0,
      }}
      aria-label={`Edit schedule: ${schedule.scheduleName}, due ${formatScheduleDate(schedule.nextDate)}`}
    >
      <Text
        style={{
          fontSize: 12,
          color: theme.pageTextSubdued,
        }}
      >
        {formatScheduleDate(schedule.nextDate)}
        {showComma ? ',' : ''}
      </Text>
    </Button>
  );
}
```

**Key design decisions**:
- **Button variant**: Use `"bare"` for minimal styling with automatic hover/press states
- **Padding**: 2px minimal padding to keep layout compact within 25px expansion height
- **minHeight**: 0 to override Button's default height
- **Accessibility**: Descriptive aria-label with schedule name and date
- **Color**: `theme.pageTextSubdued` to maintain subtle appearance at rest

### 2. Refactor ScheduleDatesDisplay Component

**Location**: Lines 220-267

**Changes**: Replace `Text` components with `ScheduleDateButton`:

```typescript
function ScheduleDatesDisplay({
  categoryId,
  scheduleDates,
}: ScheduleDatesDisplayProps) {
  const schedules = scheduleDates.get(categoryId) || [];

  if (schedules.length === 0) {
    return null;
  }

  const MAX_DISPLAY = 2;
  const displaySchedules = schedules.slice(0, MAX_DISPLAY);
  const hasMore = schedules.length > MAX_DISPLAY;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingTop: 2,
      }}
    >
      {displaySchedules.map((schedule, index) => (
        <ScheduleDateButton
          key={schedule.scheduleId}
          schedule={schedule}
          showComma={index < displaySchedules.length - 1}
        />
      ))}
      {hasMore && (
        <Text
          style={{
            fontSize: 12,
            color: theme.pageTextSubdued,
          }}
        >
          ...
        </Text>
      )}
    </View>
  );
}
```

**Note**: The "..." overflow indicator remains non-interactive (plain Text).

## Visual Behavior

### At Rest
- Dates appear identical to current implementation
- Font size: 12px
- Color: `theme.pageTextSubdued` (muted gray)
- Comma separators between dates

### On Interaction
- **Hover** (desktop): Button applies `buttonBareBackgroundHover` (lighter background)
- **Press** (mobile): Button applies `buttonBareBackgroundActive`
- **Cursor**: Automatically changes to pointer on hover
- **Touch target**: Button provides touch area around text

### Modal Opens
- Schedule edit modal opens with the selected schedule loaded
- Works on both mobile and desktop
- Standard modal interaction (can close to return to budget view)

## Edge Cases Handled

1. **Missing scheduleId**: Modal system handles gracefully (won't open if ID is invalid)
2. **Multiple schedules (3+)**: Only first 2 are clickable, "..." remains non-interactive
3. **No schedules**: Component returns null (no change from current behavior)
4. **Layout constraints**: Minimal padding (2px) and `minHeight: 0` keep display within 25px expansion height
5. **Hidden categories**: Button inherits opacity from parent expansion area (0.5)

## Files Modified

**Single file**:
- packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx
  - Lines 215-267: Added `ScheduleDateButton` component and refactored `ScheduleDatesDisplay`

## Testing Checklist

- [ ] Dates are clickable on mobile (touch)
- [ ] Dates are clickable on desktop (mouse)
- [ ] Schedule edit modal opens with correct schedule
- [ ] Hover states work on desktop (lighter background)
- [ ] Press states work on mobile (active background)
- [ ] Layout stays within 25px expansion height
- [ ] Works with 1, 2, and 3+ schedules
- [ ] "..." remains non-interactive
- [ ] Categories with no schedules show nothing
- [ ] Accessibility: Screen readers announce aria-label correctly

## Implementation Notes

- **No new imports needed**: All required dependencies already imported
- **Follows existing patterns**: Uses same Button approach as SpentCell and BalanceCell
- **Minimal visual change**: Dates look the same at rest, only interactive on hover/press
- **Performance**: Negligible impact (max 2 buttons per category, categories already virtualized)
- **Accessibility**: Descriptive labels include schedule name and formatted date

## Status

✅ Implementation complete - All code changes made to ExpenseCategoryListItem.tsx
