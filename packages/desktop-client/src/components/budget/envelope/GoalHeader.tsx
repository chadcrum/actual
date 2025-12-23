import React, { memo } from 'react';
import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useFormat } from '@desktop-client/hooks/useFormat';
import { useGoalTargetSum } from '@desktop-client/hooks/useGoalTargetSum';

/**
 * Props for the GoalHeader component.
 */
type GoalHeaderProps = {
  /** The month string (e.g., "2024-01") to calculate total goals for */
  month: string;
};

/**
 * GoalHeader - Header component for the Goal column in budget totals.
 *
 * Displays the "Goal" label and the total sum of all goal targets
 * for visible expense categories in the current month.
 *
 * @param props - Component props
 * @returns Goal header component with label and total
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

export const GoalHeader = memo(function GoalHeader({ month }: GoalHeaderProps) {
  const format = useFormat();
  const goalTargetSum = useGoalTargetSum(month);

  return (
    <View style={headerLabelStyle}>
      <Text style={{ color: theme.tableHeaderText }}>
        <Trans>Goal</Trans>
      </Text>
      <Text style={cellStyle}>{format(goalTargetSum, 'financial')}</Text>
    </View>
  );
});
