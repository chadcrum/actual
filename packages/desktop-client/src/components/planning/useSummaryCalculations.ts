import { useMemo } from 'react';

interface PlanningCategory {
  id: string;
  overfunded: number;
  underfunded: number;
  goalTarget: number | null;
}

interface Summary {
  overfunded: number;
  underfunded: number;
  goalTarget: number;
}

export function useSummaryCalculations(
  categories: PlanningCategory[],
  selectedCategories: { [id: string]: boolean }
): Summary {
  return useMemo(() => {
    let totalOverfunded = 0;
    let totalUnderfunded = 0;
    let totalGoalTarget = 0;

    categories.forEach(category => {
      // Only include selected categories in summaries
      if (selectedCategories[category.id] ?? true) {
        totalOverfunded += category.overfunded;
        totalUnderfunded += category.underfunded;
        totalGoalTarget += category.goalTarget || 0;
      }
    });

    return {
      overfunded: totalOverfunded,
      underfunded: totalUnderfunded,
      goalTarget: totalGoalTarget,
    };
  }, [categories, selectedCategories]);
}
