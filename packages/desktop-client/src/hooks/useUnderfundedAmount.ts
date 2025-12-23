import { useEffect, useMemo, useState } from 'react';

import * as monthUtils from 'loot-core/shared/months';

import { useSpreadsheet } from './useSpreadsheet';

import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

type CategoryFundingData = {
  goal: number;
  budgeted: number;
  longGoal: number;
};

/**
 * Calculates the underfunded amount for a single category.
 *
 * @param categoryId The category ID to calculate underfunded amount for
 * @param month The month string (e.g., "2024-01") to calculate for
 * @returns The underfunded amount (0 if funded or overfunded)
 */
export function useUnderfundedAmount(
  categoryId: string,
  month: string,
): number {
  const sheetName = monthUtils.sheetForMonth(month);
  const spreadsheet = useSpreadsheet();

  // Track funding data for the category
  const [categoryData, setCategoryData] = useState<CategoryFundingData>({
    goal: 0,
    budgeted: 0,
    longGoal: 0,
  });

  // Subscribe to all required values for the category
  useEffect(() => {
    if (!sheetName || !categoryId) {
      setCategoryData({
        goal: 0,
        budgeted: 0,
        longGoal: 0,
      });
      return;
    }

    const unbinds: (() => void)[] = [];

    // Pre-initialize the sheet by binding to a known cell that exists in every envelope budget sheet.
    // This ensures the sheet is populated with default values before we subscribe to category-specific bindings.
    unbinds.push(
      spreadsheet.bind(sheetName, envelopeBudget.toBudget, () => {
        // Dummy callback - we just need the binding to trigger sheet initialization
      }),
    );

    // Subscribe to goal
    unbinds.push(
      spreadsheet.bind(
        sheetName,
        envelopeBudget.catGoal(categoryId),
        result => {
          setCategoryData(prev => ({
            ...prev,
            goal: typeof result.value === 'number' ? result.value : 0,
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
            budgeted: typeof result.value === 'number' ? result.value : 0,
          }));
        },
      ),
    );

    // Subscribe to longGoal
    unbinds.push(
      spreadsheet.bind(
        sheetName,
        envelopeBudget.catLongGoal(categoryId),
        result => {
          setCategoryData(prev => ({
            ...prev,
            longGoal: typeof result.value === 'number' ? result.value : 0,
          }));
        },
      ),
    );

    return () => unbinds.forEach(unbind => unbind());
  }, [categoryId, sheetName, spreadsheet]);

  // Calculate underfunded amount
  return useMemo(() => {
    const { goal, budgeted } = categoryData;

    // If goal is 0, return 0 (no goal = not underfunded)
    if (goal === 0) {
      return 0;
    }

    // Calculate difference: budgeted vs goal (same for all goal types)
    const difference = budgeted - goal;

    // If difference < 0: return absolute value of shortfall
    // Otherwise: return 0
    return difference < 0 ? Math.abs(difference) : 0;
  }, [categoryData]);
}
