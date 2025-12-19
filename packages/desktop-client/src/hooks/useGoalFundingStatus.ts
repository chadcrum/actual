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

type FundingStatus = {
  underfunded: number;
  overfunded: number;
};

/**
 * Calculates underfunded and overfunded sums for visible expense categories.
 *
 * @param month The month string (e.g., "2024-01") to calculate funding status for
 * @returns Object with underfunded and overfunded sums
 */
export function useGoalFundingStatus(month: string): FundingStatus {
  const sheetName = monthUtils.sheetForMonth(month);
  const spreadsheet = useSpreadsheet();
  const categories = useCategories();
  const [showHiddenCategories] = useLocalPref('budget.showHiddenCategories');

  // Calculate visible expense category IDs (same as useGoalTargetSum)
  const visibleCategoryIds = useMemo(() => {
    return categories.grouped
      .filter(group => !group.is_income) // Only expense groups
      .filter(group => showHiddenCategories || !group.hidden) // Filter hidden groups
      .flatMap(group => group.categories || [])
      .filter(cat => showHiddenCategories || !cat.hidden) // Filter hidden categories
      .map(cat => cat.id);
  }, [categories.grouped, showHiddenCategories]);

  // Track funding data for each visible category
  const [categoryData, setCategoryData] = useState<
    Record<string, CategoryFundingData>
  >({});

  // Subscribe to all required values for all visible categories
  useEffect(() => {
    if (!sheetName || visibleCategoryIds.length === 0) {
      setCategoryData({});
      return;
    }

    const unbinds: (() => void)[] = [];

    // Pre-initialize the sheet by binding to a known cell that exists in every envelope budget sheet.
    // This ensures the sheet is populated with default values before we subscribe to category-specific bindings.
    // Without this, future months return undefined for month-specific data (budgeted, balance).
    unbinds.push(
      spreadsheet.bind(sheetName, envelopeBudget.toBudget, () => {
        // Dummy callback - we just need the binding to trigger sheet initialization
      }),
    );

    // Subscribe to previous months as fallback (up to 12 months back)
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
                      budgeted: prev[categoryId]?.budgeted ?? 0,
                      balance: prev[categoryId]?.balance ?? 0,
                      longGoal: prev[categoryId]?.longGoal ?? 0,
                    },
                  };
                }
                return prev;
              });
            },
          ),
        );
      });

      // Subscribe to goal in current month
      unbinds.push(
        spreadsheet.bind(
          sheetName,
          envelopeBudget.catGoal(categoryId),
          result => {
            setCategoryData(prev => ({
              ...prev,
              [categoryId]: {
                ...prev[categoryId],
                goal:
                  typeof result.value === 'number'
                    ? result.value
                    : (prev[categoryId]?.goal ?? 0),
                budgeted: prev[categoryId]?.budgeted ?? 0,
                balance: prev[categoryId]?.balance ?? 0,
                longGoal: prev[categoryId]?.longGoal ?? 0,
              },
            }));
          },
        ),
      );

      // Subscribe to budgeted
      unbinds.push(
        spreadsheet.bind(
          sheetName,
          envelopeBudget.catBudgeted(categoryId),
          result => {
            setCategoryData(prev => ({
              ...prev,
              [categoryId]: {
                goal: prev[categoryId]?.goal ?? 0,
                budgeted: typeof result.value === 'number' ? result.value : 0,
                balance: prev[categoryId]?.balance ?? 0,
                longGoal: prev[categoryId]?.longGoal ?? 0,
              },
            }));
          },
        ),
      );

      // Subscribe to balance
      unbinds.push(
        spreadsheet.bind(
          sheetName,
          envelopeBudget.catBalance(categoryId),
          result => {
            setCategoryData(prev => ({
              ...prev,
              [categoryId]: {
                goal: prev[categoryId]?.goal ?? 0,
                budgeted: prev[categoryId]?.budgeted ?? 0,
                balance: typeof result.value === 'number' ? result.value : 0,
                longGoal: prev[categoryId]?.longGoal ?? 0,
              },
            }));
          },
        ),
      );

      // Subscribe to multiple previous months as fallback for longGoal
      fallbackMonths.forEach(fallbackSheetName => {
        unbinds.push(
          spreadsheet.bind(
            fallbackSheetName,
            envelopeBudget.catLongGoal(categoryId),
            prevResult => {
              setCategoryData(prev => {
                const existing = prev[categoryId]?.longGoal;
                if (existing === undefined || existing === 0) {
                  return {
                    ...prev,
                    [categoryId]: {
                      goal: prev[categoryId]?.goal ?? 0,
                      budgeted: prev[categoryId]?.budgeted ?? 0,
                      balance: prev[categoryId]?.balance ?? 0,
                      longGoal:
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

      // Subscribe to longGoal in current month
      unbinds.push(
        spreadsheet.bind(
          sheetName,
          envelopeBudget.catLongGoal(categoryId),
          result => {
            setCategoryData(prev => ({
              ...prev,
              [categoryId]: {
                goal: prev[categoryId]?.goal ?? 0,
                budgeted: prev[categoryId]?.budgeted ?? 0,
                balance: prev[categoryId]?.balance ?? 0,
                longGoal:
                  typeof result.value === 'number'
                    ? result.value
                    : (prev[categoryId]?.longGoal ?? 0),
              },
            }));
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
  }, [visibleCategoryIds, sheetName, spreadsheet]);

  // Calculate underfunded and overfunded sums
  return useMemo(() => {
    let underfunded = 0;
    let overfunded = 0;

    Object.values(categoryData).forEach(data => {
      // Only process categories with goals set
      if (data.goal > 0) {
        // Calculate difference based on goal type (same logic as BalanceWithCarryover)
        const difference =
          data.longGoal === 1
            ? data.balance - data.goal // Long-term goals: compare balance
            : data.budgeted - data.goal; // Template goals: compare budgeted

        if (difference < 0) {
          // Underfunded: add absolute value of shortfall
          underfunded += Math.abs(difference);
        } else if (difference > 0) {
          // Overfunded: add excess amount
          overfunded += difference;
        }
        // difference === 0 is "fully funded" - not tracked separately
      }
    });

    return { underfunded, overfunded };
  }, [categoryData]);
}
