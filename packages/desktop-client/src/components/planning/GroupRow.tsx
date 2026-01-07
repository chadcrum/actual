import React, { useMemo } from 'react';
import { View } from '@actual-app/components/view';
import { theme } from '@actual-app/components/theme';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useSummaryCalculations } from './useSummaryCalculations';
import type { VisibleColumn } from './useColumnCycling';

interface GroupRowProps {
  groupName: string;
  categories: Array<{
    id: string;
    overfunded: number;
    underfunded: number;
    goalTarget: number | null;
  }>;
  selectedCategories: { [id: string]: boolean };
  checkboxState: 'checked' | 'unchecked' | 'indeterminate';
  onToggle: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isNarrowWidth: boolean;
  visibleColumn: VisibleColumn;
  isMobile: boolean;
}

export function GroupRow({
  groupName,
  categories,
  selectedCategories,
  checkboxState,
  onToggle,
  isCollapsed,
  onToggleCollapse,
  isNarrowWidth,
  visibleColumn,
  isMobile,
}: GroupRowProps) {
  const format = useFormat();
  const summary = useSummaryCalculations(categories, selectedCategories);

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        flexShrink: 0,
        padding: '12px 16px',
        backgroundColor: theme.tableRowHeaderBackground,
        borderBottom: `1px solid ${theme.tableBorder}`,
        fontWeight: 600,
        fontSize: 13,
        color: theme.tableText,
        cursor: 'pointer',
      }}
      onClick={onToggleCollapse}
    >
      <View style={{ width: 40, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={checkboxState === 'checked'}
          ref={input => {
            if (input) {
              input.indeterminate = checkboxState === 'indeterminate';
            }
          }}
          onChange={onToggle}
          style={{ cursor: 'pointer' }}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <span style={{ flexShrink: 0 }}>{isCollapsed ? '▶' : '▼'}</span>
        <span style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{groupName}</span>
      </View>
      {!isMobile ? (
        <>
          <View style={{ width: 120, textAlign: 'right', color: summary.overfunded > 0 ? theme.warningText : theme.noticeText }}>
            {format(summary.overfunded, 'financial')}
          </View>
          <View style={{ width: 120, textAlign: 'right', color: summary.underfunded > 0 ? theme.warningText : theme.noticeText }}>
            {format(summary.underfunded, 'financial')}
          </View>
          <View style={{ width: 120, textAlign: 'right' }}>
            {format(summary.goalTarget, 'financial')}
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
                  ? summary.overfunded > 0 ? theme.warningText : theme.noticeText
                  : summary.underfunded > 0 ? theme.warningText : theme.noticeText,
          }}
        >
          {visibleColumn === 'goalTarget' && format(summary.goalTarget, 'financial')}
          {visibleColumn === 'underfunded' && format(summary.underfunded, 'financial')}
          {visibleColumn === 'overfunded' && format(summary.overfunded, 'financial')}
        </View>
      )}
    </View>
  );
}
