import React from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

export function TooltipSeparator() {
  return (
    <View
      style={{
        borderTop: '1px solid ' + theme.tableBorder,
        marginTop: 4,
        marginBottom: 4,
      }}
    />
  );
}
