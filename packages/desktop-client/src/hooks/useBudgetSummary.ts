import { useEffect, useState } from 'react';
import { useCategories } from './useCategories';
import { useSheetValue } from './useSheetValue';
import { useSheetName } from './useSheetName';
import { useSpreadsheet } from './useSpreadsheet';
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
  return input !== undefined && ['envelope', 'tracking'].includes(input);
}

export function useBudgetSummary(): BudgetSummary {
  const { list: categories } = useCategories();
  const [budgetTypePref] = useSyncedPref('budgetType');
  const budgetType = isBudgetType(budgetTypePref) ? budgetTypePref : 'envelope';
  const spreadsheet = useSpreadsheet();

  // Get totals from the spreadsheet based on budget type
  const totalSpentBinding =
    budgetType === 'envelope'
      ? envelopeBudget.totalSpent
      : trackingBudget.totalSpent;
  const totalSpent =
    useSheetValue<'envelope-budget' | 'tracking-budget', typeof totalSpentBinding>(
      totalSpentBinding,
    ) ?? 0;

  const totalBudgetedBinding =
    budgetType === 'envelope'
      ? envelopeBudget.totalBudgeted
      : trackingBudget.totalBudgetedExpense;
  const totalBudgeted =
    useSheetValue<'envelope-budget' | 'tracking-budget', typeof totalBudgetedBinding>(
      totalBudgetedBinding,
    ) ?? 0;

  // Get sheet name from the binding
  const { sheetName } = useSheetName<
    'envelope-budget' | 'tracking-budget',
    typeof totalSpentBinding
  >(totalSpentBinding);

  const [summary, setSummary] = useState<BudgetSummary>({
    spent: 0,
    budgeted: 0,
    goalTarget: 0,
    underfunded: 0,
    overfunded: 0,
  });

  // Fetch goal values and calculate under/overfunded for all categories
  useEffect(() => {
    async function fetchGoalData() {
      let totalGoal = 0;
      let totalUnderfunded = 0;
      let totalOverfunded = 0;

      const bindings = budgetType === 'envelope' ? envelopeBudget : trackingBudget;

      // Get goal and budgeted values for each category from the spreadsheet
      for (const category of categories) {
        if (category.hidden || category.is_income) {
          continue;
        }

        try {
          const goalBinding = bindings.catGoal(category.id);
          const budgetedBinding = bindings.catBudgeted(category.id);

          const goalResult = await spreadsheet.get(sheetName, goalBinding);
          const goalValue = goalResult.value;

          // Only process categories that have a goal set
          if (typeof goalValue === 'number' && goalValue !== 0) {
            totalGoal += goalValue;

            const budgetedResult = await spreadsheet.get(sheetName, budgetedBinding);
            const budgetedValue = typeof budgetedResult.value === 'number' ? budgetedResult.value : 0;

            // Calculate difference: budgeted - goal
            const difference = budgetedValue - goalValue;

            if (difference > 0) {
              totalOverfunded += difference;
            } else if (difference < 0) {
              totalUnderfunded += Math.abs(difference);
            }
          }
        } catch (error) {
          // Skip categories that don't have goals set
          console.warn(`Failed to fetch goal data for category ${category.id}:`, error);
        }
      }

      setSummary({
        spent: totalSpent,
        budgeted: totalBudgeted,
        goalTarget: totalGoal,
        underfunded: totalUnderfunded,
        overfunded: totalOverfunded,
      });
    }

    if (categories.length > 0 && sheetName) {
      fetchGoalData();
    }
  }, [categories, sheetName, spreadsheet, budgetType, totalSpent, totalBudgeted]);

  return summary;
}
