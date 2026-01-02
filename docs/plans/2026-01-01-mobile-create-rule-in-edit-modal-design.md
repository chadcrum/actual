# Mobile: Create Rule in Transaction Edit Modal

**Date:** 2026-01-01
**Feature Flag:** `mobileParity`
**Status:** Design Complete - Ready for Implementation

## Overview

Move the "Create rule" action from the mobile transaction list selection menu into the transaction edit modal. This provides more intuitive access to rule creation while keeping the feature gated under the existing `mobileParity` flag.

## Goals

- Provide easier access to rule creation in mobile interface
- Move action from multi-select context to single transaction context
- Maintain consistency with mobile UI patterns (buttons below form fields)
- Keep feature experimental and easy to remove via flag

## User Flow

1. User opens an existing transaction to edit
2. User sees a "Create rule" button positioned above the "Delete transaction" button
3. User taps "Create rule"
4. Transaction edit modal closes
5. Rule editor modal opens with pre-filled rule data from the transaction

## Architecture

### Core Principles (per AGENTS-chad-fork.md)

1. **Purely additive** - Only adds code to mobile, no desktop modifications
2. **Seam already exists** - TransactionEdit modal is the extension point
3. **Flag gates the extension** - `mobileParity` flag controls button visibility
4. **Isolated experiment** - Self-contained, easy to remove
5. **No coupling** - Desktop code unchanged

### Component Structure

```
packages/desktop-client/src/components/mobile/transactions/
  └── TransactionEdit.tsx
      ├── Add mobileParity flag hook
      ├── Add onCreateRuleInner handler (duplicates desktop logic)
      └── Add "Create rule" button UI (conditional on flag)
```

## Implementation Details

### 1. Imports

Add to `TransactionEdit.tsx`:

```tsx
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { q } from 'loot-core/shared/query';
import { ungroupTransactions } from 'loot-core/shared/transactions';
import {
  type NewRuleEntity,
  type RuleActionEntity,
  type RuleConditionEntity
} from 'loot-core/types/models';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';
```

### 2. Feature Flag Hook

Add at top of `TransactionEditInner` component:

```tsx
const mobileParity = useFeatureFlag('mobileParity');
```

### 3. Handler Implementation

Add `onCreateRuleInner` handler in `TransactionEditInner` (after line ~967):

```tsx
const onCreateRuleInner = useCallback(async () => {
  const [unserializedTransaction] = unserializedTransactions;

  // Query for transaction with splits
  const { data } = await aqlQuery(
    q('transactions')
      .filter({ id: unserializedTransaction.id })
      .select('*')
      .options({ splits: 'grouped' }),
  );

  const transactions = ungroupTransactions(data);
  const ruleTransaction = transactions[0];
  const childTransactions = transactions.filter(
    t => t.parent_id === ruleTransaction.id,
  );

  // Build payee condition
  const payeeCondition = ruleTransaction.imported_payee
    ? ({
        field: 'imported_payee',
        op: 'is',
        value: ruleTransaction.imported_payee,
        type: 'string',
      } satisfies RuleConditionEntity)
    : ({
        field: 'payee',
        op: 'is',
        value: ruleTransaction.payee!,
        type: 'id',
      } satisfies RuleConditionEntity);

  // Build amount condition
  const amountCondition = {
    field: 'amount',
    op: 'isapprox',
    value: ruleTransaction.amount,
    type: 'number',
  } satisfies RuleConditionEntity;

  // Build rule structure
  const rule = {
    stage: null,
    conditionsOp: 'and',
    conditions: [payeeCondition, amountCondition],
    actions: [
      ...(childTransactions.length === 0
        ? [
            {
              op: 'set',
              field: 'category',
              value: ruleTransaction.category,
              type: 'id',
              options: {
                splitIndex: 0,
              },
            } satisfies RuleActionEntity,
          ]
        : []),
      ...childTransactions.flatMap((sub, index) => [
        {
          op: 'set-split-amount',
          value: sub.amount,
          options: {
            splitIndex: index + 1,
            method: 'fixed-amount',
          },
        } satisfies RuleActionEntity,
        {
          op: 'set',
          field: 'category',
          value: sub.category,
          type: 'id',
          options: {
            splitIndex: index + 1,
          },
        } satisfies RuleActionEntity,
      ]),
    ],
  } satisfies NewRuleEntity;

  // Open rule editor modal
  dispatch(
    pushModal({ modal: { name: 'edit-rule', options: { rule } } }),
  );

  // Close transaction edit modal
  navigate(-1);
}, [unserializedTransactions, dispatch, navigate]);
```

**Note:** This duplicates the rule-building logic from `desktop/Account.tsx`. This is intentional per AGENTS-chad-fork.md principles - keeping the experimental mobile feature isolated and additive rather than modifying desktop code.

### 4. UI Button

Add button in JSX after Notes field, before Delete button (around line 1237):

```tsx
{/* Create rule button */}
{!isAdding && mobileParity && (
  <View style={{ alignItems: 'center' }}>
    <Button
      variant="bare"
      onPress={onCreateRuleInner}
      style={{
        height: 40,
        borderWidth: 0,
        marginLeft: styles.mobileEditingPadding,
        marginRight: styles.mobileEditingPadding,
        marginTop: 10,
        backgroundColor: 'transparent',
      }}
    >
      <SvgPencilWriteAlternate
        width={17}
        height={17}
        style={{ color: theme.formLabelText }}
      />
      <Text
        style={{
          marginLeft: 5,
          userSelect: 'none',
          color: theme.formLabelText,
        }}
      >
        <Trans>Create rule</Trans>
      </Text>
    </Button>
  </View>
)}
```

**Conditions:**
- `!isAdding` - Only show for existing transactions, not new ones
- `mobileParity` - Only show when feature flag is enabled

**Visual Layout:**
```
[Notes field]
[Split button] (if applicable)
[Create rule button] ← NEW
[Delete transaction button]
```

## Data Flow

### Rule Creation Flow

1. User taps "Create rule" button
2. `onCreateRuleInner` executes:
   - Queries transaction with splits using aqlQuery
   - Ungroups transaction data
   - Extracts payee condition (imported_payee or payee)
   - Extracts amount condition (isapprox)
   - Builds category actions for single transaction OR split actions for split transaction
   - Constructs NewRuleEntity object
3. Dispatches `pushModal` to open 'edit-rule' modal with pre-filled rule
4. Navigates back (-1) to close transaction edit modal
5. User sees rule editor with pre-populated fields

### Rule Structure

**For single transaction:**
- Conditions: payee (is), amount (isapprox)
- Actions: set category at splitIndex 0

**For split transaction:**
- Conditions: payee (is), amount (isapprox)
- Actions:
  - For each split: set-split-amount + set category
  - Each split gets incrementing splitIndex (1, 2, 3...)

## Edge Cases & Considerations

### 1. Transaction Without Payee

- Uses `imported_payee` if available
- Falls back to `payee` field
- If both null, behavior matches desktop (may create incomplete rule)

### 2. Transaction Without Category

- Rule creates with payee/amount conditions only
- Category action would be null/empty
- User can add category in rule editor

### 3. Split Transactions

- Handler correctly processes parent + child transactions
- Each split maps to correct splitIndex in rule actions
- Maintains split amounts and categories

### 4. New Transactions

- Button explicitly hidden via `!isAdding` check
- Only works for existing saved transactions
- Consistent with desktop behavior

### 5. Different Transaction Types

- **Regular:** Single category action
- **Transfer:** Creates rule with transfer payee
- **Reconciled:** Creates rule (no special handling needed)
- **Scheduled:** N/A (mobile doesn't show scheduled in edit modal)

## Testing Strategy

### Manual Testing

1. **Flag disabled (default)**
   - Open existing transaction → No "Create rule" button
   - Only "Delete transaction" visible

2. **Flag enabled - Regular transaction**
   - Open existing transaction → "Create rule" appears above Delete
   - Tap "Create rule" → Modal closes, rule editor opens
   - Verify rule has payee condition, amount condition, category action

3. **Flag enabled - Split transaction**
   - Open split transaction → Tap "Create rule"
   - Verify rule includes all splits with correct amounts and categories
   - Verify splitIndex values are correct (1, 2, 3...)

4. **New transaction**
   - Create new transaction → No "Create rule" button
   - Button only for existing transactions

5. **Transfer transaction**
   - Open transfer → Tap "Create rule"
   - Verify rule uses transfer payee correctly

6. **Transaction with imported_payee**
   - Import transaction with imported_payee field
   - Tap "Create rule"
   - Verify condition uses imported_payee instead of payee

### Integration Testing

- Verify modal navigation: edit modal closes, rule editor opens
- Verify no memory leaks from modal transitions
- Verify rule editor receives correct pre-filled data
- Test on various mobile screen sizes

## Success Criteria

- [ ] `mobileParity` flag gates "Create rule" button visibility
- [ ] Button appears above "Delete transaction" button when editing existing transactions
- [ ] Button does NOT appear when adding new transactions
- [ ] Tapping "Create rule" closes transaction edit modal
- [ ] Rule editor modal opens with pre-filled rule data
- [ ] Rule includes payee condition (imported_payee or payee)
- [ ] Rule includes amount condition (isapprox)
- [ ] Rule includes category actions for single transactions
- [ ] Rule includes split actions for split transactions with correct splitIndex
- [ ] Works with regular transactions, transfers, and reconciled transactions
- [ ] No console errors or warnings
- [ ] Button styling matches existing Delete button pattern
- [ ] FORK_NOTES.md updated with feature documentation

## Rationale for Design Decisions

### Why Duplicate Logic Instead of Sharing?

Per AGENTS-chad-fork.md principles:
- **Additive over modifications:** Duplicating keeps desktop code untouched
- **Isolated experiment:** Easy to remove if feature doesn't work out
- **No coupling:** Mobile experiment doesn't affect desktop stability
- **Future flexibility:** Can refactor to shared utility if feature succeeds and goes upstream

### Why Above Delete Button?

- Consistent with mobile pattern of action buttons at bottom
- Groups related "power user" actions together
- Maintains visual hierarchy (primary actions in footer, secondary in body)
- Non-destructive action placed above destructive action

### Why mobileParity Flag?

- Reuses existing flag infrastructure
- Groups related mobile-desktop parity features
- Single flag to enable/disable mobile experimental features
- Simpler than creating individual flags per feature

## Future Enhancements

If this feature succeeds:

1. **Refactor to shared utility**
   - Extract rule-building logic to loot-core
   - Both desktop and mobile call shared function
   - Reduces duplication after validation

2. **Enhanced rule creation**
   - Allow user to choose which fields become conditions
   - Preview rule matches before saving
   - Create multiple rules from batch selection

3. **Add to desktop mobile view**
   - Currently only in mobile web client
   - Could add to desktop's mobile responsive mode

## Documentation

### FORK_NOTES.md Update

Add to mobile parity section:

```markdown
### Mobile Parity: Create Rule in Transaction Edit Modal

**Flag:** `mobileParity`
**Added:** 2026-01-01
**Location:** `packages/desktop-client/src/components/mobile/transactions/TransactionEdit.tsx`

**Feature:**
- Adds "Create rule" button to mobile transaction edit modal
- Button positioned above "Delete transaction" button
- Only visible for existing transactions (not new)
- Tapping button closes edit modal and opens rule editor with pre-filled data

**Implementation:**
- Self-contained in mobile code (no desktop modifications)
- Duplicates rule-building logic from desktop Account.tsx
- Uses existing pushModal infrastructure
- Gated by mobileParity feature flag

**Seam:** TransactionEdit modal body (existing seam)
**Pattern:** Additive button with flag-gated visibility

**Rationale for duplication:**
Following AGENTS-chad-fork.md principle of "prefer additive changes over modifications."
This keeps the experimental mobile feature isolated without modifying working desktop code.
Can be refactored to shared utility if feature succeeds and goes upstream.
```

## Summary

This design:
✅ Moves "Create rule" from transaction list kebab menu to edit modal
✅ Uses existing `mobileParity` flag
✅ Purely additive (no modifications to existing code)
✅ Self-contained in mobile
✅ Follows AGENTS-chad-fork.md principles
✅ Easy to remove/disable via flag
✅ Provides better UX for mobile rule creation
