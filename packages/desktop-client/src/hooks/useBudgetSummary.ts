import { useMemo, useEffect, useState } from 'react';
import * as monthUtils from 'loot-core/shared/months';
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
  return ['envelope', 'tracking'].includes(input);
}

export function useBudgetSummary(): BudgetSummary {
  const currentMonth = monthUtils.currentMonth();
  const { list: categories } = useCategories();
  const [budgetTypePref] = useSyncedPref('budgetType');
  const budgetType = isBudgetType(budgetTypePref) ? budgetTypePref : 'envelope';
  const spreadsheet = useSpreadsheet();
  const { sheetName } = useSheetName();
  const [goalTarget, setGoalTarget] = useState(0);

  // Get totals from the spreadsheet
  const bindings = budgetType === 'envelope' ? envelopeBudget : trackingBudget;
  const totalSpent = useSheetValue(bindings.totalSpent) ?? 0;
  const totalBudgeted = useSheetValue(bindings.totalBudgeted) ?? 0;

  // Fetch goal values from spreadsheet for all categories
  useEffect(() => {
    async function fetchGoalTarget() {
      let total = 0;

      // Get goal values for each category from the spreadsheet
      for (const category of categories) {
        if (category.hidden || category.is_income) {
          continue;
        }

        try {
          const goalBinding = bindings.catGoal(category.id);
          const result = await spreadsheet.get(sheetName, goalBinding);
          const goalValue = result.value;

          if (typeof goalValue === 'number' && goalValue > 0) {
            total += goalValue;
          }
        } catch (error) {
          // Skip categories that don't have goals set
          console.warn(`Failed to fetch goal for category ${category.id}:`, error);
        }
      }

      setGoalTarget(total);
    }

    if (categories.length > 0 && sheetName) {
      fetchGoalTarget();
    }
  }, [categories, sheetName, spreadsheet, bindings]);

  const summary = useMemo(() => {
    let underfunded = 0;
    let overfunded = 0;

    // Calculate underfunded/overfunded based on total budgeted vs goal target
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
  }, [totalSpent, totalBudgeted, goalTarget]);

  return summary;
}
