import React, { type CSSProperties } from 'react';
import { Trans } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import { EnvelopeCellValue } from '@desktop-client/components/budget/envelope/EnvelopeBudgetComponents';
import { CellValueText } from '@desktop-client/components/spreadsheet/CellValue';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';
import { useTargetAmounts } from '@desktop-client/components/budget/TargetAmountsContext';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

type TotalsListProps = {
  prevMonthName: string;
  style?: CSSProperties;
};

export function TotalsList({ prevMonthName, style }: TotalsListProps) {
  const format = useFormat();
  const { totalGoal, totalUnderfunded, totalOverfunded } = useTargetAmounts();
  const income = useSheetValue<'envelope-budget', 'total-income'>(
    envelopeBudget.totalIncome,
  );
  const spent = useSheetValue<'envelope-budget', 'total-spent'>(
    envelopeBudget.totalSpent,
  );

  const Separator = () => (
    <View
      style={{
        height: 1,
        backgroundColor: theme.tableBorder,
        marginTop: 10,
        marginBottom: 10,
      }}
    />
  );

  return (
    <View
      style={{
        ...styles.smallText,
        ...style,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          lineHeight: 1.5,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            textAlign: 'right',
            marginRight: 10,
            minWidth: 50,
          }}
        >
          {/* Income & Spent */}
          <Block style={{ fontWeight: 600 }}>
            {format(income, 'financial')}
          </Block>
          <Block style={{ fontWeight: 600 }}>
            {format(spent, 'financial')}
          </Block>

          <Separator />

          {/* Goals & Fund Status */}
          {totalUnderfunded < 0 && (
            <Block style={{ fontWeight: 600, color: theme.warningText }}>
              {format(totalUnderfunded, 'financial')}
            </Block>
          )}
          <Block style={{ fontWeight: 600, color: theme.noticeText }}>
            {format(totalGoal + totalUnderfunded, 'financial')}
          </Block>
          {totalOverfunded > 0 && (
            <Block style={{ fontWeight: 600, color: theme.errorText }}>
              {format(totalOverfunded, 'financial')}
            </Block>
          )}
          <Block style={{ fontWeight: 600 }}>
            {format(totalGoal, 'financial')}
          </Block>

          <Separator />

          {/* Existing Items */}
          <Tooltip
            style={{ ...styles.tooltip, lineHeight: 1.5, padding: '6px 10px' }}
            content={
              <>
                <AlignedText
                  left="Income:"
                  right={
                    <EnvelopeCellValue
                      binding={envelopeBudget.totalIncome}
                      type="financial"
                    />
                  }
                />
                <AlignedText
                  left="From Last Month:"
                  right={
                    <EnvelopeCellValue
                      binding={envelopeBudget.fromLastMonth}
                      type="financial"
                    />
                  }
                />
              </>
            }
            placement="bottom end"
          >
            <EnvelopeCellValue
              binding={envelopeBudget.incomeAvailable}
              type="financial"
            >
              {props => (
                <CellValueText {...props} style={{ fontWeight: 600 }} />
              )}
            </EnvelopeCellValue>
          </Tooltip>

          <EnvelopeCellValue
            binding={envelopeBudget.lastMonthOverspent}
            type="financial"
          >
            {props => (
              <CellValueText
                {...props}
                style={{ fontWeight: 600 }}
                formatter={(value, type) => {
                  const v = format(value, type);
                  return value > 0 ? '+' + v : value === 0 ? '-' + v : v;
                }}
              />
            )}
          </EnvelopeCellValue>

          <EnvelopeCellValue
            binding={envelopeBudget.totalBudgeted}
            type="financial"
          >
            {props => (
              <CellValueText
                {...props}
                style={{ fontWeight: 600 }}
                formatter={(value, type) => {
                  const v = format(value, type);
                  return value > 0 ? '+' + v : value === 0 ? '-' + v : v;
                }}
              />
            )}
          </EnvelopeCellValue>

          <EnvelopeCellValue
            binding={envelopeBudget.forNextMonth}
            type="financial"
          >
            {props => (
              <CellValueText
                {...props}
                style={{ fontWeight: 600 }}
                formatter={(value, type) => {
                  const v = format(Math.abs(value), type);
                  return value >= 0 ? '-' + v : '+' + v;
                }}
              />
            )}
          </EnvelopeCellValue>
        </View>

        <View>
          {/* Income & Spent Labels */}
          <Block>Income</Block>
          <Block>Spent</Block>

          <Separator />

          {/* Goals & Fund Status Labels */}
          {totalUnderfunded < 0 && <Block>Underfunded</Block>}
          <Block>Funded</Block>
          {totalOverfunded > 0 && <Block>Overfunded</Block>}
          <Block>Goals Target</Block>

          <Separator />

          {/* Existing Labels */}
          <Block>
            <Trans>Available funds</Trans>
          </Block>

          <Block>
            <Trans>Overspent in {{ prevMonthName }}</Trans>
          </Block>

          <Block>
            <Trans>Budgeted</Trans>
          </Block>

          <Block>
            <Trans>For next month</Trans>
          </Block>
        </View>
      </View>
    </View>
  );
}
