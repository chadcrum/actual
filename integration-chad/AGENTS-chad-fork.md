# AGENTS.md

This document defines **rules and conventions for maintaining a private fork of Actual Budget** with custom UI and behavioral features while keeping long‑term compatibility with upstream.

The goal is to:

* Minimize merge conflicts
* Keep upstream behavior as the default
* Make customizations easy to reason about, remove, or upstream later

---

## Core Principles

1. **Upstream is the source of truth**
   Default behavior must remain identical to upstream when feature flags are disabled.

2. **Prefer additive changes over modifications**
   Add extension points (seams) instead of rewriting existing logic.

3. **Flags gate extensions, not rewrites**
   Feature flags enable additional behavior/UI — they should not fork entire code paths.

4. **Seams are intentional and documented**
   A single explicit seam is better than many scattered edits.

5. **Behavior lives in core, presentation lives in web**
   `loot-core` defines behavior and flags; `@actual-app/web` defines UI extensions.

---

## Feature Flags

### Where Flags Live

* **Source of truth:** `loot-core`
* **UI consumption:** Redux slice + hooks in `@actual-app/web`

Flags must:

* Default to `false`
* Be centralized and documented
* Sound temporary (e.g. `enableCustomToolbar`, not `toolbarV2`)

### Example

```ts
// loot-core/src/featureFlags.ts
export const defaultFeatureFlags = {
  enableCustomUI: false,
  enableExperimentalBudgetView: false,
};
```

```ts
// web/src/hooks/useFeatureFlag.ts
export function useFeatureFlag(key) {
  return useSelector(state => state.featureFlags[key]);
}
```

---

## Seams (Extension Points)

A **seam** is a deliberate location where custom behavior or UI can be injected without modifying core structure.

### Mandatory Rules for Seams

* **Seams must exist independently of feature flags**
  Feature flags may enable or disable behavior *inside* a seam, but flags must not create or remove structural UI boundaries.

* **Prefer high-level seams**
  Introduce seams at layout shells, responsive boundaries, or platform edges. Avoid adding seams deep inside leaf components unless upstream already uses the same pattern.

### Approved Seam Patterns

* Layout-level extension components
* Hook-based extensions (at layout/boundary level)
* Context-based render injection (at layout/boundary level)
* Responsive boundary components (`NarrowAlternate`, layout shells)

### Example

```tsx
export function Layout() {
  return (
    <>
      <MainLayout />
      <LayoutExtensions />
    </>
  );
}
```

```tsx
function LayoutExtensions() {
  const enabled = useFeatureFlag('enableCustomUI');
  if (!enabled) return null;

  return <CustomLayoutExtension />;
}
```

````

---

## Responsive Design Rules

Actual already branches on responsiveness. Use those boundaries.

### Rules

- Do **not** duplicate logic in `/mobile` and `/wide` unless necessary
- Prefer a single extension component that renders responsive variants

### Example

```tsx
function CustomLayoutExtension() {
  const { isNarrowWidth } = useResponsive();
  return isNarrowWidth ? <MobilePanel /> : <DesktopPanel />;
}
````

---

## Core Logic Changes (`loot-core`)

Core logic changes must be:

* Minimal
* Additive
* Flag-gated

### Good

```ts
export function getBudgetSummary(opts?: { experimental?: boolean }) {
  const base = getDefaultSummary();
  return opts?.experimental ? enhanceSummary(base) : base;
}
```

### Bad

```ts
if (flag) {
  useNewEngine();
} else {
  useOldEngine();
}
```

Avoid branching entire systems.

---

## Platform-Specific Behavior

* All platform differences must go through `global.Actual`
* Never branch on Electron vs Browser directly in UI components

### Example

```ts
if (flag && Actual.platform === 'desktop') {
  Actual.openNativePanel();
}
```

---

## Code Splitting & Organization

Custom code must:

* Live in a clearly named directory (e.g. `custom/`)
* Follow existing lazy-loading patterns

```ts
const DesktopPanel = React.lazy(() => import('./custom/wide/Panel'));
const MobilePanel = React.lazy(() => import('./custom/mobile/Panel'));
```

This minimizes surface area affected by upstream refactors.

---

## Branch Strategy

Recommended branches:

* `upstream/main` – untouched mirror of upstream
* `custom/integration` – receives upstream merges
* `custom/features` – custom work only

Merge upstream → integration → features.

---

## Documentation Requirements

Every fork must include:

* This `AGENTS.md`
* A `FORK_NOTES.md` describing:

  * Added seams
  * Added flags
  * Rationale for core changes

Document **why**, not just what.

---

## Warning Signs

Re-evaluate approach if:

* The same files conflict every upstream merge
* Feature flags stack deeply
* Core logic is copied instead of extended
* Removing a feature flag requires large UI refactors

These indicate missing seams.

---

## Golden Rule

> **Add seams where Actual already branches (responsive, layout, platform).**
> **Add flags where Actual already centralizes behavior (loot-core, Redux).**

Following this rule keeps the fork sustainable long-term.
