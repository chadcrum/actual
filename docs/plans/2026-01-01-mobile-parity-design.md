# Mobile Parity Feature Flag Design

**Date:** 2026-01-01
**Feature Flag:** `mobileParity`
**Status:** Design Complete - Ready for Implementation

## Overview

Introduce a `mobileParity` feature flag to enable features in the mobile web client that the desktop web client has. This flag provides a framework for incrementally bringing mobile parity with desktop capabilities while maintaining clean fork architecture.

**Initial scope:** Enable "Create Rule" action in mobile transaction context menu.
**Future scope:** Additional mobile parity features can be gated under this same flag.

## Goals

- Provide mobile users access to rule creation functionality
- Establish reusable pattern for mobile parity features
- Maintain separation of concerns per AGENTS-chad-fork.md
- Enable incremental feature additions without architectural changes

## Feature Scope

### Phase 1 (Current)

- Add `mobileParity` feature flag
- Enable "Create Rule" option in mobile transaction "More options" menu
- Reuse existing desktop rule creation logic
- Default flag to `false` (opt-in)

### Future Phases

- Additional transaction actions (beyond create rule)
- Other mobile parity features as identified

## Architecture

### Core Principles (per AGENTS-chad-fork.md)

1. **Flag gates UI only** - No duplication of rule creation logic
2. **Additive changes** - Only conditional rendering of existing menu item
3. **Behavior in core, presentation in web** - Flag defined in loot-core, consumed in web client
4. **Seam at menu level** - Mobile transaction menu is the extension point

### Component Structure

```
loot-core/
  └── src/
      └── types/
          └── prefs.ts                           // Add mobileParity flag

packages/desktop-client/src/
  ├── hooks/
  │   └── useFeatureFlag.ts                      // Add mobileParity default state
  └── components/mobile/transactions/
      └── TransactionList.tsx                    // Add "Create rule" menu item (conditional)
```

## Feature Flag

**Location:** `packages/loot-core/src/types/prefs.ts`

Add to FeatureFlag type:

```ts
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
  | 'mobileParity';
```

**Default State Location:** `packages/desktop-client/src/hooks/useFeatureFlag.ts`

```ts
const DEFAULT_FEATURE_FLAG_STATE: Record<FeatureFlag, boolean> = {
  // ... existing flags
  mobileParity: false,
};
```

## UI Components

### Mobile Transaction Menu Update

**Location:** `packages/desktop-client/src/components/mobile/transactions/TransactionList.tsx`

**Component:** `SelectedTransactionsFloatingActionBar`

**Modification:** Add conditional "Create rule" menu item

**Implementation:**

1. **Add flag hook:**
```ts
const mobileParity = useFeatureFlag('mobileParity');
```

2. **Update `moreOptionsMenuItems` array (around line 388):**
```ts
const moreOptionsMenuItems: MenuItem<string>[] = [
  { name: 'duplicate', text: t('Duplicate') },
  {
    name: allTransactionsAreLinked ? 'unlink-schedule' : 'link-schedule',
    text: allTransactionsAreLinked
      ? t('Unlink schedule')
      : t('Link schedule'),
  },
  ...(mobileParity ? [
    { name: 'create-rule', text: t('Create rule') }
  ] : []),
  { name: 'delete', text: t('Delete') },
  { name: 'merge', text: t('Merge'), disabled: !canMerge },
];
```

3. **Add handler in `onMenuSelect` switch statement (around line 599):**
```ts
} else if (type === 'create-rule') {
  onCreateRule?.({
    ids: selectedTransactionsArray,
  });
  setIsMoreOptionsMenuOpen(false);
```

## Data Flow

### User Interaction Flow

1. User selects one or more transactions in mobile transaction list
2. Floating action bar appears at bottom with action buttons
3. User taps "..." (More options) button
4. Menu popover opens showing available actions
5. If `mobileParity` flag enabled: "Create rule" option appears in menu
6. User taps "Create rule"
7. Existing desktop rule creation handler is invoked with selected transaction IDs
8. Rule editor modal opens with pre-filled rule data

### Handler Reuse

The `onCreateRule()` handler comes from the parent component (likely Account.tsx or container component). This handler already exists for desktop and contains all the rule creation logic:

- Extracting payee condition from selected transactions
- Extracting amount condition
- Building rule actions based on transaction splits
- Opening the rule editor modal with pre-filled values

**No new business logic is created—only conditional UI rendering.**

## Edge Cases & Considerations

### 1. Multiple Transaction Selection

- Rule creation works with single or multiple selected transactions
- Desktop logic already handles this case
- Menu item behaves consistently with other batch actions

### 2. Transaction Types

- Works with regular transactions, split transactions, and transfers
- Desktop rule creation logic handles all types
- No special handling needed in mobile

### 3. Feature Flag Dependency

- This flag is independent and can be toggled without affecting other features
- Disabling the flag simply hides the menu item
- No state cleanup required

### 4. Future Feature Additions

- Flag name `mobileParity` allows for multiple related features under same flag
- Can add more menu items conditionally without additional flags
- Clean extension point for future mobile parity work

## Testing Strategy

### Unit Tests

- Verify "Create rule" menu item appears when `mobileParity` is enabled
- Verify "Create rule" menu item does not appear when flag is disabled
- Verify clicking "Create rule" calls `onCreateRule()` with correct transaction IDs
- Verify menu item only shows when transactions are selected

### Integration Tests

- Select transactions → More options menu → "Create rule" visible (when enabled)
- "Create rule" → Rule editor modal opens with correct pre-filled data
- Flag toggle hides/shows "Create rule" option without other side effects
- Verify with single and multiple selected transactions

### Visual/Manual Tests

- Menu layout doesn't break with additional item
- Touch target is appropriately sized for mobile
- "Create rule" option appears in expected position
- Works on various mobile screen sizes

## Success Criteria

- [ ] `mobileParity` flag added to `prefs.ts` type definition
- [ ] Flag added to default state in `useFeatureFlag.ts` (default: false)
- [ ] "Create rule" menu item added to mobile transaction menu (conditional)
- [ ] Menu item appears when flag enabled, hidden when disabled
- [ ] Clicking "Create rule" invokes existing `onCreateRule()` handler
- [ ] Handler receives correct selected transaction IDs
- [ ] Menu closes after action selection
- [ ] All tests pass
- [ ] No console errors or warnings
- [ ] FORK_NOTES.md updated with new flag documentation
- [ ] Feature works with single and multiple transaction selection

## Future Enhancements

Potential features to add under `mobileParity` flag:

- Additional transaction actions (split, merge enhancements, etc.)
- Mobile-specific optimizations of existing desktop features
- Batch editing improvements
- Advanced filtering/sorting options
- Other mobile parity features as they're identified

## Documentation

This design should be referenced in `FORK_NOTES.md` with:

- Flag name and purpose
- When it was added
- What features it gates
- How to enable/disable for testing
