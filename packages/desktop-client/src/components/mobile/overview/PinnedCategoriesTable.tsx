import React from 'react';
import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { integerToCurrency } from 'loot-core/shared/util';

import { usePinnedCategories } from '@desktop-client/components/budget/hooks/usePinnedCategories';
import { makeAmountFullStyle, makeBalanceAmountStyle } from '@desktop-client/components/budget/util';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import {
  envelopeBudget,
  trackingBudget,
} from '@desktop-client/spreadsheet/bindings';

type PinnedCategoriesTableProps = {
  onCategoryClick: (categoryId: string) => void;
};

type PinnedCategoryRowProps = {
  categoryId: string;
  categoryName: string;
  onCategoryClick: (categoryId: string) => void;
  isLastItem: boolean;
};

function PinnedCategoryRow({
  categoryId,
  categoryName,
  onCategoryClick,
  isLastItem,
}: PinnedCategoryRowProps) {
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');

  const balanceBinding =
    budgetType === 'envelope'
      ? envelopeBudget.catBalance(categoryId)
      : trackingBudget.catBalance(categoryId);

  const balance = useSheetValue<
    'envelope-budget' | 'tracking-budget',
    typeof balanceBinding
  >(balanceBinding);

  return (
    <View
      onClick={() => onCategoryClick(categoryId)}
      data-testid={`category-row-${categoryId}`}
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: !isLastItem ? `1px solid ${theme.tableBorder}` : 'none',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = theme.tableRowBackgroundHover;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <Text style={{ flex: 1, fontSize: 14, color: theme.tableText }}>
        {categoryName}
      </Text>
      <Text
        style={{
          fontSize: 14,
          marginLeft: 12,
          flexShrink: 0,
          ...makeAmountFullStyle(balance ?? 0, {
            positiveColor: theme.noticeTextMenu,
            negativeColor: theme.errorTextMenu,
          }),
        }}
      >
        {balance != null ? integerToCurrency(balance) : '-'}
      </Text>
    </View>
  );
}

export function PinnedCategoriesTable({
  onCategoryClick,
}: PinnedCategoriesTableProps) {
  const overviewEnabled = useFeatureFlag('enableOverviewPage');
  const { getPinnedCategories } = usePinnedCategories();
  const pinnedCategories = getPinnedCategories();

  // Only render if overview feature is enabled
  if (!overviewEnabled) {
    return null;
  }

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
            <PinnedCategoryRow
              key={category.id}
              categoryId={category.id}
              categoryName={category.name}
              onCategoryClick={onCategoryClick}
              isLastItem={index === pinnedCategories.length - 1}
            />
          );
        })}
      </View>
    </View>
  );
}
