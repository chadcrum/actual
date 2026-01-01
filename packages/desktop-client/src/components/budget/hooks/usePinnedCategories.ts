import { useCallback, useMemo } from 'react';
import { useSyncedPref } from '../../../hooks/useSyncedPref';
import { useCategories } from '../../../hooks/useCategories';
import type { CategoryEntity } from 'loot-core/types/models/category';

export function usePinnedCategories() {
  const [pinnedCategoryIdsStr, savePinnedCategoryIds] =
    useSyncedPref('pinnedCategoryIds');
  const categoryViews = useCategories();

  // Parse the JSON string to get the array of pinned category IDs
  const pinnedCategoryIds = useMemo(() => {
    try {
      return pinnedCategoryIdsStr
        ? JSON.parse(pinnedCategoryIdsStr)
        : [];
    } catch (e) {
      console.error('Failed to parse pinnedCategoryIds preference:', e);
      return [];
    }
  }, [pinnedCategoryIdsStr]);

  const isPinned = useCallback(
    (categoryId: string) => {
      return pinnedCategoryIds.includes(categoryId);
    },
    [pinnedCategoryIds]
  );

  const togglePin = useCallback(
    (categoryId: string) => {
      const isCurrentlyPinned = pinnedCategoryIds.includes(categoryId);
      const newPinnedIds = isCurrentlyPinned
        ? pinnedCategoryIds.filter((id: string) => id !== categoryId)
        : [...pinnedCategoryIds, categoryId];

      savePinnedCategoryIds(JSON.stringify(newPinnedIds));
    },
    [pinnedCategoryIds, savePinnedCategoryIds]
  );

  const getPinnedCategories = useCallback(() => {
    const categoryList = categoryViews?.list;
    if (!categoryList) return [];

    // Return pinned categories in the order they were pinned (from pinnedCategoryIds)
    const categoryMap = new Map(categoryList.map(cat => [cat.id, cat]));
    return pinnedCategoryIds
      .map((id: string) => categoryMap.get(id))
      .filter((cat: CategoryEntity | undefined) => cat !== undefined) as CategoryEntity[];
  }, [categoryViews, pinnedCategoryIds]);

  return {
    pinnedCategoryIds,
    isPinned,
    togglePin,
    getPinnedCategories,
  };
}
