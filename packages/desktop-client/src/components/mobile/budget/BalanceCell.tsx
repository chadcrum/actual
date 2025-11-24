import { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgArrowThickRight } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';
import { AutoTextSize } from 'auto-text-size';

import { type CategoryEntity } from 'loot-core/types/models';

import { getColumnWidth, PILL_STYLE } from './BudgetTable';

import { BalanceWithCarryover } from '@desktop-client/components/budget/BalanceWithCarryover';
import { makeBalanceAmountStyle } from '@desktop-client/components/budget/util';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { type Binding } from '@desktop-client/spreadsheet';
import {
  envelopeBudget,
  trackingBudget,
} from '@desktop-client/spreadsheet/bindings';

type BalanceCellProps = {
  binding: Binding<
    'envelope-budget' | 'tracking-budget',
    'leftover' | 'sum-amount'
  >;
  category: CategoryEntity;
  show3Columns?: boolean;
  onPress?: () => void;
  'aria-label'?: string;
};

export function BalanceCell({
  binding,
  category,
  show3Columns,
  onPress,
  'aria-label': ariaLabel,
}: BalanceCellProps) {
  const { t } = useTranslation();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const columnWidth = getColumnWidth({
    show3Columns,
  });

  const goal =
    budgetType === 'tracking'
      ? trackingBudget.catGoal(category.id)
      : envelopeBudget.catGoal(category.id);

  const longGoal =
    budgetType === 'tracking'
      ? trackingBudget.catLongGoal(category.id)
      : envelopeBudget.catLongGoal(category.id);

  const budgeted =
    budgetType === 'tracking'
      ? trackingBudget.catBudgeted(category.id)
      : envelopeBudget.catBudgeted(category.id);

  const carryover =
    budgetType === 'tracking'
      ? trackingBudget.catCarryover(category.id)
      : envelopeBudget.catCarryover(category.id);

  const format = useFormat();
  const goalValue = useSheetValue(goal);
  const budgetedValue = useSheetValue(budgeted);
  const longGoalValue = useSheetValue(longGoal);

  return (
    <BalanceWithCarryover
      aria-label={t('Balance for {{categoryName}} category', {
        categoryName: category.name,
      })} // Translated aria-label
      type="financial"
      carryover={carryover}
      balance={binding}
      goal={goal}
      budgeted={budgeted}
      longGoal={longGoal}
      CarryoverIndicator={MobileCarryoverIndicator}
    >
      {({ type, value, className: defaultClassName }) => {
        // Get the color for this specific value
        const valueColorStyle = makeBalanceAmountStyle(
          value,
          goalValue,
          longGoalValue === 1 ? value : budgetedValue,
        );
        // Map text colors to their lighter background equivalents
        const textColor =
          valueColorStyle?.color ||
          (value > 0 ? theme.noticeText : theme.tableTextSubdued);

        // Convert text color to lighter background color
        let backgroundColor: string;
        let textColorForPill: string;

        if (textColor === theme.errorText) {
          backgroundColor = theme.errorBackground;
          textColorForPill = 'white';
        } else if (textColor === theme.warningText) {
          backgroundColor = '#ffff00'; // Pure yellow
          textColorForPill = 'black';
        } else if (textColor === theme.noticeText) {
          backgroundColor = '#00ff00'; // Bright green
          textColorForPill = 'black';
        } else {
          // Grey case (tableTextSubdued) - use a grey background with white text
          backgroundColor = theme.tableTextSubdued;
          textColorForPill = 'white';
        }

        return (
          <Button
            variant="bare"
            style={{
              ...PILL_STYLE,
              maxWidth: columnWidth,
              backgroundColor,
              color: textColorForPill,
            }}
            onPress={onPress}
            aria-label={ariaLabel}
          >
            <PrivacyFilter>
              <AutoTextSize
                key={value}
                as={Text}
                minFontSizePx={8}
                maxFontSizePx={14}
                mode="oneline"
                className={cx(
                  css({
                    maxWidth: columnWidth,
                    textAlign: 'right',
                    fontSize: 14,
                    color: textColorForPill,
                  }),
                )}
              >
                {format(value, type)}
              </AutoTextSize>
            </PrivacyFilter>
          </Button>
        );
      }}
    </BalanceWithCarryover>
  );
}
function MobileCarryoverIndicator({ style }: { style?: CSSProperties }) {
  // Map the original text color to its lighter background equivalent
  const originalColor = style?.color ?? theme.pillText;
  let backgroundColor: string;
  let iconColor: string;

  if (originalColor === theme.errorText) {
    backgroundColor = theme.errorBackground;
    iconColor = 'white';
  } else if (originalColor === theme.warningText) {
    backgroundColor = '#ffff00'; // Pure yellow
    iconColor = 'black';
  } else if (originalColor === theme.noticeText) {
    backgroundColor = '#00ff00'; // Bright green
    iconColor = 'black';
  } else {
    // Grey case
    backgroundColor = theme.tableTextSubdued;
    iconColor = 'white';
  }

  return (
    <View
      style={{
        position: 'absolute',
        right: '-3px',
        top: '-5px',
        borderRadius: '50%',
        backgroundColor,
      }}
    >
      <SvgArrowThickRight
        width={11}
        height={11}
        style={{ color: iconColor }}
      />
    </View>
  );
}
