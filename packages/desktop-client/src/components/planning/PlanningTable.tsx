import React from 'react';
import { View } from '@actual-app/components/view';
import { theme } from '@actual-app/components/theme';

export function PlanningTable() {
  return (
    <View
      style={{
        border: `1px solid ${theme.tableBorder}`,
        borderRadius: 4,
        backgroundColor: theme.tableBackground,
        padding: 20,
      }}
    >
      <p style={{ color: theme.pageText }}>Planning table will go here</p>
    </View>
  );
}
