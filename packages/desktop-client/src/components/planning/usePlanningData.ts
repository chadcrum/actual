import { useMemo } from 'react';
import { useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { useSelector } from '@desktop-client/redux';
import type { CategoryEntity, CategoryGroupEntity } from 'loot-core/types/models';

interface PlanningCategory {
  id: string;
  name: string;
  groupId: string;
  budgeted: number;
  goalTarget: number | null;
  overfunded: number;
  underfunded: number;
  isLongGoal: boolean;
}

interface PlanningGroup {
  id: string;
  name: string;
  categories: PlanningCategory[];
}

export function usePlanningData() {
  const spreadsheet = useSpreadsheet();
  const categories = useSelector(state => state.queries.categories.list) as CategoryEntity[];
  const categoryGroups = useSelector(state => state.queries.categories.grouped) as CategoryGroupEntity[];

  return useMemo(() => {
    const planningGroups: PlanningGroup[] = [];

    categoryGroups.forEach(group => {
      if (group.hidden) return;

      const planningCategories: PlanningCategory[] = [];

      group.categories?.forEach(category => {
        if (category.hidden || category.tombstone) return;

        // Get budgeted amount for current month
        const budgetedValue = spreadsheet.getCellValue(
          `budget-${category.id}`
        ) || 0;

        // Get goal data
        const goalValue = spreadsheet.getCellValue(`goal-${category.id}`) || null;
        const longGoalValue = spreadsheet.getCellValue(`long-goal-${category.id}`) || 0;
        const isLongGoal = longGoalValue === 1;

        // Calculate overfunded/underfunded
        let overfunded = 0;
        let underfunded = 0;

        if (goalValue != null) {
          const difference = budgetedValue - goalValue;
          if (difference > 0) {
            overfunded = difference;
          } else if (difference < 0) {
            underfunded = Math.abs(difference);
          }
        }

        planningCategories.push({
          id: category.id,
          name: category.name,
          groupId: group.id,
          budgeted: budgetedValue,
          goalTarget: goalValue,
          overfunded,
          underfunded,
          isLongGoal,
        });
      });

      if (planningCategories.length > 0) {
        planningGroups.push({
          id: group.id,
          name: group.name,
          categories: planningCategories,
        });
      }
    });

    return {
      groups: planningGroups,
    };
  }, [spreadsheet, categories, categoryGroups]);
}
