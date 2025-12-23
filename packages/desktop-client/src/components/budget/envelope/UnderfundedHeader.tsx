import React, { memo } from 'react';
import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useFormat } from '@desktop-client/hooks/useFormat';
import { useUnderfundedSum } from '@desktop-client/hooks/useUnderfundedSum';

/**
 * Props for the UnderfundedHeader component.
 */
type UnderfundedHeaderProps = {
  /** The month string (e.g., "2024-01") to calculate total underfunded amount for */
  month: string;
};

/**
 * UnderfundedHeader - Header component for the Underfunded column in budget totals.
 *
 * Displays the "Underfunded" label and the total sum of all underfunded amounts
 * for visible expense categories in the current month.
 *
 * @param props - Component props
 * @returns Underfunded header component with label and total
 */

const headerLabelStyle = {
  flex: 1,
  padding: '0 5px',
  textAlign: 'right' as const,
};

const cellStyle = {
  color: theme.tableHeaderText,
  fontWeight: 600,
};

export const UnderfundedHeader = memo(function UnderfundedHeader({
  month,
}: UnderfundedHeaderProps) {
  const format = useFormat();
  const sum = useUnderfundedSum(month);

  return (
    <View style={headerLabelStyle}>
      <Text style={{ color: theme.tableHeaderText }}>
        <Trans>Underfunded</Trans>
      </Text>
      <Text style={cellStyle}>{format(sum, 'financial')}</Text>
    </View>
  );
});
