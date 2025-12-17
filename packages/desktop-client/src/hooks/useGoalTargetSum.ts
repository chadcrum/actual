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

  // Calculate visible expense category IDs
  const visibleCategoryIds = useMemo(() => {
    return categories.grouped
      .filter(group => !group.is_income) // Only expense groups
      .filter(group => showHiddenCategories || !group.hidden) // Filter hidden groups
      .flatMap(group => group.categories || [])
      .filter(cat => showHiddenCategories || !cat.hidden) // Filter hidden categories
      .map(cat => cat.id);
  }, [categories.grouped, showHiddenCategories]);

  // Track goal values for each visible category
  const [goalValues, setGoalValues] = useState<Record<string, number>>({});

  // Subscribe to goal values for all visible categories
  useEffect(() => {
    // If no sheet name or visible categories, skip subscriptions
    if (!sheetName || visibleCategoryIds.length === 0) {
      setGoalValues({});
      return;
    }

    const unbinds: (() => void)[] = [];

    // Subscribe to previous months as fallback (up to 12 months back)
    // This ensures goals cascade forward through multiple months
    const fallbackMonths: string[] = [];
    let lookbackMonth = month;
    for (let i = 0; i < 12; i++) {
      lookbackMonth = monthUtils.prevMonth(lookbackMonth);
      fallbackMonths.push(monthUtils.sheetForMonth(lookbackMonth));
    }

    visibleCategoryIds.forEach(categoryId => {
      // Subscribe to multiple previous months as fallback
      fallbackMonths.forEach(fallbackSheetName => {
        unbinds.push(
          spreadsheet.bind(
            fallbackSheetName,
            envelopeBudget.catGoal(categoryId),
            prevResult => {
              setGoalValues(prev => {
                const existing = prev[categoryId];
                // Only use fallback if current month doesn't have a goal yet
                if (existing === undefined || existing === 0) {
                  return {
                    ...prev,
                    [categoryId]: typeof prevResult.value === 'number' ? prevResult.value : 0,
                  };
                }
                return prev;
              });
            },
          ),
        );
      });

      // Finally subscribe to current month goal (will override if not null)
      unbinds.push(
        spreadsheet.bind(
          sheetName,
          envelopeBudget.catGoal(categoryId),
          result => {
            setGoalValues(prev => {
              const updated: Record<string, number> = { ...prev };
              // Use current month's goal if not null, otherwise keep fallback value (or 0)
              if (typeof result.value === 'number') {
                updated[categoryId] = result.value;
              } else if (result.value === null && prev[categoryId] === undefined) {
                // If null and no previous value, use 0
                updated[categoryId] = 0;
              }
              return updated;
            });
          },
        ),
      );
    });

    // Clean up goals for categories no longer visible
    setGoalValues(prev => {
      const updated: Record<string, number> = {};
      Object.entries(prev).forEach(([id, value]) => {
        if (visibleCategoryIds.includes(id)) {
          updated[id] = value;
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
