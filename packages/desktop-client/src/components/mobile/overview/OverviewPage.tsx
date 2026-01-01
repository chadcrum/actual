import React from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';

import { BudgetSummaryTable } from './BudgetSummaryTable';

import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';

export function OverviewPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const currentMonth = monthUtils.currentMonth();
  const monthName = monthUtils.format(currentMonth, "MMMM ''yy", locale);

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
          {/* Future widgets will be added here */}
        </View>
      </SheetNameProvider>
    </Page>
  );
}
