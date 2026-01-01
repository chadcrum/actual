import React from 'react';
import { usePinnedCategories } from '../../budget/hooks/usePinnedCategories';
import { useFormat } from '../../../hooks/useFormat';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { Text } from '@actual-app/components/text';
import s from './PinnedCategoriesTable.module.css';

interface PinnedCategoriesTableProps {
  onCategoryClick: (categoryId: string) => void;
}

function getCategoryColor(category: {
  balance?: number;
  goal_target?: number;
}): string {
  if (!category.balance || !category.goal_target) {
    return theme.tableText;
  }

  // If balance >= goal_target, the category is funded (green)
  if (category.balance >= category.goal_target) {
    return '#4CAF50'; // Green for funded
  }

  // If balance < goal_target, the category is underfunded (red)
  return '#F44336'; // Red for underfunded
}

export function PinnedCategoriesTable({
  onCategoryClick,
}: PinnedCategoriesTableProps) {
  const { getPinnedCategories } = usePinnedCategories();
  const format = useFormat();
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
          Pinned Categories
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
        Pinned Categories
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
          const color = getCategoryColor(category);
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
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.tableRowBackgroundHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Text style={{ flex: 1, fontSize: 14, color: theme.tableText }}>
                {category.name}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  textAlign: 'right' as const,
                  minWidth: 80,
                  color,
                }}
              >
                {format(category.balance || 0, 'financial')}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
