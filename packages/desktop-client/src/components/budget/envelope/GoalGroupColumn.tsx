import React, { memo } from 'react';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';

import { makeAmountGrey } from '@desktop-client/components/budget/util';
import { Field } from '@desktop-client/components/table';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useGoalTargetSumByGroup } from '@desktop-client/hooks/useGoalTargetSumByGroup';

/**
 * Props for the GoalGroupColumn component.
 */
type GoalGroupColumnProps = {
  /** The group ID to calculate goal sum for */
  groupId: string;
  /** The month string to calculate goals for */
  month: string;
};

/**
 * GoalGroupColumn - Displays the total goal amount for all categories in a budget group.
 *
 * Shows the sum of goal targets for all visible expense categories within the specified group.
 * Styled to match other budget group fields with right alignment and grey styling for zero values.
 *
 * @param props - Component props
 * @returns Goal sum field component for group rows
 */
export const GoalGroupColumn = memo(function GoalGroupColumn({
  groupId,
  month,
}: GoalGroupColumnProps) {
  const format = useFormat();
  const goalTargetSum = useGoalTargetSumByGroup(month, groupId);

  return (
    <Field name="goal" width="flex" style={{ textAlign: 'right' }}>
      <Text
        style={{
          fontWeight: 600,
          ...styles.tnum,
          ...makeAmountGrey(goalTargetSum),
        }}
      >
        {format(goalTargetSum, 'financial')}
      </Text>
    </Field>
  );
});
