import { useEffect, useMemo, useState } from 'react';

import * as monthUtils from 'loot-core/shared/months';

import { useCategories } from './useCategories';
import { useLocalPref } from './useLocalPref';
import { useSpreadsheet } from './useSpreadsheet';

import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

/**
 * Calculates the sum of all goal values for visible expense categories in the current month.
 *
 * @param month The month string (e.g., "2024-01") to calculate goals for
 * @returns The total sum of goal values across all visible expense categories
 */
export function useGoalTargetSum(month: string): number {
  const sheetName = monthUtils.sheetForMonth(month);

  const spreadsheet = useSpreadsheet();
  const categories = useCategories();
  const [showHiddenCategories] = useLocalPref('budget.showHiddenCategories');

  console.log('useGoalTargetSum: sheetName=', sheetName, 'categories=', categories.grouped.length);

  // Calculate visible expense category IDs
  const visibleCategoryIds = useMemo(() => {
    const ids = categories.grouped
      .filter(group => !group.is_income) // Only expense groups
      .filter(group => showHiddenCategories || !group.hidden) // Filter hidden groups
      .flatMap(group => group.categories || [])
      .filter(cat => showHiddenCategories || !cat.hidden) // Filter hidden categories
      .map(cat => cat.id);
    console.log('useGoalTargetSum: visibleCategoryIds=', ids);
    return ids;
  }, [categories.grouped, showHiddenCategories]);

  // Track goal values for each visible category
  const [goalValues, setGoalValues] = useState<Record<string, number>>({});

  // Subscribe to goal values for all visible categories
  useEffect(() => {
    // If no sheet name or visible categories, skip subscriptions
    if (!sheetName || visibleCategoryIds.length === 0) {
      console.log('useGoalTargetSum: Skipping subscriptions - sheetName=', sheetName, 'visibleCategoryIds.length=', visibleCategoryIds.length);
      setGoalValues({});
      return;
    }

    console.log('useGoalTargetSum: Setting up subscriptions for', visibleCategoryIds.length, 'categories');
    const unbinds = visibleCategoryIds.map(categoryId => {
      return spreadsheet.bind(
        sheetName,
        envelopeBudget.catGoal(categoryId),
        (result) => {
          console.log('useGoalTargetSum: Got goal for', categoryId, '=', result.value);
          setGoalValues(prev => ({
            ...prev,
            [categoryId]: result.value ?? 0
          }));
        }
      );
    });

    // Clean up goals for categories no longer visible
    setGoalValues(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        if (!visibleCategoryIds.includes(id)) {
          delete updated[id];
        }
      });
      return updated;
    });

    return () => unbinds.forEach(unbind => unbind());
  }, [visibleCategoryIds, sheetName, spreadsheet]);

  // Calculate total goal sum
  return useMemo(() => {
    return Object.values(goalValues).reduce((sum, val) => sum + val, 0);
  }, [goalValues]);
}
