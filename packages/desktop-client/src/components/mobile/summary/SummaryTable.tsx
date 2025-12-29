import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { type UseFormatResult } from '@desktop-client/hooks/useFormat';

type SummaryTableProps = {
  data: {
    budgeted: number;
    spent: number;
    goalTarget: number;
    underfunded: number;
  };
  format: UseFormatResult;
};

export function SummaryTable({ data, format }: SummaryTableProps) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        padding: 16,
        backgroundColor: theme.mobilePageBackground,
      }}
    >
      <View
        style={{
          paddingLeft: 96,
          paddingRight: 96,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 16,
            color: theme.pageText,
          }}
        >
          <Trans>Budget Summary</Trans>
        </Text>
        <SummaryRow
          label={t('Budgeted')}
          value={Math.abs(data.budgeted)}
          format={format}
        />
        <SummaryRow label={t('Spent')} value={data.spent} format={format} />
        <SummaryRow
          label={t('Goal Target')}
          value={data.goalTarget}
          format={format}
        />
        <SummaryRow
          label={t('Underfunded')}
          value={data.underfunded}
          format={format}
          isWarning={data.underfunded > 0}
        />
      </View>
    </View>
  );
}

type SummaryRowProps = {
  label: string;
  value: number;
  format: UseFormatResult;
  isWarning?: boolean;
};

function SummaryRow({ label, value, format, isWarning }: SummaryRowProps) {
  return (
    <View
      style={{
        paddingTop: 6,
        paddingBottom: 6,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: theme.tableBorder,
          paddingBottom: 0,
        }}
      >
        <Block style={{ fontSize: 16, fontWeight: 500 }}>{label}</Block>
        <PrivacyFilter>
          <Block
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: isWarning ? theme.warningText : undefined,
            }}
          >
            {format(value, 'financial')}
          </Block>
        </PrivacyFilter>
      </View>
    </View>
  );
}
