# AGENTS-chad-fork Compliance Analysis

## Question

Does the proposed fix for budget-tooltip-funding-status future months conform to `integration-chad/AGENTS-chad-fork.md`?

## Answer: ✅ YES - The Fix is Compliant

However, there's an **important clarification**: The issue is **not a fork-specific problem**. It's an **upstream bug** that needs to be fixed in the core hook before the feature can work correctly for future months.

---

## Compliance Analysis

### Core Principle 1: Upstream is Source of Truth ✅

**Rule**: Default behavior must remain identical to upstream when feature flags are disabled.

**Analysis**:

- The `useGoalFundingStatus` hook is a **NEW hook** (created for this fork feature)
- It doesn't modify upstream behavior at all
- Upstream functionality is unchanged
- When the feature flag `budget-tooltip-goals` is disabled, the hook isn't called, so no upstream impact

**Status**: ✅ COMPLIANT

---

### Core Principle 2: Prefer Additive Changes ✅

**Rule**: Add extension points (seams) instead of rewriting existing logic.

**Analysis**:

- The fix is **purely additive** - it adds sheet pre-initialization logic
- No existing logic is rewritten or modified
- The calculation logic remains unchanged
- The fix simply ensures data is available before calculations run

**Status**: ✅ COMPLIANT

---

### Core Principle 3: Flags Gate Extensions ✅

**Rule**: Feature flags enable additional behavior/UI — they should not fork entire code paths.

**Analysis**:

- The hook is already behind the `budget-tooltip-goals` flag (by design)
- The pre-initialization fix is **internal to the hook** and not flag-conditional
- This is appropriate because it's a **correctness fix**, not a feature toggle
- When the flag is disabled, the hook isn't called at all

**Status**: ✅ COMPLIANT

---

### Core Principle 4: Seams Are Intentional and Documented ✅

**Rule**: A single explicit seam is better than many scattered edits.

**Analysis**:

- The feature already established a seam at container/boundary level (BudgetSummary, ToBudgetAmount, EnvelopeBudgetSummaryModal)
- These containers receive hook-based data as props (TotalsList composition pattern)
- The pre-initialization fix stays within the hook (no new seams needed)
- The seam structure remains unchanged

**Status**: ✅ COMPLIANT

---

### Core Principle 5: Behavior in Core, Presentation in Web ✅

**Rule**: `loot-core` defines behavior and flags; `@actual-app/web` defines UI extensions.

**Analysis**:

- The fix is in `packages/desktop-client` (the web layer)
- It's a performance/correctness fix to ensure spreadsheet data is available
- No changes to `loot-core` behavior
- The hook already lives in `@actual-app/web` (desktop-client)

**Status**: ✅ COMPLIANT

---

## Feature Flags Section ✅

**Rule**: Flags must default to `false`, be centralized, and sound temporary.

**Analysis**:

- The feature uses the existing `budget-tooltip-goals` flag
- Flag is inherited from the initial feature implementation
- Already centralized and documented
- Already defaults to `false`

**Status**: ✅ COMPLIANT

---

## Seams Section ✅

### Rule 1: Seams must exist independently of feature flags ✅

**Analysis**:

- The TotalsList component accepts optional props for goal-related rows (including underfunded/overfunded)
- The seam exists even if the flag is disabled (props just remain undefined)
- Containers decide what to pass based on the flag
- The structure is independent of the flag

**Status**: ✅ COMPLIANT

### Rule 2: Prefer high-level seams ✅

**Analysis**:

- Seam is at container/boundary level (BudgetSummary, ToBudgetAmount, EnvelopeBudgetSummaryModal)
- NOT at leaf component level (TotalsList)
- Exactly matches the "layout shells, responsive boundaries" guidance

**Status**: ✅ COMPLIANT

---

## Core Logic Changes ✅

**Rule**: Core logic changes must be minimal, additive, and flag-gated.

**Analysis**:

- No changes to `loot-core` behavior itself
- Fix is in web layer (desktop-client)
- Pre-initialization is additive: "ensure sheet is ready before subscribing"
- Not rewriting any existing logic paths
- Doesn't create branching systems

**Status**: ✅ COMPLIANT

---

## Documentation Requirements ✅

**Rule**: Every fork must include AGENTS.md and FORK_NOTES.md with rationale.

**Status**:

- ✅ AGENTS-chad-fork.md exists in repo
- ✅ FORK_NOTES.md exists in repo
- ✅ Investigation report documents the rationale
- ⏳ FORK_NOTES.md should be updated with this fix once implemented

---

## Warning Signs Analysis

### "The same files conflict every upstream merge" ❌

- Not applicable - this is a new feature/fix, not a modification of existing files

### "Feature flags stack deeply" ❌

- Only one feature flag in use (`budget-tooltip-goals`)
- Not stacking multiple flags

### "Core logic is copied instead of extended" ❌

- This is a new hook, not a copy of existing code

### "Removing a feature flag requires large UI refactors" ❌

- To disable: Just delete the props from 3 container call sites
- Simple and clean removal

**Status**: ✅ NO WARNING SIGNS

---

## Important Clarification

### This is Not a Fork-Specific Issue

The root cause is a **spreadsheet architecture issue in how future months are initialized**. This affects any fork trying to use month-specific data for uninitialized sheets.

### Three Implementation Paths

#### Path A: Patch in Fork (Current Plan) ⚠️

- **Location**: Fork-only (desktop-client hook)
- **Merge Conflicts**: Low (it's a new hook)
- **Upstream Compatibility**: ✅ Still high (feature flag is fork-specific)
- **Recommendation**: Acceptable, but see Path B

#### Path B: Upstream Fix (Better Long-term) 👑

- **Location**: Fix in upstream loot-core or desktop-client
- **Merge Conflicts**: Minimal
- **Upstream Compatibility**: ✅ Native support
- **Recommendation**: Ideal if upstream accepts it

#### Path C: Hybrid Approach (Pragmatic)

- **Location**: Post-fix, show upstream the working solution
- **Merge Conflicts**: Minimal
- **Recommendation**: Start with Path A, upstream Path B later

---

## Recommendation

✅ **Proceed with Implementation**

The proposed fix:

1. Remains fully compliant with AGENTS-chad-fork rules
2. Maintains all seam boundaries
3. Doesn't fork existing upstream code paths
4. Is additive and easy to remove or upstream
5. Has no warning signs

### Future Consideration

Once implemented and working, consider:

- Opening a discussion with Actual upstream about sheet pre-initialization
- The fix could benefit all users, not just this fork
- If accepted upstream, simply disable fork-specific feature flag

---

## Summary Table

| AGENTS Rule                    | Compliant? | Notes                                               |
| ------------------------------ | ---------- | --------------------------------------------------- |
| Upstream is source of truth    | ✅         | Feature flag disabled = unchanged upstream behavior |
| Prefer additive changes        | ✅         | Hook pre-initialization is purely additive          |
| Flags gate extensions          | ✅         | Flag controls entire feature, not internal logic    |
| Seams intentional & documented | ✅         | Seam already exists at container level              |
| Behavior in core, UI in web    | ✅         | Hook is web-layer, no loot-core changes             |
| Flags default false            | ✅         | Uses existing `budget-tooltip-goals` flag           |
| Seams independent of flags     | ✅         | TotalsList structure unchanged regardless of flag   |
| Prefer high-level seams        | ✅         | Seam at boundary/container, not in leaf component   |
| No warning signs               | ✅         | No stacking, copying, or difficult removals         |

**Grade: A - COMPLIANT**
