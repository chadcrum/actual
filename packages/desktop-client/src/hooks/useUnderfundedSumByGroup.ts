import { useEffect, useMemo, useState } from 'react';

import * as monthUtils from 'loot-core/shared/months';

import { useCategories } from './useCategories';
import { useLocalPref } from './useLocalPref';
import { useSpreadsheet } from './useSpreadsheet';

import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

type CategoryFundingData = {
  goal: number;
  budgeted: number;
  balance: number;
  longGoal: number;
};

/**
 * Calculates the total underfunded amount for all visible categories in a specific group.
 *
 * @param month The month string (e.g., "2024-01") to calculate for
 * @param groupId The group ID to filter categories by
 * @returns The total underfunded amount for all categories in the group
 */
export function useUnderfundedSumByGroup(
  month: string,
  groupId: string,
): number {
  const sheetName = monthUtils.sheetForMonth(month);

  const spreadsheet = useSpreadsheet();
  const categories = useCategories();
  const [showHiddenCategories] = useLocalPref('budget.showHiddenCategories');

  // Calculate visible expense category IDs for the specified group
  const visibleCategoryIds = useMemo(() => {
    return categories.grouped
      .filter(group => !group.is_income) // Only expense groups
      .filter(group => showHiddenCategories || !group.hidden) // Filter hidden groups
      .filter(group => group.id === groupId) // Filter by specific group ID
      .flatMap(group => group.categories || [])
      .filter(cat => showHiddenCategories || !cat.hidden) // Filter hidden categories
      .map(cat => cat.id);
  }, [categories.grouped, showHiddenCategories, groupId]);

  // Track funding data for each visible category in the group
  const [categoryData, setCategoryData] = useState<
    Record<string, CategoryFundingData>
  >({});

  // Subscribe to funding data for all visible categories in the group
  useEffect(() => {
    // If no sheet name or visible categories, skip subscriptions
    if (!sheetName || visibleCategoryIds.length === 0) {
      setCategoryData({});
      return;
    }

    const unbinds: (() => void)[] = [];

    // Subscribe to previous months as fallback for goals (up to 12 months back)
    // This ensures goals cascade forward through multiple months
    const fallbackMonths: string[] = [];
    let lookbackMonth = month;
    for (let i = 0; i < 12; i++) {
      lookbackMonth = monthUtils.prevMonth(lookbackMonth);
      fallbackMonths.push(monthUtils.sheetForMonth(lookbackMonth));
    }

    visibleCategoryIds.forEach(categoryId => {
      // Subscribe to goal with fallbacks
      fallbackMonths.forEach(fallbackSheetName => {
        unbinds.push(
          spreadsheet.bind(
            fallbackSheetName,
            envelopeBudget.catGoal(categoryId),
            prevResult => {
              setCategoryData(prev => {
                const existing = prev[categoryId]?.goal;
                // Only use fallback if current month doesn't have a goal yet
                if (existing === undefined || existing === 0) {
                  return {
                    ...prev,
                    [categoryId]: {
                      ...prev[categoryId],
                      goal:
                        typeof prevResult.value === 'number'
                          ? prevResult.value
                          : 0,
                    },
                  };
                }
                return prev;
              });
            },
          ),
        );
      });

      // Subscribe to current month goal (will override if not null)
      unbinds.push(
        spreadsheet.bind(
          sheetName,
          envelopeBudget.catGoal(categoryId),
          result => {
            setCategoryData(prev => {
              const updated: Record<string, CategoryFundingData> = { ...prev };
              const current = updated[categoryId] || {
                goal: 0,
                budgeted: 0,
                balance: 0,
                longGoal: 0,
              };
              // Use current month's goal if not null, otherwise keep fallback value (or 0)
              if (typeof result.value === 'number') {
                current.goal = result.value;
              } else if (result.value === null && current.goal === undefined) {
                // If null and no previous value, use 0
                current.goal = 0;
              }
              updated[categoryId] = current;
              return updated;
            });
          },
        ),
      );

      // Subscribe to budgeted (current month only)
      unbinds.push(
        spreadsheet.bind(
          sheetName,
          envelopeBudget.catBudgeted(categoryId),
          result => {
            setCategoryData(prev => {
              const updated: Record<string, CategoryFundingData> = { ...prev };
              const current = updated[categoryId] || {
                goal: 0,
                budgeted: 0,
                balance: 0,
                longGoal: 0,
              };
              current.budgeted =
                typeof result.value === 'number' ? result.value : 0;
              updated[categoryId] = current;
              return updated;
            });
          },
        ),
      );

      // Subscribe to balance (current month only)
      unbinds.push(
        spreadsheet.bind(
          sheetName,
          envelopeBudget.catBalance(categoryId),
          result => {
            setCategoryData(prev => {
              const updated: Record<string, CategoryFundingData> = { ...prev };
              const current = updated[categoryId] || {
                goal: 0,
                budgeted: 0,
                balance: 0,
                longGoal: 0,
              };
              current.balance =
                typeof result.value === 'number' ? result.value : 0;
              updated[categoryId] = current;
              return updated;
            });
          },
        ),
      );

      // Subscribe to longGoal (current month only)
      unbinds.push(
        spreadsheet.bind(
          sheetName,
          envelopeBudget.catLongGoal(categoryId),
          result => {
            setCategoryData(prev => {
              const updated: Record<string, CategoryFundingData> = { ...prev };
              const current = updated[categoryId] || {
                goal: 0,
                budgeted: 0,
                balance: 0,
                longGoal: 0,
              };
              current.longGoal =
                typeof result.value === 'number' ? result.value : 0;
              updated[categoryId] = current;
              return updated;
            });
          },
        ),
      );
    });

    // Clean up data for categories no longer visible
    setCategoryData(prev => {
      const updated: Record<string, CategoryFundingData> = {};
      Object.entries(prev).forEach(([id, data]) => {
        if (visibleCategoryIds.includes(id)) {
          updated[id] = data;
        }
      });
      return updated;
    });

    return () => unbinds.forEach(unbind => unbind());
  }, [visibleCategoryIds, sheetName, spreadsheet, month]);

  // Calculate total underfunded sum for the group
  return useMemo(() => {
    return Object.values(categoryData).reduce((sum, data) => {
      const { goal, budgeted, balance, longGoal } = data;

      // If goal is 0, return 0 (no goal = not underfunded)
      if (goal === 0) {
        return sum;
      }

      // Calculate difference based on goal type
      const difference =
        longGoal === 1
          ? balance - goal // Long-term goals: compare balance
          : budgeted - goal; // Template goals: compare budgeted

      // If difference < 0: add absolute value of shortfall
      // Otherwise: add 0
      return sum + (difference < 0 ? Math.abs(difference) : 0);
    }, 0);
  }, [categoryData]);
}
