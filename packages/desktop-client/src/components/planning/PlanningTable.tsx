import React, { useMemo } from 'react';
import { View } from '@actual-app/components/view';
import { theme } from '@actual-app/components/theme';
import { styles } from '@actual-app/components/styles';

import { usePlanningData } from './usePlanningData';
import { useCheckboxState } from './useCheckboxState';
import { useSummaryCalculations } from './useSummaryCalculations';
import { useFormat } from '@desktop-client/hooks/useFormat';

export function PlanningTable() {
  const { groups } = usePlanningData();
  const format = useFormat();

  // Get all category IDs for checkbox management
  const allCategoryIds = useMemo(() => {
    return groups.flatMap(g => g.categories.map(c => c.id));
  }, [groups]);

  const {
    toggleCategory,
    toggleGroup,
    toggleAll,
    isSelected,
    getGroupCheckboxState,
    selectedCategories,
  } = useCheckboxState(allCategoryIds);

  // Get all categories flattened for summary
  const allCategories = useMemo(() => {
    return groups.flatMap(g => g.categories);
  }, [groups]);

  const totalSummary = useSummaryCalculations(allCategories, selectedCategories);

  return (
    <View
      style={{
        border: `1px solid ${theme.tableBorder}`,
        borderRadius: 4,
        backgroundColor: theme.tableBackground,
        overflow: 'hidden',
      }}
    >
      {/* Header Row */}
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: theme.tableHeaderBackground,
          borderBottom: `1px solid ${theme.tableBorder}`,
          fontWeight: 600,
          fontSize: 13,
          color: theme.tableHeaderText,
        }}
      >
        <View style={{ width: 40, flexShrink: 0 }}>
          <input
            type="checkbox"
            checked={getGroupCheckboxState(allCategoryIds) === 'checked'}
            ref={input => {
              if (input) {
                input.indeterminate = getGroupCheckboxState(allCategoryIds) === 'indeterminate';
              }
            }}
            onChange={() => toggleAll(allCategoryIds)}
            style={{ cursor: 'pointer' }}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>Category</View>
        <View style={{ width: 120, textAlign: 'right' }}>Overfunded</View>
        <View style={{ width: 120, textAlign: 'right' }}>Underfunded</View>
        <View style={{ width: 120, textAlign: 'right' }}>Goal Target</View>
      </View>

      {/* Summary Row */}
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: theme.tableRowHeaderBackground,
          borderBottom: `2px solid ${theme.tableBorder}`,
          fontWeight: 600,
          fontSize: 14,
          color: theme.tableText,
        }}
      >
        <View style={{ width: 40, flexShrink: 0 }} />
        <View style={{ flex: 1, minWidth: 0 }}>Total</View>
        <View style={{ width: 120, textAlign: 'right', color: theme.noticeText }}>
          {format(totalSummary.overfunded, 'financial')}
        </View>
        <View style={{ width: 120, textAlign: 'right', color: theme.errorText }}>
          {format(totalSummary.underfunded, 'financial')}
        </View>
        <View style={{ width: 120, textAlign: 'right' }}>
          {format(totalSummary.goalTarget, 'financial')}
        </View>
      </View>

      {/* Groups and Categories will go here in next step */}
      <View style={{ padding: 20, color: theme.pageTextSubdued, textAlign: 'center' }}>
        Groups and categories will be rendered here
      </View>
    </View>
  );
}
