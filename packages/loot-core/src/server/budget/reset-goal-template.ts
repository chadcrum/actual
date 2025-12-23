import { CategoryEntity } from '../../types/models';
import type { Template } from '../../types/models/templates';
import { q } from '../../shared/query';
import * as monthUtils from '../../shared/months';
import { aqlQuery } from '../aql';
import { storeNoteTemplates } from './template-notes';
import { setGoal, getSheetValue } from './actions';
import { batchMessages } from '../sync';

type Notification = {
  type?: 'message' | 'error' | 'warning' | undefined;
  pre?: string | undefined;
  title?: string | undefined;
  message: string;
  sticky?: boolean | undefined;
};

type TemplateGoal = {
  category: CategoryEntity['id'];
  goal: number | null;
  longGoal: number | null;
};

async function getTemplates(
  filter: (category: CategoryEntity) => boolean = () => true,
): Promise<Record<CategoryEntity['id'], Template[]>> {
  //retrieves template definitions from the database
  const { data: categoriesWithGoalDef }: { data: CategoryEntity[] } =
    await aqlQuery(
      q('categories')
        .filter({ goal_def: { $ne: null } })
        .select('*'),
    );

  const categoryTemplates: Record<CategoryEntity['id'], Template[]> = {};
  for (const categoryWithGoalDef of categoriesWithGoalDef.filter(filter)) {
    if (categoryWithGoalDef.goal_def) {
      categoryTemplates[categoryWithGoalDef.id] = JSON.parse(
        categoryWithGoalDef.goal_def,
      );
    }
  }
  return categoryTemplates;
}

async function setGoals(month: string, templateGoal: TemplateGoal[]) {
  await batchMessages(async () => {
    templateGoal.forEach(element => {
      setGoal({
        month,
        category: element.category,
        goal: element.goal,
        long_goal: element.longGoal,
      });
    });
  });
}

/**
 * Get categories with orphaned goal state (have goals but no template definitions).
 * Orphaned goals occur when users remove #template from notes after applying templates.
 */
async function getOrphanedGoals(
  month: string,
  categoryIds: CategoryEntity['id'][],
): Promise<CategoryEntity['id'][]> {
  const sheetName = monthUtils.sheetForMonth(month);
  const orphanedCategories: CategoryEntity['id'][] = [];

  for (const categoryId of categoryIds) {
    const existingGoal = await getSheetValue(sheetName, `goal-${categoryId}`);
    if (existingGoal !== null && existingGoal !== 0) {
      orphanedCategories.push(categoryId);
    }
  }

  return orphanedCategories;
}

/**
 * Reset all templates for a month by clearing goal state.
 * Template definitions (goal_def) remain intact.
 * Budgeted amounts remain unchanged.
 * Also clears orphaned goal state from categories that no longer have templates.
 */
export async function resetTemplatesForMonth({
  month,
}: {
  month: string;
}): Promise<Notification> {
  await storeNoteTemplates();
  const categoryTemplates = await getTemplates();

  // Get all categories that have templates
  const categoriesWithTemplates = Object.keys(categoryTemplates);

  // Query all categories to check for orphaned goals
  const { data: allCategories }: { data: CategoryEntity[] } = await aqlQuery(
    q('categories').filter({ tombstone: false }).select('*'),
  );

  // Find categories without templates that might have orphaned goals
  const categoriesWithoutTemplates = allCategories
    .map(c => c.id)
    .filter(id => !categoriesWithTemplates.includes(id));

  const orphanedGoalCategories = await getOrphanedGoals(
    month,
    categoriesWithoutTemplates,
  );

  const totalCategoriesToReset =
    categoriesWithTemplates.length + orphanedGoalCategories.length;

  if (totalCategoriesToReset === 0) {
    return {
      type: 'message',
      message: 'No templates or goals found to reset for this month',
    };
  }

  // Clear goal state for all categories with templates OR orphaned goals
  const templateGoals: TemplateGoal[] = [
    ...categoriesWithTemplates.map(categoryId => ({
      category: categoryId,
      goal: null,
      longGoal: null,
    })),
    ...orphanedGoalCategories.map(categoryId => ({
      category: categoryId,
      goal: null,
      longGoal: null,
    })),
  ];

  await setGoals(month, templateGoals);

  // Provide informative feedback
  if (categoriesWithTemplates.length > 0 && orphanedGoalCategories.length > 0) {
    return {
      type: 'message',
      message: `Successfully reset ${categoriesWithTemplates.length} template(s) and cleared ${orphanedGoalCategories.length} orphaned goal(s)`,
    };
  } else if (orphanedGoalCategories.length > 0) {
    return {
      type: 'message',
      message: `Successfully cleared ${orphanedGoalCategories.length} orphaned goal(s)`,
    };
  } else {
    return {
      type: 'message',
      message: `Successfully reset ${categoriesWithTemplates.length} template(s)`,
    };
  }
}

/**
 * Reset a single category template by clearing goal state.
 * Template definition (goal_def) remains intact.
 * Budgeted amount remains unchanged.
 * Also clears orphaned goal state if category no longer has a template.
 */
export async function resetSingleCategoryTemplate({
  month,
  category,
}: {
  month: string;
  category: CategoryEntity['id'];
}): Promise<Notification> {
  await storeNoteTemplates();
  const categoryTemplates = await getTemplates(c => c.id === category);

  const hasTemplate = !!categoryTemplates[category];

  // Check for orphaned goal if no template exists
  if (!hasTemplate) {
    const sheetName = monthUtils.sheetForMonth(month);
    const existingGoal = await getSheetValue(sheetName, `goal-${category}`);

    if (existingGoal === null || existingGoal === 0) {
      return {
        type: 'error',
        message: 'No template or goal found for this category',
      };
    }

    // Clear orphaned goal
    await setGoals(month, [{ category, goal: null, longGoal: null }]);

    return {
      type: 'message',
      message: 'Orphaned goal cleared successfully',
    };
  }

  // Clear template goal (original behavior)
  await setGoals(month, [{ category, goal: null, longGoal: null }]);

  return {
    type: 'message',
    message: 'Template reset successfully',
  };
}
