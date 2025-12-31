import { useMemo } from 'react';
import * as monthUtils from 'loot-core/shared/months';
import { useCategories } from './useCategories';
import { useSyncedPref } from './useSyncedPref';

type BudgetSummary = {
  spent: number;
  budgeted: number;
  goalTarget: number;
  underfunded: number;
  overfunded: number;
};

export function useBudgetSummary(): BudgetSummary {
  const currentMonth = monthUtils.currentMonth();
  const { list: categories } = useCategories();
  const [budgetType] = useSyncedPref('budgetType');

  const summary = useMemo(() => {
    let spent = 0;
    let budgeted = 0;
    let goalTarget = 0;
    let underfunded = 0;
    let overfunded = 0;

    // Aggregate values from all categories
    categories.forEach(category => {
      if (category.hidden || category.is_income) {
        return; // Skip hidden and income categories
      }

      // TODO: Implement actual sheet value reads based on budget type
      // Use existing calculation patterns from BudgetTable
    });

    return {
      spent,
      budgeted,
      goalTarget,
      underfunded,
      overfunded,
    };
  }, [categories, currentMonth, budgetType]);

  return summary;
}
