# Fork Customizations

## Features Added

### Pinned Budget Categories (Feature Flag: `enablePinnedCategories`)

**Purpose:** Allow users to pin critical budget categories to the mobile home page for quick access.

**Architecture:**

- Feature flag in `loot-core/src/featureFlags.ts` (defaults to `false`)
- Hook: `usePinnedCategories()` for managing pinned state in `packages/desktop-client/src/hooks/usePinnedCategories.ts`
- Components:
  - `PinnedCategoryRow.tsx` - Individual category row with drag handle
  - `PinnedCategoriesSection.tsx` - Layout for pinned categories with drag-and-drop
  - `MobileSummaryPage.tsx` - Integration point (seam) that conditionally renders pinned section
- Pin/unpin toggle button added to `EnvelopeBudgetMenuModal.tsx`

**User Flow:**

1. User views category budget modal in the budget section
2. Clicks "Pin" button to add to pinned categories (only visible if flag enabled)
3. Pinned categories appear below budget summary on home page in "Pinned Categories" section
4. User can drag categories to reorder them
5. Selection persists across sessions via `useSyncedPref('pinnedCategories')`

**Compliance:**

- Follows fork guidelines (high-level seam pattern at layout level)
- Additive changes only - doesn't modify core behavior
- Feature flag gates all new behavior - when disabled, no UI is shown
- Leverages existing hooks:
  - `useSyncedPref` - for persistent preference storage
  - `useSheetValue` - for retrieving category balances
  - `useCategories` - for category data
  - `useFormat` - for formatting currency values
  - `useFeature` - for checking feature flag status

**Data Storage:**

- Preference key: `pinnedCategories`
- Structure: `{ ids: string[], order: string[] }`
- Stored via synced user preferences (persists across devices)
- Default: Empty arrays (no pinned categories)

**Testing:**

- Unit tests for PinnedCategoriesSection component (`PinnedCategoriesSection.test.tsx`)
- Tests cover: empty state, header rendering, correct ordering
- Tests mock `react-beautiful-dnd` to avoid drag-drop complexity
- All tests passing

**Notes:**

- Drag-and-drop implemented with `react-beautiful-dnd` (already a project dependency)
- Component uses existing theme colors: `theme.buttonMenuBackground`, `theme.pageText`, etc.
- Uses existing Actual Budget UI components: Block, View, Button, Icon, PrivacyFilter
- Privacy filter applied to balance amounts as per app standards
