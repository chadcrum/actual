import { useMemo } from 'react';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useCategoryBudgetedValues } from './useCategoryBudgetedValues';
import { useCategoryGoalValues } from './useCategoryGoalValues';

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

  // Get all category IDs for fetching budgeted values (excluding income groups)
  const allCategoryIds = useMemo(() => {
    return categoryGroups
      .filter(group => !group.hidden && !group.is_income)
      .flatMap(group =>
        group.categories
          ?.filter(cat => !cat.hidden && !cat.tombstone)
          .map(cat => cat.id) || []
      );
  }, [categoryGroups]);

  const budgetedValues = useCategoryBudgetedValues(allCategoryIds);
  const goalValues = useCategoryGoalValues(allCategoryIds);

  return useMemo(() => {
    const planningGroups: PlanningGroup[] = [];

    categoryGroups.forEach(group => {
      if (group.hidden || group.is_income) return;

      const planningCategories: PlanningCategory[] = [];

      group.categories?.forEach(category => {
        if (category.hidden || category.tombstone) return;

        // Get budgeted value from spreadsheet
        const budgetedValue = budgetedValues[category.id] ?? 0;

        // Get goal values from spreadsheet (same as Budget page)
        const categoryGoalData = goalValues[category.id];
        const goalValue = categoryGoalData?.goal ?? null;
        const isLongGoal = categoryGoalData?.longGoal === 1;

        // Calculate overfunded/underfunded using same logic as BalanceWithCarryover
        let overfunded = 0;
        let underfunded = 0;

        if (goalValue != null) {
          // For template goals (longGoal !== 1), use budgetedValue - goalValue
          // For long goals (longGoal === 1), would use balanceValue - goalValue
          // Planning page focuses on budgeted amounts, so we always use budgetedValue
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
  }, [categoryGroups, budgetedValues, goalValues]);
}
