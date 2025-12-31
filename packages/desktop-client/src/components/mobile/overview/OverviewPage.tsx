import React from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';

import { BudgetSummaryTable } from './BudgetSummaryTable';

import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { MOBILE_NAV_HEIGHT } from '@desktop-client/components/mobile/MobileNavTabs';
import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';

export function OverviewPage() {
  const { t } = useTranslation();
  const currentMonth = monthUtils.currentMonth();

  return (
    <Page
      header={<MobilePageHeader title={t('Overview')} />}
      padding={0}
      style={{
        paddingBottom: MOBILE_NAV_HEIGHT,
      }}
    >
      <SheetNameProvider name={monthUtils.sheetForMonth(currentMonth)}>
        <View
          style={{
            padding: 15,
            backgroundColor: theme.mobileViewTheme,
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
