import { useCallback, useMemo } from 'react';

import type { CategoryEntity } from 'loot-core/types/models/category';

import { useCategories } from '@desktop-client/hooks/useCategories';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

/**
 * Hook for managing pinned categories in the budget overview.
 *
 * Stores pinned category IDs in synced preferences as a JSON string.
 * When retrieved, the JSON string is parsed into an array of category IDs.
 *
 * @returns {Object} Object containing:
 *   - pinnedCategoryIds: Array of currently pinned category IDs
 *   - isPinned: Function to check if a category is pinned
 *   - togglePin: Function to add/remove a category from pinned list
 *   - getPinnedCategories: Function to get full category objects in budget page order
 */
export function usePinnedCategories() {
  const [pinnedCategoryIdsStr, savePinnedCategoryIds] =
    useSyncedPref('pinnedCategoryIds');
  const categoryViews = useCategories();

  // NOTE: pinnedCategoryIds is stored as a JSON string in preferences because
  // the synced preference system stores all values as strings. We deserialize
  // here for type safety and filtering operations.
  const pinnedCategoryIds = useMemo(() => {
    try {
      return pinnedCategoryIdsStr ? JSON.parse(pinnedCategoryIdsStr) : [];
    } catch (e) {
      console.error('Failed to parse pinnedCategoryIds preference:', e);
      return [];
    }
  }, [pinnedCategoryIdsStr]);

  const isPinned = useCallback(
    (categoryId: string) => {
      return pinnedCategoryIds.includes(categoryId);
    },
    [pinnedCategoryIds],
  );

  const togglePin = useCallback(
    (categoryId: string) => {
      if (!categoryId) {
        console.warn('togglePin called with empty categoryId');
        return;
      }

      const isCurrentlyPinned = pinnedCategoryIds.includes(categoryId);
      const newPinnedIds = isCurrentlyPinned
        ? pinnedCategoryIds.filter((id: string) => id !== categoryId)
        : [...pinnedCategoryIds, categoryId];

      savePinnedCategoryIds(JSON.stringify(newPinnedIds));
    },
    [pinnedCategoryIds, savePinnedCategoryIds],
  );

  const getPinnedCategories = useCallback(() => {
    const categoryList = categoryViews?.list;
    if (!categoryList) return [];

    // Filter to pinned categories, maintaining budget page order
    return categoryList.filter((cat: CategoryEntity) =>
      pinnedCategoryIds.includes(cat.id),
    );
  }, [categoryViews, pinnedCategoryIds]);

  return {
    pinnedCategoryIds,
    isPinned,
    togglePin,
    getPinnedCategories,
  };
}
