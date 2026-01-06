import React from 'react';
import { View } from '@actual-app/components/view';
import { theme } from '@actual-app/components/theme';

import { PlanningTable } from './PlanningTable';

export function Planning() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.pageBackground,
        padding: 20,
        overflow: 'auto',
      }}
    >
      <View style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, color: theme.pageText }}>
          Budget Planning
        </h1>
        <p style={{ margin: '8px 0 0 0', color: theme.pageTextSubdued }}>
          Review goal targets and toggle categories to see budget impact
        </p>
      </View>
      <PlanningTable />
    </View>
  );
}
