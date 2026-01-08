import React, { useMemo, useState, useCallback } from 'react';
import { View } from '@actual-app/components/view';
import { theme } from '@actual-app/components/theme';
import { styles } from '@actual-app/components/styles';
import { SvgRefresh } from '@actual-app/components/icons/v1';

import { usePlanningData } from './usePlanningData';
import { useCheckboxState } from './useCheckboxState';
import { useSummaryCalculations } from './useSummaryCalculations';
import { useColumnCycling } from './useColumnCycling';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { getScrollbarWidth } from '@desktop-client/components/budget/util';
import { GroupRow } from './GroupRow';
import { CategoryRow } from './CategoryRow';

export function PlanningTable() {
  const { groups } = usePlanningData();
  const format = useFormat();
  const [categoryExpandedStatePref] = useGlobalPref('categoryExpandedState');
  const categoryExpandedState = categoryExpandedStatePref ?? 0;
  const { isNarrowWidth } = useResponsive();
  const { visibleColumn, cycleColumn, isMobile } = useColumnCycling();
  const [isFlashing, setIsFlashing] = useState(false);

  // Calculate maxWidth based on screen size
  // Mobile (< 512px): base (200) + category expansion + 1 data column (120)
  // Desktop (≥ 512px): base (200) + category expansion + 3 data columns (360)
  const dataColumnsWidth = isNarrowWidth ? 120 : 360;
  const maxWidth = 200 + 100 * categoryExpandedState + dataColumnsWidth;

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

  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set());

  const toggleCollapse = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleCycleColumn = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    cycleColumn();
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);
  }, [cycleColumn]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleCycleColumn(e);
    }
  }, [handleCycleColumn]);

  // Get column label for display
  const getColumnLabel = (column: typeof visibleColumn) => {
    switch (column) {
      case 'goalTarget':
        return 'Goal Target';
      case 'underfunded':
        return 'Underfunded';
      case 'overfunded':
        return 'Overfunded';
    }
  };

  return (
    <View
      style={{
        border: `1px solid ${theme.tableBorder}`,
        borderRadius: 4,
        backgroundColor: theme.tableBackground,
        overflow: 'visible',
        maxWidth: isMobile ? '100%' : maxWidth,
        width: isMobile ? '100%' : 'auto',
      }}
    >
      {/* Header Row */}
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: isFlashing
            ? theme.tableHeaderBackgroundHover
            : theme.tableHeaderBackground,
          borderBottom: `1px solid ${theme.tableBorder}`,
          fontWeight: 600,
          fontSize: 13,
          color: theme.tableHeaderText,
          transition: 'background-color 0.2s ease',
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
        {!isMobile ? (
          <>
            <View style={{ width: 120, textAlign: 'right' }}>Overfunded</View>
            <View style={{ width: 120, textAlign: 'right' }}>Underfunded</View>
            <View style={{ width: 120, textAlign: 'right' }}>Goal Target</View>
          </>
        ) : (
          <View
            role="button"
            tabIndex={0}
            onClick={handleCycleColumn}
            onKeyDown={handleKeyDown}
            aria-label="Cycle between Goal Target, Underfunded, and Overfunded columns"
            style={{
              width: 120,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 4,
              minHeight: 44,
            }}
          >
            <span>{getColumnLabel(visibleColumn)}</span>
            <SvgRefresh
              style={{
                width: 16,
                height: 16,
                color: theme.tableHeaderText,
                flexShrink: 0,
              }}
            />
          </View>
        )}
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
        {!isMobile ? (
          <>
            <View style={{ width: 120, textAlign: 'right', color: totalSummary.overfunded > 0 ? theme.warningText : theme.noticeText }}>
              {format(totalSummary.overfunded, 'financial')}
            </View>
            <View style={{ width: 120, textAlign: 'right', color: totalSummary.underfunded > 0 ? theme.warningText : theme.noticeText }}>
              {format(totalSummary.underfunded, 'financial')}
            </View>
            <View style={{ width: 120, textAlign: 'right' }}>
              {format(totalSummary.goalTarget, 'financial')}
            </View>
          </>
        ) : (
          <View
            style={{
              width: 120,
              textAlign: 'right',
              color:
                visibleColumn === 'goalTarget'
                  ? theme.tableText
                  : visibleColumn === 'overfunded'
                    ? totalSummary.overfunded > 0 ? theme.warningText : theme.noticeText
                    : totalSummary.underfunded > 0 ? theme.warningText : theme.noticeText,
            }}
          >
            {visibleColumn === 'goalTarget' && format(totalSummary.goalTarget, 'financial')}
            {visibleColumn === 'underfunded' && format(totalSummary.underfunded, 'financial')}
            {visibleColumn === 'overfunded' && format(totalSummary.overfunded, 'financial')}
          </View>
        )}
      </View>

      {/* Groups and Categories */}
      {groups.map(group => {
        const categoryIds = group.categories.map(c => c.id);
        const groupCheckboxState = getGroupCheckboxState(categoryIds);
        const isCollapsed = collapsedGroups.has(group.id);

        return (
          <React.Fragment key={group.id}>
            <GroupRow
              groupName={group.name}
              categories={group.categories}
              selectedCategories={selectedCategories}
              checkboxState={groupCheckboxState}
              onToggle={() => toggleGroup(categoryIds)}
              isCollapsed={isCollapsed}
              onToggleCollapse={() => toggleCollapse(group.id)}
              isNarrowWidth={isNarrowWidth}
              visibleColumn={visibleColumn}
              isMobile={isMobile}
            />
            {!isCollapsed && group.categories.map(category => (
              <CategoryRow
                key={category.id}
                categoryName={category.name}
                overfunded={category.overfunded}
                underfunded={category.underfunded}
                goalTarget={category.goalTarget}
                isSelected={isSelected(category.id)}
                onToggle={() => toggleCategory(category.id)}
                isNarrowWidth={isNarrowWidth}
                visibleColumn={visibleColumn}
                isMobile={isMobile}
              />
            ))}
          </React.Fragment>
        );
      })}
    </View>
  );
}
