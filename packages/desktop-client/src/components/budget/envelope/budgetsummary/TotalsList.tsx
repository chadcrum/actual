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
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useGoalTargetSum } from '@desktop-client/hooks/useGoalTargetSum';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

type TotalsListProps = {
  prevMonthName: string;
  month: string;
  style?: CSSProperties;
};

function GoalTargetRow({ month }: { month: string }) {
  const format = useFormat();
  const goalTargetSum = useGoalTargetSum(month);

  return (
    <>
      <Block style={{ fontWeight: 600 }}>
        {format(goalTargetSum, 'financial')}
      </Block>
      <View
        style={{
          borderTop: '1px solid ' + theme.tableBorder,
          marginTop: 4,
          marginBottom: 4,
        }}
      />
    </>
  );
}

function GoalTargetLabel() {
  return (
    <>
      <Block>
        <Trans>Goal Target</Trans>
      </Block>
      <View
        style={{
          borderTop: '1px solid ' + theme.tableBorder,
          marginTop: 4,
          marginBottom: 4,
        }}
      />
    </>
  );
}

export function TotalsList({ prevMonthName, month, style }: TotalsListProps) {
  const format = useFormat();
  const isBudgetTooltipGoalsEnabled = useFeatureFlag('budget-tooltip-goals');
  return (
    <View
      style={{
        flexDirection: 'row',
        lineHeight: 1.5,
        justifyContent: 'center',
        ...styles.smallText,
        ...style,
      }}
    >
      <View
        style={{
          textAlign: 'right',
          marginRight: 10,
          minWidth: 50,
        }}
      >
        {isBudgetTooltipGoalsEnabled && <GoalTargetRow month={month} />}
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
            {props => <CellValueText {...props} style={{ fontWeight: 600 }} />}
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
        {isBudgetTooltipGoalsEnabled && <GoalTargetLabel />}
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
  );
}
