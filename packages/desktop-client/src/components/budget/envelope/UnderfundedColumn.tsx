import React, { memo } from 'react';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';

import { makeAmountGrey } from '@desktop-client/components/budget/util';
import { Field } from '@desktop-client/components/table';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useUnderfundedAmount } from '@desktop-client/hooks/useUnderfundedAmount';

/**
 * Props for the UnderfundedColumn component.
 */
type UnderfundedColumnProps = {
  /** The category ID to display underfunded amount for */
  categoryId: string;
  /** The month string (e.g., "2024-01") to calculate for */
  month: string;
};

/**
 * UnderfundedColumn - Displays the underfunded amount for a budget category.
 *
 * Shows the underfunded amount for a specific category in the budget table.
 * Uses grey styling for zero values to match the design pattern.
 *
 * @param props - Component props
 * @returns Underfunded column field component
 */
export const UnderfundedColumn = memo(function UnderfundedColumn({
  categoryId,
  month,
}: UnderfundedColumnProps) {
  const underfundedAmount = useUnderfundedAmount(categoryId, month);
  const format = useFormat();

  return (
    <Field name="underfunded" width="flex" style={{ textAlign: 'right' }}>
      <Text
        style={{
          ...styles.tnum,
          ...makeAmountGrey(underfundedAmount),
        }}
      >
        {format(underfundedAmount, 'financial')}
      </Text>
    </Field>
  );
});
