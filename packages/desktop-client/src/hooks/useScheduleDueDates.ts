import { q } from 'loot-core/shared/query';
import { type CategoryEntity, type CategoryGroupEntity } from 'loot-core/types/models';
import { type Template, type ScheduleTemplate } from 'loot-core/types/models/templates';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';

/**
 * Extracts schedule templates from a category's goal_def JSON field
 */
function extractScheduleTemplatesFromCategory(category: CategoryEntity): ScheduleTemplate[] {
  if (!category.goal_def) return [];

  try {
    const templates: Template[] = JSON.parse(category.goal_def);
    return templates
      .filter((t): t is ScheduleTemplate => t.type === 'schedule')
      // Filter out any error templates
      .filter(t => 'name' in t && t.name);
  } catch {
    return [];
  }
}

/**
 * Async version of useScheduleDueDates for use with useEffect
 */
export async function fetchScheduleDueDates(
  categoryGroups: CategoryGroupEntity[]
): Promise<Map<string, string | null>> {
  try {
    // 1. Flatten all categories and extract schedule templates
    const categoryScheduleMap = new Map<string, ScheduleTemplate[]>();

    for (const group of categoryGroups) {
      if (group.categories) {
        for (const category of group.categories) {
          const scheduleTemplates = extractScheduleTemplatesFromCategory(category);
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
          tombstone: 0
        })
        .select(['id', 'name', 'next_date'])
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
