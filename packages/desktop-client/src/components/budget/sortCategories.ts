import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

/**
 * Sorts categories within each group by schedule due date
 * Categories with schedule templates appear first (sorted by earliest due date)
 * followed by categories without schedules (sorted by original sort_order),
 * and hidden categories always at the end.
 */
export function sortCategoriesByScheduleDueDate(
  categoryGroups: CategoryGroupEntity[],
  scheduleDueDates: Map<string, string | null>,
  showHiddenCategories: boolean,
): CategoryGroupEntity[] {
  return categoryGroups.map(group => {
    if (!group.categories || group.categories.length === 0) {
      return group;
    }

    // Separate categories into three buckets
    const hidden: CategoryEntity[] = [];
    const scheduled: CategoryEntity[] = [];
    const nonScheduled: CategoryEntity[] = [];

    for (const category of group.categories) {
      if (category.hidden && !showHiddenCategories) {
        hidden.push(category);
      } else {
        const dueDate = scheduleDueDates.get(category.id);
        if (dueDate !== undefined && dueDate !== null) {
          scheduled.push(category);
        } else {
          nonScheduled.push(category);
        }
      }
    }

    // Sort scheduled categories by due date (ascending = earliest first)
    // With stable sort: if dates are equal, use original sort_order
    scheduled.sort((a, b) => {
      const dateA = scheduleDueDates.get(a.id) || '';
      const dateB = scheduleDueDates.get(b.id) || '';

      // String comparison works for YYYY-MM-DD format
      const dateCompare = dateA.localeCompare(dateB);
      if (dateCompare !== 0) {
        return dateCompare;
      }

      // If dates are equal, fall back to original sort_order
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });

    // Keep non-scheduled categories sorted by original sort_order
    nonScheduled.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    // Combine: [scheduled (sorted by date)] + [non-scheduled (by sort_order)] + [hidden]
    const sortedCategories = [...scheduled, ...nonScheduled, ...hidden];

    // Return new group with sorted categories
    return {
      ...group,
      categories: sortedCategories,
    };
  });
}
