import React, { memo } from 'react';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';

import { makeAmountGrey } from '@desktop-client/components/budget/util';
import { Field } from '@desktop-client/components/table';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useUnderfundedSumByGroup } from '@desktop-client/hooks/useUnderfundedSumByGroup';

/**
 * Props for the UnderfundedGroupColumn component.
 */
type UnderfundedGroupColumnProps = {
  /** The group ID to calculate underfunded sum for */
  groupId: string;
  /** The month string to calculate underfunded amounts for */
  month: string;
};

/**
 * UnderfundedGroupColumn - Displays the total underfunded amount for all categories in a budget group.
 *
 * Shows the sum of underfunded amounts for all visible expense categories within the specified group.
 * Styled to match other budget group fields with right alignment and grey styling for zero values.
 *
 * @param props - Component props
 * @returns Underfunded sum field component for group rows
 */
export const UnderfundedGroupColumn = memo(function UnderfundedGroupColumn({
  groupId,
  month,
}: UnderfundedGroupColumnProps) {
  const format = useFormat();
  const sum = useUnderfundedSumByGroup(month, groupId);

  return (
    <Field name="underfunded" width="flex" style={{ textAlign: 'right' }}>
      <Text
        style={{
          fontWeight: 600,
          ...styles.tnum,
          ...makeAmountGrey(sum),
        }}
      >
        {format(sum, 'financial')}
      </Text>
    </Field>
  );
});
