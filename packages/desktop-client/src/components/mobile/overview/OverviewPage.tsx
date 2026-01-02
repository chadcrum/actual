import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';

import { BudgetSummaryTable } from './BudgetSummaryTable';
import { PinnedCategoriesTable } from './PinnedCategoriesTable';

import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

export function OverviewPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const dispatch = useDispatch();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const currentMonth = monthUtils.currentMonth();
  const monthName = monthUtils.format(currentMonth, "MMMM ''yy", locale);

  const handlePinnedCategoryClick = useCallback(
    (categoryId: string) => {
      if (budgetType === 'envelope') {
        dispatch(
          pushModal({
            modal: {
              name: 'envelope-balance-menu',
              options: {
                month: currentMonth,
                categoryId,
              },
            },
          }),
        );
      } else if (budgetType === 'tracking') {
        dispatch(
          pushModal({
            modal: {
              name: 'tracking-balance-menu',
              options: {
                month: currentMonth,
                categoryId,
                onCarryover: (_carryover: boolean) => {
                  // Handle carryover callback if needed
                },
              },
            },
          }),
        );
      }
    },
    [budgetType, currentMonth, dispatch],
  );

  return (
    <Page
      header={
        <MobilePageHeader title={t('{{monthName}} Overview', { monthName })} />
      }
      padding={0}
    >
      <SheetNameProvider name={monthUtils.sheetForMonth(currentMonth)}>
        <View
          style={{
            padding: 15,
            backgroundColor: theme.mobilePageBackground,
            minHeight: '100%',
          }}
        >
          <BudgetSummaryTable />
          <PinnedCategoriesTable onCategoryClick={handlePinnedCategoryClick} />
        </View>
      </SheetNameProvider>
    </Page>
  );
}
