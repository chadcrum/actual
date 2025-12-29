import { useSyncedPref } from './useSyncedPref';

export type PinnedCategoriesPreference = {
  ids: string[];
};

const DEFAULT_PINNED: PinnedCategoriesPreference = {
  ids: [],
};

export function usePinnedCategories() {
  const [pinnedPrefString, setPinnedPrefString] = useSyncedPref('pinnedCategories');

  // Parse the JSON string, or use default if not set
  let pinnedPref: PinnedCategoriesPreference;
  try {
    pinnedPref = pinnedPrefString
      ? JSON.parse(pinnedPrefString)
      : DEFAULT_PINNED;
  } catch {
    pinnedPref = DEFAULT_PINNED;
  }

  const validated = {
    ids: pinnedPref?.ids ?? [],
  };

  const savePinnedPref = (newPref: PinnedCategoriesPreference) => {
    setPinnedPrefString(JSON.stringify(newPref));
  };

  const togglePin = (categoryId: string) => {
    const isCurrentlyPinned = validated.ids.includes(categoryId);

    if (isCurrentlyPinned) {
      // Remove from pinned
      savePinnedPref({
        ids: validated.ids.filter((id: string) => id !== categoryId),
      });
    } else {
      // Add to pinned
      savePinnedPref({
        ids: [...validated.ids, categoryId],
      });
    }
  };

  return {
    pinnedIds: validated.ids,
    isPinned: (categoryId: string) => validated.ids.includes(categoryId),
    togglePin,
  };
}
