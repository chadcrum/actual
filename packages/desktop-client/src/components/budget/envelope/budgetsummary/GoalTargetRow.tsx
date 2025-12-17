import React from 'react';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useFormat } from '@desktop-client/hooks/useFormat';
import { useGoalTargetSum } from '@desktop-client/hooks/useGoalTargetSum';

type GoalTargetRowProps = {
  month: string;
};

export function GoalTargetRow({ month }: GoalTargetRowProps) {
  const format = useFormat();
  const goalTargetSum = useGoalTargetSum(month);

  return (
    <>
      <Block style={{ fontWeight: 600 }}>
        {format(goalTargetSum, 'financial')}
      </Block>
      <View
        style={{
          borderTop: '1px solid ' + theme.tableBorder,
          marginTop: 4,
          marginBottom: 4,
        }}
      />
    </>
  );
}
