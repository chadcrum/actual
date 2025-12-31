import React from 'react';
import { useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useFormat } from '@desktop-client/hooks/useFormat';
import { useBudgetSummary } from '@desktop-client/hooks/useBudgetSummary';

type SummaryRowProps = {
  label: string;
  value: number;
};

function SummaryRow({ label, value }: SummaryRowProps) {
  const format = useFormat();

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: '10px 15px',
        borderBottom: `1px solid ${theme.tableBorder}`,
      }}
    >
      <Text style={{ fontSize: 15 }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: 500 }}>
        {format(value, 'financial')}
      </Text>
    </View>
  );
}

export function BudgetSummaryTable() {
  const { t } = useTranslation();
  const summary = useBudgetSummary();

  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: 600,
          padding: '10px 15px',
          color: theme.pageTextSubdued,
        }}
      >
        {t('Budget Summary')}
      </Text>
      <View
        style={{
          backgroundColor: theme.tableBackground,
          border: `1px solid ${theme.tableBorder}`,
          borderRadius: 4,
        }}
      >
        <SummaryRow label={t('Spent')} value={summary.spent} />
        <SummaryRow label={t('Budgeted')} value={summary.budgeted} />
        <SummaryRow label={t('Goal Target')} value={summary.goalTarget} />
        <SummaryRow label={t('Underfunded')} value={summary.underfunded} />
        <SummaryRow label={t('Overfunded')} value={summary.overfunded} />
      </View>
    </View>
  );
}
