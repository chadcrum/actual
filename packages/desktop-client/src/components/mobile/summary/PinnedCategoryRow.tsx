import React, { type CSSProperties } from 'react';
import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { type UseFormatResult } from '@desktop-client/hooks/useFormat';

type PinnedCategoryRowProps = {
  categoryId: string;
  categoryName: string;
  balance: number;
  format: UseFormatResult;
  pillStyle?: CSSProperties;
  onClickName?: (categoryId: string) => void;
  onClickBalance?: (categoryId: string) => void;
};

export function PinnedCategoryRow({
  categoryId,
  categoryName,
  balance,
  format,
  pillStyle,
  onClickName,
  onClickBalance,
}: PinnedCategoryRowProps) {
  return (
    <View
      style={{
        paddingTop: 6,
        paddingBottom: 6,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: theme.tableBorder,
          paddingBottom: 0,
        }}
      >
        <Block
          style={{
            fontSize: 16,
            fontWeight: 500,
            flex: 1,
            ...(onClickName && { cursor: 'pointer' }),
          }}
          onClick={onClickName ? () => onClickName(categoryId) : undefined}
        >
          {categoryName}
        </Block>
        <PrivacyFilter>
          <Block
            style={{
              fontSize: 16,
              fontWeight: 600,
              ...(pillStyle || {
                color: balance < 0 ? theme.warningText : undefined,
              }),
              ...(onClickBalance && { cursor: 'pointer' }),
            }}
            onClick={onClickBalance ? () => onClickBalance(categoryId) : undefined}
          >
            {format(Math.abs(balance), 'financial')}
          </Block>
        </PrivacyFilter>
      </View>
    </View>
  );
}
