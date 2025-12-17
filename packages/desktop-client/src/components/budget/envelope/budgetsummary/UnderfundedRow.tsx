import React from 'react';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';

import { useFormat } from '@desktop-client/hooks/useFormat';
import { useGoalFundingStatus } from '@desktop-client/hooks/useGoalFundingStatus';

type UnderfundedRowProps = {
  month: string;
};

export function UnderfundedRow({ month }: UnderfundedRowProps) {
  const format = useFormat();
  const { underfunded } = useGoalFundingStatus(month);

  return (
    <Block
      style={{
        fontWeight: 600,
        color: underfunded > 0 ? theme.warningText : undefined,
      }}
    >
      {format(underfunded, 'financial')}
    </Block>
  );
}
