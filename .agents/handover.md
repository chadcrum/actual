# Agent Handover

## Objective
Fix Planning page to display actual budgeted values (overfunded/underfunded/goal targets) instead of zeros by correctly parsing the goal_def array structure.

## Current Status
- Fixed goal_def parsing to extract values from array structure instead of treating it as a single object
- Successfully populated all three columns (Overfunded, Underfunded, Goal Target) with actual values
- Verified fix works in browser at http://localhost:3001/planning

## Recent Changes

### `packages/desktop-client/src/components/planning/usePlanningData.ts` (lines 56-84)
**Changed:** Goal definition parsing logic
**Before:** Treated `goal_def` as single object with `.target` field
**After:** Correctly parses as array and extracts from first matching goal object

```typescript
// Old (incorrect):
const goalDef = JSON.parse(category.goal_def);
goalValue = goalDef.target ?? null;  // Wrong - goalDef is array!

// New (correct):
const goalDefinitions: Record<string, unknown>[] = JSON.parse(category.goal_def);
const goal = goalDefinitions.find(g => g.type === 'simple' || g.type === 'by-date');
if (goal?.type === 'simple') {
  goalValue = goal.monthly;  // Extract monthly amount for simple goals
} else if (goal?.type === 'by-date') {
  goalValue = goal.target;   // Extract target for by-date goals
}
```

**Rationale:** The `goal_def` field stores an array of goal objects like:
```json
[{"type":"simple","monthly":1000,"limit":{"amount":1500,...},"priority":1,"directive":"template"}]
```
Not a single object with a `target` field as originally assumed.

**Pattern discovered:** Confirmed by examining `useCategoryScheduleGoalTemplates.ts:50-51` which correctly parses goal_def as an array.

### Removed diagnostic logging (multiple files)
- Cleaned up console.log statements added during debugging
- Files cleaned: `usePlanningData.ts`, `useCategoryBudgetedValues.ts`

## Active TODOs
- [completed] Fix goal_def parsing to extract values from array structure
- [completed] Remove diagnostic logging
- [completed] Verify all tests pass
- [completed] Verify browser display shows correct values

## Key Decisions

**Goal Type Selection:**
- For "simple" goals: Use `goal.monthly` field (monthly budgeting amount in cents)
- For "by-date" goals: Use `goal.target` field (target amount in cents)
- Chose to find first matching goal of type "simple" or "by-date" since planning page focuses on budgeting goals

**Why it was broken:**
- Original code assumed `goal_def` was a single object with structure `{type, target}`
- Actual structure is array: `[{type, monthly, limit, ...}]`
- Accessing `goalDef.target` on an array returned `undefined`, causing `goalValue` to be `null`
- When `goalValue === null`, overfunded/underfunded calculations were skipped (line 89: `if (goalValue != null && budgetedValue > 0)`)
- This caused all categories to show 0 or "—" in UI

**Pattern Reference:**
- Found correct parsing pattern in `useCategoryScheduleGoalTemplates.ts:49-63`
- This hook properly parses goal_def as array and filters by goal type

## Blockers & Issues
**None** - Issue fully resolved.

## Tool Usage
- Browser debugging: Added console.log statements to trace data flow
  - `useCategoryBudgetedValues` → Confirmed spreadsheet values arriving correctly (94082, 49586, etc.)
  - `usePlanningData` → Confirmed useMemo recalculating with populated budgetedValues
  - Console revealed goal_def structure: array not object

- Claude Chrome investigation:
  - Navigated to http://localhost:3001/planning
  - Read console messages to see goal_def raw structure
  - Confirmed values flowing through but not displaying

- Grep searches:
  - `grep "goal_def.*JSON.parse"` → Found reference implementation
  - Read `useCategoryScheduleGoalTemplates.ts` for correct pattern

- Test verification:
  - `npm test -- planning.integration.test.tsx` → 5/5 tests passed
  - Verified no regressions

## Environment
- Branch: `feature/planning-page`
- Latest commit: `4f34719d2` (feat: add Planning Page feature toggle to settings)
- Working directory: `/home/chid/git/actual/planning-page/packages/desktop-client`
- Dev server running: http://localhost:3001
- Feature flag: `enablePlanningPage` must be enabled in settings

## Validation Status
- **Unit tests:** 5/5 passed (`Planning.integration.test.tsx`)
- **Browser verification:** Manually confirmed at http://localhost:3001/planning
  - Total summary showing: Overfunded $7,555.51, Goal Target $52.23
  - Individual categories displaying correct overfunded amounts
  - Examples verified:
    - Groceries: $930.82 overfunded (goal $10.00)
    - Bills (Monthly): $4,702.50 overfunded (goal $2.50)
    - Monica Family: $346.50 overfunded (goal $3.50)
- **Data layer verified:** Spreadsheet bindings correctly returning values in cents
- **No regressions:** All other planning page features still working

## Next Steps

**Immediate (for commit):**
1. Review the fix one more time in browser
2. Ensure no console errors
3. Commit changes with message describing the goal_def array fix

**Future improvements (not blocking):**
1. Consider adding TypeScript types for goal_def structure to prevent similar bugs
2. Could add JSDoc comment explaining goal_def array structure for future developers
3. May want to handle cases where multiple simple/by-date goals exist (currently takes first match)

## Technical Notes

**goal_def Structure Reference:**
```typescript
// Actual structure in database:
category.goal_def = '[{"type":"simple","monthly":1000,"limit":{"amount":1500,"hold":null,"period":"monthly","start":null},"priority":1,"directive":"template"}]'

// After JSON.parse:
[
  {
    type: "simple",          // Goal type: simple, by-date, schedule, etc.
    monthly: 1000,           // Monthly budget amount in CENTS ($10.00)
    limit: {
      amount: 1500,          // Limit amount in CENTS ($15.00)
      hold: null,
      period: "monthly",
      start: null
    },
    priority: 1,
    directive: "template"
  }
]
```

**For Planning Page purposes:**
- We care about the `monthly` field for simple goals (this is the goal target amount)
- We care about the `target` field for by-date goals (this is the target amount to reach by a date)
- Other goal types (schedule, etc.) are not currently used in planning calculations
