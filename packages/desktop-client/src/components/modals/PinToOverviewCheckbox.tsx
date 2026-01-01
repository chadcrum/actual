import React from 'react';
import { Trans } from 'react-i18next';

import { View } from '@actual-app/components/view';

import { usePinnedCategories } from '@desktop-client/components/budget/hooks/usePinnedCategories';

type PinToOverviewCheckboxProps = {
  categoryId: string;
  theme: {
    pillBorder: string;
    menuItemText: string;
  };
};

export function PinToOverviewCheckbox({
  categoryId,
  theme,
}: PinToOverviewCheckboxProps) {
  const { isPinned, togglePin } = usePinnedCategories();
  const checkboxId = `pin-to-overview-${categoryId}`;

  return (
    <View
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px',
        borderTop: `1px solid ${theme.pillBorder}`,
        marginTop: '8px',
      }}
    >
      <input
        type="checkbox"
        id={checkboxId}
        checked={isPinned(categoryId)}
        onChange={() => togglePin(categoryId)}
        style={{
          width: '18px',
          height: '18px',
          marginRight: '8px',
          cursor: 'pointer',
        }}
      />
      <label
        htmlFor={checkboxId}
        style={{
          fontSize: '14px',
          color: theme.menuItemText,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <Trans>Pin to Overview</Trans>
      </label>
    </View>
  );
}
