import { useMemo } from 'react';
import * as monthUtils from 'loot-core/shared/months';
import { useCategories } from './useCategories';
import { useSheetValue } from './useSheetValue';
import { useSyncedPref } from './useSyncedPref';
import { envelopeBudget, trackingBudget } from '@desktop-client/spreadsheet/bindings';

type BudgetSummary = {
  spent: number;
  budgeted: number;
  goalTarget: number;
  underfunded: number;
  overfunded: number;
};

function isBudgetType(input?: string): input is 'envelope' | 'tracking' {
  return ['envelope', 'tracking'].includes(input);
}

export function useBudgetSummary(): BudgetSummary {
  const currentMonth = monthUtils.currentMonth();
  const { list: categories, grouped: categoryGroups } = useCategories();
  const [budgetTypePref] = useSyncedPref('budgetType');
  const budgetType = isBudgetType(budgetTypePref) ? budgetTypePref : 'envelope';

  // Get totals from the spreadsheet
  const bindings = budgetType === 'envelope' ? envelopeBudget : trackingBudget;
  const totalSpent = useSheetValue(bindings.totalSpent) ?? 0;
  const totalBudgeted = useSheetValue(bindings.totalBudgeted) ?? 0;

  const summary = useMemo(() => {
    let goalTarget = 0;
    let underfunded = 0;
    let overfunded = 0;

    // Calculate goal target by summing all category goals (excluding hidden and income)
    categories.forEach(category => {
      if (category.hidden || category.is_income) {
        return;
      }

      if (category.goal) {
        goalTarget += Math.max(0, category.goal);
      }
    });

    // Calculate underfunded: categories that need more to reach their goals
    // Calculate overfunded: amount over the goal
    categories.forEach(category => {
      if (category.hidden || category.is_income || !category.goal) {
        return;
      }

      const catGoal = Math.max(0, category.goal);
      // In a simplified implementation, we track overall balance
      // A more precise calculation would need per-category data
    });

    // Simplified calculation for now
    // Underfunded = max(0, goalTarget - totalBudgeted)
    // Overfunded = max(0, totalBudgeted - goalTarget)
    if (totalBudgeted < goalTarget) {
      underfunded = goalTarget - totalBudgeted;
    } else {
      overfunded = totalBudgeted - goalTarget;
    }

    return {
      spent: totalSpent,
      budgeted: totalBudgeted,
      goalTarget,
      underfunded,
      overfunded,
    };
  }, [categories, totalSpent, totalBudgeted, currentMonth]);

  return summary;
}
