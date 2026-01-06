import { useEffect, useMemo, useState } from 'react';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { envelopeBudget, trackingBudget } from '@desktop-client/spreadsheet/bindings';
import * as monthUtils from 'loot-core/shared/months';

interface CategoryGoalData {
  goal: number | null;
  longGoal: number;
}

export function useCategoryGoalValues(categoryIds: string[]) {
  const spreadsheet = useSpreadsheet();
  const [budgetTypePref] = useSyncedPref('budgetType');
  const budgetType = budgetTypePref === 'tracking' ? 'tracking' : 'envelope';

  const currentMonth = monthUtils.currentMonth();
  const sheetName = monthUtils.sheetForMonth(currentMonth);

  const [goalValues, setGoalValues] = useState<Record<string, CategoryGoalData>>({});

  // Memoize the category goal bindings to avoid unnecessary effect re-runs
  const categoryGoalBindings = useMemo(
    () =>
      categoryIds.map(categoryId => {
        const budgetBindings = budgetType === 'tracking' ? trackingBudget : envelopeBudget;
        return [
          categoryId,
          budgetBindings.catGoal(categoryId),
          budgetBindings.catLongGoal(categoryId),
        ] as const;
      }),
    [budgetType, categoryIds],
  );

  useEffect(() => {
    const unbindList: (() => void)[] = [];

    for (const [categoryId, goalBinding, longGoalBinding] of categoryGoalBindings) {
      // Track goal and longGoal values for each category
      const goalData: Partial<CategoryGoalData> = {};

      // Bind goal value
      const unbindGoal = spreadsheet.bind(sheetName, goalBinding, result => {
        goalData.goal = typeof result.value === 'number' ? result.value : null;
        if (goalData.longGoal !== undefined) {
          setGoalValues(prev => ({
            ...prev,
            [categoryId]: goalData as CategoryGoalData,
          }));
        }
      });
      unbindList.push(unbindGoal);

      // Bind longGoal value
      const unbindLongGoal = spreadsheet.bind(sheetName, longGoalBinding, result => {
        goalData.longGoal = typeof result.value === 'number' ? result.value : 0;
        if (goalData.goal !== undefined) {
          setGoalValues(prev => ({
            ...prev,
            [categoryId]: goalData as CategoryGoalData,
          }));
        }
      });
      unbindList.push(unbindLongGoal);
    }

    return () => {
      unbindList.forEach(unbind => unbind());
    };
  }, [categoryGoalBindings, sheetName, spreadsheet]);

  return goalValues;
}
