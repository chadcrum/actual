import React from 'react';

import { theme } from '@actual-app/components/theme';

import { EnvelopeCellValue } from '@desktop-client/components/budget/envelope/EnvelopeBudgetComponents';
import { CellValueText } from '@desktop-client/components/spreadsheet/CellValue';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

type TotalIncomeRowProps = {
  month: string;
};

export function TotalIncomeRow({ month: _month }: TotalIncomeRowProps) {
  return (
    <EnvelopeCellValue binding={envelopeBudget.totalIncome} type="financial">
      {props => (
        <CellValueText
          {...props}
          style={{ fontWeight: 600, color: theme.tableText }}
        />
      )}
    </EnvelopeCellValue>
  );
}
