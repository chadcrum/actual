import React from 'react';

import { theme } from '@actual-app/components/theme';

import { EnvelopeCellValue } from '@desktop-client/components/budget/envelope/EnvelopeBudgetComponents';
import { CellValueText } from '@desktop-client/components/spreadsheet/CellValue';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

type TotalSpentRowProps = {
  month: string;
};

export function TotalSpentRow({ month: _month }: TotalSpentRowProps) {
  return (
    <EnvelopeCellValue binding={envelopeBudget.totalSpent} type="financial">
      {props => (
        <CellValueText
          {...props}
          style={{ fontWeight: 600, color: theme.tableText }}
        />
      )}
    </EnvelopeCellValue>
  );
}
