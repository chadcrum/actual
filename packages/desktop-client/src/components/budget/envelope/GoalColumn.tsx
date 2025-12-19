import React, { memo } from 'react';

import { styles } from '@actual-app/components/styles';

import { EnvelopeCellValue } from './EnvelopeBudgetComponents';

import { makeAmountGrey } from '@desktop-client/components/budget/util';
import { CellValueText } from '@desktop-client/components/spreadsheet/CellValue';
import { Field } from '@desktop-client/components/table';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

/**
 * Props for the GoalColumn component.
 */
type GoalColumnProps = {
  /** The category ID to display goal data for */
  categoryId: string;
};

/**
 * GoalColumn - Displays the goal amount for a budget category.
 *
 * Shows the goal target value for a specific category in the budget table.
 * Uses grey styling for zero/null values to match the design pattern.
 *
 * @param props - Component props
 * @returns Goal column field component
 */
export const GoalColumn = memo(function GoalColumn({
  categoryId,
}: GoalColumnProps) {
  return (
    <Field name="goal" width="flex" style={{ textAlign: 'right' }}>
      <EnvelopeCellValue
        binding={envelopeBudget.catGoal(categoryId)}
        type="financial"
      >
        {props => (
          <CellValueText
            {...props}
            style={{ ...styles.tnum, ...makeAmountGrey(props.value) }}
          />
        )}
      </EnvelopeCellValue>
    </Field>
  );
});
