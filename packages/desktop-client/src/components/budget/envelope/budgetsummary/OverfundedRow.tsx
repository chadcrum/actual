import React from 'react';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';

import { useFormat } from '@desktop-client/hooks/useFormat';
import { useGoalFundingStatus } from '@desktop-client/hooks/useGoalFundingStatus';

type OverfundedRowProps = {
  month: string;
};

export function OverfundedRow({ month }: OverfundedRowProps) {
  const format = useFormat();
  const { overfunded } = useGoalFundingStatus(month);

  return (
    <Block
      style={{
        fontWeight: 600,
        color: overfunded > 0 ? theme.errorText : undefined,
      }}
    >
      {format(overfunded, 'financial')}
    </Block>
  );
}
