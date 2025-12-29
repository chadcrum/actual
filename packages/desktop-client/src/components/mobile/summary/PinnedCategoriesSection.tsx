import React from 'react';
import { useTranslation } from 'react-i18next';
import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { type UseFormatResult } from '@desktop-client/hooks/useFormat';
import { PinnedCategoryRow } from './PinnedCategoryRow';

type PinnedCategory = {
  categoryId: string;
  categoryName: string;
  balance: number;
};

type PinnedCategoriesSectionProps = {
  pinnedCategories: PinnedCategory[];
  format: UseFormatResult;
};

export function PinnedCategoriesSection({
  pinnedCategories,
  format,
}: PinnedCategoriesSectionProps) {
  const { t } = useTranslation();

  if (pinnedCategories.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 0,
        paddingBottom: 16,
        backgroundColor: theme.mobilePageBackground,
        marginBottom: 100,
      }}
    >
      <View
        style={{
          paddingLeft: 24,
          paddingRight: 24,
          marginTop: 24,
        }}
      >
        <Block
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 16,
            color: theme.pageText,
          }}
        >
          {t('Pinned Categories')}
        </Block>
        <View>
          {pinnedCategories.map((category) => (
            <PinnedCategoryRow
              key={category.categoryId}
              categoryId={category.categoryId}
              categoryName={category.categoryName}
              balance={category.balance}
              format={format}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
