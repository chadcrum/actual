import React from 'react';
import { Trans } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

export function GoalTargetLabel() {
  return (
    <>
      <Block>
        <Trans>Goal Target</Trans>
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
