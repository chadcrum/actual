import React, { type ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Menu } from '@actual-app/components/menu';

import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';

type BudgetMonthMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  onCopyLastMonthBudget: () => void;
  onSetBudgetsToZero: () => void;
  onSetMonthsAverage: (numberOfMonths: number) => void;
  onCheckTemplates: () => void;
  onApplyBudgetTemplates: () => void;
  onOverwriteWithBudgetTemplates: () => void;
  onEndOfMonthCleanup: () => void;
  onResetBudgetTemplates: () => void;
  budgetDetailedViewEnabled?: boolean;
  onToggleBudgetDetailedView?: () => void;
};
export function BudgetMonthMenu({
  onCopyLastMonthBudget,
  onSetBudgetsToZero,
  onSetMonthsAverage,
  onCheckTemplates,
  onApplyBudgetTemplates,
  onOverwriteWithBudgetTemplates,
  onEndOfMonthCleanup,
  onResetBudgetTemplates,
  budgetDetailedViewEnabled,
  onToggleBudgetDetailedView,
  ...props
}: BudgetMonthMenuProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const isResetTemplatesEnabled = useFeatureFlag('resetBudgetTemplates');
  const isBudgetDetailedViewEnabled = useFeatureFlag('budget-detailed-view');
  return (
    <Menu
      {...props}
      onMenuSelect={name => {
        switch (name) {
          case 'copy-last':
            onCopyLastMonthBudget();
            break;
          case 'set-zero':
            onSetBudgetsToZero();
            break;
          case 'set-3-avg':
            onSetMonthsAverage(3);
            break;
          case 'set-6-avg':
            onSetMonthsAverage(6);
            break;
          case 'set-12-avg':
            onSetMonthsAverage(12);
            break;
          case 'check-templates':
            onCheckTemplates();
            break;
          case 'apply-goal-template':
            onApplyBudgetTemplates();
            break;
          case 'overwrite-goal-template':
            onOverwriteWithBudgetTemplates();
            break;
          case 'cleanup-goal-template':
            onEndOfMonthCleanup();
            break;
          case 'reset-templates-for-month':
            onResetBudgetTemplates();
            break;
          case 'toggle-detailed-view':
            onToggleBudgetDetailedView?.();
            break;
        }
      }}
      items={[
        { name: 'copy-last', text: t('Copy last month’s budget') },
        { name: 'set-zero', text: t('Set budgets to zero') },
        {
          name: 'set-3-avg',
          text: t('Set budgets to 3 month average'),
        },
        {
          name: 'set-6-avg',
          text: t('Set budgets to 6 month average'),
        },
        {
          name: 'set-12-avg',
          text: t('Set budgets to 12 month average'),
        },
        ...(isGoalTemplatesEnabled
          ? [
              {
                name: 'check-templates',
                text: t('Check templates'),
              },
              {
                name: 'apply-goal-template',
                text: t('Apply budget template'),
              },
              {
                name: 'overwrite-goal-template',
                text: t('Overwrite with budget template'),
              },
              {
                name: 'cleanup-goal-template',
                text: t('End of month cleanup'),
              },
              ...(isResetTemplatesEnabled
                ? [
                    {
                      name: 'reset-templates-for-month',
                      text: t('Reset budget template'),
                    },
                  ]
                : []), // NEW: Nested flag check
            ]
          : []),
        ...(isBudgetDetailedViewEnabled && !isNarrowWidth
          ? [
              {
                name: 'toggle-detailed-view',
                text: t('Detailed view'),
                toggle: budgetDetailedViewEnabled,
              },
            ]
          : []),
      ]}
    />
  );
}
