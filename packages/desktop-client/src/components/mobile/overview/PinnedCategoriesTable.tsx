import React from 'react';
import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { usePinnedCategories } from '@desktop-client/components/budget/hooks/usePinnedCategories';

type PinnedCategoriesTableProps = {
  onCategoryClick: (categoryId: string) => void;
};

export function PinnedCategoriesTable({
  onCategoryClick,
}: PinnedCategoriesTableProps) {
  const { getPinnedCategories } = usePinnedCategories();
  const pinnedCategories = getPinnedCategories();

  if (pinnedCategories.length === 0) {
    return (
      <View style={{ marginTop: 20, marginBottom: 20, paddingHorizontal: 0 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: 600,
            padding: '10px 15px',
            color: theme.pageTextSubdued,
          }}
        >
          <Trans>Pinned Categories</Trans>
        </Text>
        <View
          style={{
            padding: '24px 15px',
            textAlign: 'center' as const,
            color: theme.pageTextSubdued,
            fontSize: 14,
            border: `1px solid ${theme.tableBorder}`,
            borderRadius: 4,
            marginHorizontal: 16,
            backgroundColor: theme.tableBackground,
          }}
        >
          <Text>
            No pinned categories. Pin categories from the budget page to see
            them here.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 20, marginBottom: 20, paddingHorizontal: 0 }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: 600,
          padding: '10px 15px',
          color: theme.pageTextSubdued,
        }}
      >
        <Trans>Pinned Categories</Trans>
      </Text>
      <View
        style={{
          backgroundColor: theme.tableBackground,
          border: `1px solid ${theme.tableBorder}`,
          borderRadius: 4,
          marginHorizontal: 16,
          overflow: 'hidden',
        }}
      >
        {pinnedCategories.map((category, index) => {
          return (
            <View
              key={category.id}
              onClick={() => onCategoryClick(category.id)}
              data-testid={`category-row-${category.id}`}
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom:
                  index < pinnedCategories.length - 1
                    ? `1px solid ${theme.tableBorder}`
                    : 'none',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor =
                  theme.tableRowBackgroundHover;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Text style={{ flex: 1, fontSize: 14, color: theme.tableText }}>
                {category.name}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
