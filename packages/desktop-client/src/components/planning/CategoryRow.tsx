import React from 'react';
import { View } from '@actual-app/components/view';
import { theme } from '@actual-app/components/theme';
import { useFormat } from '@desktop-client/hooks/useFormat';

interface CategoryRowProps {
  categoryName: string;
  overfunded: number;
  underfunded: number;
  goalTarget: number | null;
  isSelected: boolean;
  onToggle: () => void;
  isNarrowWidth: boolean;
}

export function CategoryRow({
  categoryName,
  overfunded,
  underfunded,
  goalTarget,
  isSelected,
  onToggle,
  isNarrowWidth,
}: CategoryRowProps) {
  const format = useFormat();

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        flexShrink: 0,
        padding: '12px 16px',
        paddingLeft: 36, // Indent for category rows (creates 20px visual indent after checkbox)
        backgroundColor: theme.tableBackground,
        borderBottom: `1px solid ${theme.tableBorder}`,
        fontSize: 13,
        color: theme.tableText,
        opacity: isSelected ? 1 : 0.4,
        transition: 'opacity 0.2s ease',
      }}
    >
      <View style={{ width: 40, flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          style={{ cursor: 'pointer' }}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0, whiteSpace: 'normal', wordBreak: 'break-word' }}>
        {categoryName}
      </View>
      {!isNarrowWidth && (
        <>
          <View style={{ width: 120, textAlign: 'right', color: theme.noticeText }}>
            {overfunded > 0 ? format(overfunded, 'financial') : '—'}
          </View>
          <View style={{ width: 120, textAlign: 'right', color: theme.noticeText }}>
            {underfunded > 0 ? format(underfunded, 'financial') : '—'}
          </View>
        </>
      )}
      <View style={{ width: 120, textAlign: 'right' }}>
        {goalTarget != null ? format(goalTarget, 'financial') : '—'}
      </View>
    </View>
  );
}
