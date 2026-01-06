import { useEffect, useMemo, useState } from 'react';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { envelopeBudget, trackingBudget } from '@desktop-client/spreadsheet/bindings';
import * as monthUtils from 'loot-core/shared/months';

export function useCategoryBudgetedValues(categoryIds: string[]) {
  const spreadsheet = useSpreadsheet();
  const [budgetTypePref] = useSyncedPref('budgetType');
  const budgetType = budgetTypePref === 'tracking' ? 'tracking' : 'envelope';

  const currentMonth = monthUtils.currentMonth();
  const sheetName = monthUtils.sheetForMonth(currentMonth);

  const [budgetedValues, setBudgetedValues] = useState<Record<string, number>>({});

  // Memoize the category budgeted bindings to avoid unnecessary effect re-runs
  const categoryBudgetedBindings = useMemo(
    () =>
      categoryIds.map(categoryId => [
        categoryId,
        budgetType === 'tracking'
          ? trackingBudget.catBudgeted(categoryId)
          : envelopeBudget.catBudgeted(categoryId),
      ]),
    [budgetType, categoryIds],
  );

  useEffect(() => {
    const unbindList: (() => void)[] = [];

    for (const [categoryId, budgetedBinding] of categoryBudgetedBindings) {
      const unbind = spreadsheet.bind(sheetName, budgetedBinding, result => {
        const value = typeof result.value === 'number' ? result.value : 0;
        setBudgetedValues(prev => ({
          ...prev,
          [categoryId]: value,
        }));
      });
      unbindList.push(unbind);
    }

    return () => {
      unbindList.forEach(unbind => unbind());
    };
  }, [categoryBudgetedBindings, sheetName, spreadsheet]);

  return budgetedValues;
}
