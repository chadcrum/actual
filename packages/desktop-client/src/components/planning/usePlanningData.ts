import { useMemo } from 'react';
import { useCategories } from '@desktop-client/hooks/useCategories';

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
  const { grouped: categoryGroups } = useCategories();

  return useMemo(() => {
    const planningGroups: PlanningGroup[] = [];

    categoryGroups.forEach(group => {
      if (group.hidden) return;

      const planningCategories: PlanningCategory[] = [];

      group.categories?.forEach(category => {
        if (category.hidden || category.tombstone) return;

        // Initialize with zero values - actual budgeted amounts would be
        // retrieved from the spreadsheet in a component that needs them
        const budgetedValue = 0;

        // Parse goal definition if it exists
        let goalValue: number | null = null;
        let isLongGoal = false;

        if (category.goal_def) {
          try {
            const goalDef = JSON.parse(category.goal_def);
            goalValue = goalDef.target ?? null;
            isLongGoal = goalDef.type === 'by-date';
          } catch {
            // If parsing fails, leave as null
          }
        }

        // Calculate overfunded/underfunded
        let overfunded = 0;
        let underfunded = 0;

        if (goalValue != null && budgetedValue > 0) {
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
  }, [categoryGroups]);
}
