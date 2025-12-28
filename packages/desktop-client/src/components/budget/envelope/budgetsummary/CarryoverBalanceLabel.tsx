import React from 'react';
import { Trans } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';

export function CarryoverBalanceLabel() {
  return (
    <Block style={{ color: theme.tableText }}>
      <Trans>Carry Over</Trans>
    </Block>
  );
}
