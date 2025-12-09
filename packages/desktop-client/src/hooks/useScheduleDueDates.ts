import { q } from 'loot-core/shared/query';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';
import {
  type Template,
  type ScheduleTemplate,
} from 'loot-core/types/models/templates';

import { aqlQuery } from '@desktop-client/queries/aqlQuery';

export type ScheduleDateInfo = {
  scheduleId: string;
  scheduleName: string;
  nextDate: string;
};

/**
 * Extracts schedule templates from a category's goal_def JSON field
 */
function extractScheduleTemplatesFromCategory(
  category: CategoryEntity,
): ScheduleTemplate[] {
  if (!category.goal_def) return [];

  try {
    const templates: Template[] = JSON.parse(category.goal_def);
    return (
      templates
        .filter((t): t is ScheduleTemplate => t.type === 'schedule')
        // Filter out any error templates
        .filter(t => 'name' in t && t.name)
    );
  } catch {
    return [];
  }
}

/**
 * Async version of useScheduleDueDates for use with useEffect
 */
export async function fetchScheduleDueDates(
  categoryGroups: CategoryGroupEntity[],
): Promise<Map<string, string | null>> {
  try {
    // 1. Flatten all categories and extract schedule templates
    const categoryScheduleMap = new Map<string, ScheduleTemplate[]>();

    for (const group of categoryGroups) {
      if (group.categories) {
        for (const category of group.categories) {
          const scheduleTemplates =
            extractScheduleTemplatesFromCategory(category);
          if (scheduleTemplates.length > 0) {
            categoryScheduleMap.set(category.id, scheduleTemplates);
          }
        }
      }
    }

    // If no categories have schedules, return empty map
    if (categoryScheduleMap.size === 0) {
      return new Map();
    }

    // 2. Collect all unique schedule names
    const scheduleNames = new Set<string>();
    for (const templates of categoryScheduleMap.values()) {
      templates.forEach(t => scheduleNames.add(t.name));
    }

    if (scheduleNames.size === 0) {
      return new Map();
    }

    // 3. Fetch schedules by name in a single batch query
    const queryResult = await aqlQuery(
      q('schedules')
        .filter({
          name: { $oneof: Array.from(scheduleNames) },
          tombstone: false,
        })
        .select(['id', 'name', 'next_date']),
    );

    const schedules = queryResult?.data || [];

    // 4. Build a map of schedule name -> next_date
    const scheduleNameToDateMap = new Map<string, string>();
    for (const schedule of schedules) {
      if (schedule.name && schedule.next_date) {
        scheduleNameToDateMap.set(schedule.name, schedule.next_date);
      }
    }

    // 5. Build final map of categoryId -> earliest next_date
    const result = new Map<string, string | null>();
    for (const [categoryId, templates] of categoryScheduleMap.entries()) {
      // Find earliest due date among all schedule templates for this category
      let earliestDate: string | null = null;
      for (const template of templates) {
        const date = scheduleNameToDateMap.get(template.name);
        if (date) {
          if (!earliestDate || date < earliestDate) {
            earliestDate = date;
          }
        }
      }
      result.set(categoryId, earliestDate);
    }

    return result;
  } catch (error) {
    console.error('Error fetching schedule due dates:', error);
    return new Map();
  }
}

/**
 * Fetches all schedule dates for categories (not just earliest)
 * Returns a map of categoryId -> array of schedule date info, sorted soonest first
 */
export async function fetchCategoryScheduleDates(
  categoryGroups: CategoryGroupEntity[],
): Promise<Map<string, ScheduleDateInfo[]>> {
  try {
    // 1. Extract schedule templates from categories (reuse existing logic)
    const categoryScheduleMap = new Map<string, ScheduleTemplate[]>();
    for (const group of categoryGroups) {
      if (group.categories) {
        for (const category of group.categories) {
          const templates = extractScheduleTemplatesFromCategory(category);
          if (templates.length > 0) {
            categoryScheduleMap.set(category.id, templates);
          }
        }
      }
    }

    if (categoryScheduleMap.size === 0) return new Map();

    // 2. Collect unique schedule names
    const scheduleNames = new Set<string>();
    for (const templates of categoryScheduleMap.values()) {
      templates.forEach(t => scheduleNames.add(t.name));
    }

    if (scheduleNames.size === 0) return new Map();

    // 3. Fetch all schedules (same query as fetchScheduleDueDates)
    const queryResult = await aqlQuery(
      q('schedules')
        .filter({
          name: { $oneof: Array.from(scheduleNames) },
          tombstone: false,
        })
        .select(['id', 'name', 'next_date']),
    );

    const schedules = queryResult?.data || [];

    // 4. Build map of schedule name -> schedule info
    const scheduleMap = new Map<string, ScheduleDateInfo>();
    for (const schedule of schedules) {
      if (schedule.name && schedule.next_date) {
        scheduleMap.set(schedule.name, {
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          nextDate: schedule.next_date,
        });
      }
    }

    // 5. Build final map: categoryId -> sorted ScheduleDateInfo[]
    const result = new Map<string, ScheduleDateInfo[]>();
    for (const [categoryId, templates] of categoryScheduleMap.entries()) {
      const categorySchedules: ScheduleDateInfo[] = [];

      for (const template of templates) {
        const scheduleInfo = scheduleMap.get(template.name);
        if (scheduleInfo) {
          categorySchedules.push(scheduleInfo);
        }
      }

      // Sort by next_date (soonest first) - string comparison works for YYYY-MM-DD
      categorySchedules.sort((a, b) =>
        a.nextDate < b.nextDate ? -1 : a.nextDate > b.nextDate ? 1 : 0,
      );

      if (categorySchedules.length > 0) {
        result.set(categoryId, categorySchedules);
      }
    }

    return result;
  } catch (error) {
    console.error('Error fetching category schedule dates:', error);
    return new Map();
  }
}
