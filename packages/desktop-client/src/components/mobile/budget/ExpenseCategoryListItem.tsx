import { type ComponentPropsWithoutRef, useCallback } from 'react';
import { GridListItem } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheveronRight } from '@actual-app/components/icons/v1';
import { styles, type CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type BudgetType } from 'loot-core/server/prefs';
import * as monthUtils from 'loot-core/shared/months';
import { groupById, integerToCurrency } from 'loot-core/shared/util';
import { type CategoryEntity } from 'loot-core/types/models';

import { BalanceCell } from './BalanceCell';
import { BudgetCell } from './BudgetCell';
import { getColumnWidth, ROW_HEIGHT } from './BudgetTable';
import { SpentCell } from './SpentCell';

import { useCategories } from '@desktop-client/hooks/useCategories';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { type ScheduleDateInfo } from '@desktop-client/hooks/useScheduleDueDates';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useUndo } from '@desktop-client/hooks/useUndo';
import { collapseModals, pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';
import {
  envelopeBudget,
  trackingBudget,
} from '@desktop-client/spreadsheet/bindings';

type ExpenseCategoryNameProps = {
  category: CategoryEntity;
  onEditCategory: (id: CategoryEntity['id']) => void;
  show3Columns: boolean;
};

function ExpenseCategoryName({
  category,
  onEditCategory,
  show3Columns,
}: ExpenseCategoryNameProps) {
  const sidebarColumnWidth = getColumnWidth({
    show3Columns,
    isSidebar: true,
  });

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      {/* Hidden drag button */}
      <Button
        slot="drag"
        style={{
          opacity: 0,
          width: 1,
          height: 1,
          position: 'absolute',
          overflow: 'hidden',
        }}
      />
      <Button
        variant="bare"
        style={{
          maxWidth: sidebarColumnWidth,
        }}
        onPress={() => onEditCategory?.(category.id)}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <Text
            style={{
              ...styles.lineClamp(2),
              width: sidebarColumnWidth,
              textAlign: 'left',
              fontSize: 16,
            }}
            data-testid="category-name"
          >
            {category.name}
          </Text>
          <SvgCheveronRight
            style={{ flexShrink: 0, color: theme.tableTextSubdued }}
            width={14}
            height={14}
          />
        </View>
      </Button>
    </View>
  );
}

type ExpenseCategoryCellsProps = {
  category: CategoryEntity;
  month: string;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  show3Columns: boolean;
  showBudgetedColumn: boolean;
  onOpenBalanceMenu: () => void;
  onShowActivity: () => void;
};

function ExpenseCategoryCells({
  category,
  month,
  onBudgetAction,
  show3Columns,
  showBudgetedColumn,
  onOpenBalanceMenu,
  onShowActivity,
}: ExpenseCategoryCellsProps) {
  const { t } = useTranslation();
  const columnWidth = getColumnWidth({
    show3Columns,
    isSidebar: false,
  });
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');

  const budgeted =
    budgetType === 'tracking'
      ? trackingBudget.catBudgeted(category.id)
      : envelopeBudget.catBudgeted(category.id);

  const spent =
    budgetType === 'tracking'
      ? trackingBudget.catSumAmount(category.id)
      : envelopeBudget.catSumAmount(category.id);

  const balance =
    budgetType === 'tracking'
      ? trackingBudget.catBalance(category.id)
      : envelopeBudget.catBalance(category.id);

  return (
    <View
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        flexDirection: 'row',
      }}
    >
      <View
        style={{
          ...(!show3Columns && !showBudgetedColumn && { display: 'none' }),
          width: columnWidth,
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        <BudgetCell
          binding={budgeted}
          type="financial"
          category={category}
          month={month}
          onBudgetAction={onBudgetAction}
        />
      </View>
      <View
        style={{
          ...(!show3Columns && showBudgetedColumn && { display: 'none' }),
          width: columnWidth,
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        <SpentCell
          binding={spent}
          category={category}
          month={month}
          show3Columns={show3Columns}
          onPress={onShowActivity}
        />
      </View>
      <View
        style={{
          width: columnWidth,
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        <BalanceCell
          binding={balance}
          category={category}
          show3Columns={show3Columns}
          onPress={onOpenBalanceMenu}
          aria-label={t('Open balance menu for {{categoryName}} category', {
            categoryName: category.name,
          })}
        />
      </View>
    </View>
  );
}

function formatScheduleDate(dateString: string): string {
  // Convert YYYY-MM-DD to MM/DD/YY
  const [year, month, day] = dateString.split('-');
  const shortYear = year.slice(2); // Get last 2 digits
  return `${parseInt(month)}/${parseInt(day)}/${shortYear}`;
}

type ScheduleDateButtonProps = {
  schedule: ScheduleDateInfo;
  showComma: boolean;
};

function ScheduleDateButton({ schedule, showComma }: ScheduleDateButtonProps) {
  const dispatch = useDispatch();

  const handlePress = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'schedule-edit',
          options: { id: schedule.scheduleId },
        },
      }),
    );
  };

  return (
    <Button
      variant="bare"
      onPress={handlePress}
      style={{
        padding: 2,
        minHeight: 0,
      }}
      aria-label={`Edit schedule: ${schedule.scheduleName}, due ${formatScheduleDate(schedule.nextDate)}`}
    >
      <Text
        style={{
          fontSize: 12,
          color: theme.pageTextSubdued,
        }}
      >
        {formatScheduleDate(schedule.nextDate)}
        {showComma ? ',' : ''}
      </Text>
    </Button>
  );
}

type ScheduleDatesDisplayProps = {
  categoryId: string;
  scheduleDates: Map<string, ScheduleDateInfo[]>;
};

function ScheduleDatesDisplay({
  categoryId,
  scheduleDates,
}: ScheduleDatesDisplayProps) {
  const schedules = scheduleDates.get(categoryId) || [];

  if (schedules.length === 0) {
    return null;
  }

  const MAX_DISPLAY = 2;
  const displaySchedules = schedules.slice(0, MAX_DISPLAY);
  const hasMore = schedules.length > MAX_DISPLAY;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingTop: 2,
      }}
    >
      {displaySchedules.map((schedule, index) => (
        <ScheduleDateButton
          key={schedule.scheduleId}
          schedule={schedule}
          showComma={index < displaySchedules.length - 1}
        />
      ))}
      {hasMore && (
        <Text
          style={{
            fontSize: 12,
            color: theme.pageTextSubdued,
          }}
        >
          ...
        </Text>
      )}
    </View>
  );
}

type TargetAmountDisplayProps = {
  categoryId: string;
  targetAmounts: Record<string, number | undefined>;
  show3Columns: boolean;
};

function TargetAmountDisplay({
  categoryId,
  targetAmounts,
  show3Columns,
}: TargetAmountDisplayProps) {
  const targetValue = targetAmounts ? targetAmounts[categoryId] : undefined;

  // Calculate column width to align with Budgeted column
  const columnWidth = getColumnWidth({
    show3Columns,
    isSidebar: false,
  });

  // Determine color based on target value
  const color =
    targetValue === undefined
      ? theme.pageTextLight
      : targetValue === 0
        ? theme.noticeText
        : targetValue > 0
          ? theme.warningText
          : theme.errorText;

  return (
    <View
      style={{
        width: columnWidth,
        minWidth: columnWidth,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 5,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontStyle: 'italic',
          color,
        }}
      >
        {targetValue !== undefined
          ? integerToCurrency(targetValue)
          : 'N/A'}
      </Text>
    </View>
  );
}

type ExpenseCategoryListItemProps = ComponentPropsWithoutRef<
  typeof GridListItem<CategoryEntity>
> & {
  month: string;
  isHidden: boolean;
  style?: CSSProperties;
  show3Columns: boolean;
  showBudgetedColumn: boolean;
  onEditCategory: (id: CategoryEntity['id']) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  mobileDetailedView: boolean;
  categoryScheduleDates: Map<string, ScheduleDateInfo[]>;
  categoryTargetAmounts: Record<string, number | undefined>;
};

export function ExpenseCategoryListItem({
  month,
  isHidden,
  onEditCategory,
  onBudgetAction,
  show3Columns,
  showBudgetedColumn,
  mobileDetailedView,
  categoryScheduleDates,
  categoryTargetAmounts,
  ...props
}: ExpenseCategoryListItemProps) {
  const { value: category } = props;

  const { t } = useTranslation();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');

  const balanceMenuModalName =
    `${budgetType as BudgetType}-balance-menu` as const;
  const dispatch = useDispatch();
  const { showUndoNotification } = useUndo();
  const { list: categories } = useCategories();
  const categoriesById = groupById(categories);

  const onCarryover = useCallback(
    (carryover: boolean) => {
      if (!category) {
        return;
      }
      onBudgetAction(month, 'carryover', {
        category: category.id,
        flag: carryover,
      });
      dispatch(collapseModals({ rootModalName: balanceMenuModalName }));
    },
    [category, onBudgetAction, month, dispatch, balanceMenuModalName],
  );

  const catBalance = useSheetValue<
    'envelope-budget' | 'tracking-budget',
    'leftover'
  >(
    budgetType === 'envelope'
      ? envelopeBudget.catBalance(category?.id)
      : trackingBudget.catBalance(category?.id),
  );

  const onTransfer = useCallback(() => {
    if (!category) {
      return;
    }
    dispatch(
      pushModal({
        modal: {
          name: 'transfer',
          options: {
            title: category.name,
            categoryId: category.id,
            month,
            amount: catBalance || 0,
            onSubmit: (amount, toCategoryId) => {
              onBudgetAction(month, 'transfer-category', {
                amount,
                from: category.id,
                to: toCategoryId,
              });
              dispatch(collapseModals({ rootModalName: balanceMenuModalName }));
              showUndoNotification({
                message: `Transferred ${integerToCurrency(amount)} from ${category.name} to ${categoriesById[toCategoryId].name}.`,
              });
            },
            showToBeBudgeted: true,
          },
        },
      }),
    );
  }, [
    category,
    dispatch,
    month,
    catBalance,
    onBudgetAction,
    balanceMenuModalName,
    showUndoNotification,
    categoriesById,
  ]);

  const onCover = useCallback(() => {
    if (!category) {
      return;
    }
    dispatch(
      pushModal({
        modal: {
          name: 'cover',
          options: {
            title: category.name,
            month,
            amount: catBalance,
            categoryId: category.id,
            onSubmit: (amount, fromCategoryId) => {
              onBudgetAction(month, 'cover-overspending', {
                to: category.id,
                from: fromCategoryId,
                amount,
              });
              dispatch(collapseModals({ rootModalName: balanceMenuModalName }));
              showUndoNotification({
                message: t(
                  `Covered {{amount}} {{toCategoryName}} overspending from {{fromCategoryName}}.`,
                  {
                    amount: integerToCurrency(amount),
                    toCategoryName: category.name,
                    fromCategoryName: categoriesById[fromCategoryId].name,
                  },
                ),
              });
            },
          },
        },
      }),
    );
  }, [
    category,
    dispatch,
    month,
    catBalance,
    onBudgetAction,
    balanceMenuModalName,
    showUndoNotification,
    t,
    categoriesById,
  ]);

  const onOpenBalanceMenu = useCallback(() => {
    if (!category) {
      return;
    }
    if (balanceMenuModalName === 'envelope-balance-menu') {
      dispatch(
        pushModal({
          modal: {
            name: balanceMenuModalName,
            options: {
              month,
              categoryId: category.id,
              onCarryover,
              onTransfer,
              onCover,
            },
          },
        }),
      );
    } else {
      dispatch(
        pushModal({
          modal: {
            name: balanceMenuModalName,
            options: {
              month,
              categoryId: category.id,
              onCarryover,
            },
          },
        }),
      );
    }
  }, [
    category,
    balanceMenuModalName,
    dispatch,
    month,
    onCarryover,
    onTransfer,
    onCover,
  ]);

  const navigate = useNavigate();
  const onShowActivity = useCallback(() => {
    if (!category) {
      return;
    }
    navigate(`/categories/${category.id}?month=${month}`);
  }, [category, month, navigate]);

  if (!category) {
    return null;
  }

  const EXPANSION_HEIGHT = 25;
  const sidebarColumnWidth = getColumnWidth({
    show3Columns,
    isSidebar: true,
  });

  return (
    <GridListItem
      textValue={category.name}
      data-testid="category-row"
      {...props}
    >
      <View style={{ flexDirection: 'column' }}>
        <View
          style={{
            height: ROW_HEIGHT,
            borderColor: theme.tableBorder,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: 5,
            paddingRight: 5,
            borderBottomWidth: mobileDetailedView ? 0 : 1,
            opacity: isHidden ? 0.5 : undefined,
            backgroundColor: monthUtils.isCurrentMonth(month)
              ? theme.budgetCurrentMonth
              : theme.budgetOtherMonth,
          }}
        >
          <ExpenseCategoryName
            category={category}
            onEditCategory={onEditCategory}
            show3Columns={show3Columns}
          />
          <ExpenseCategoryCells
            key={`${category.id}-${show3Columns}-${showBudgetedColumn}`}
            category={category}
            month={month}
            onBudgetAction={onBudgetAction}
            show3Columns={show3Columns}
            showBudgetedColumn={showBudgetedColumn}
            onOpenBalanceMenu={onOpenBalanceMenu}
            onShowActivity={onShowActivity}
          />
        </View>
        {mobileDetailedView && (
          <View
            style={{
              height: EXPANSION_HEIGHT,
              borderColor: theme.tableBorder,
              borderBottomWidth: 1,
              paddingLeft: 5,
              paddingRight: 5,
              backgroundColor: monthUtils.isCurrentMonth(month)
                ? theme.budgetCurrentMonth
                : theme.budgetOtherMonth,
              opacity: isHidden ? 0.5 : undefined,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <View
              style={{
              width: sidebarColumnWidth,
              flexShrink: 0,
            }}
          />
          <TargetAmountDisplay
            categoryId={category.id}
            targetAmounts={categoryTargetAmounts}
            show3Columns={show3Columns}
          />
          <View
            style={{
              flex: 1,
              minHeight: 0,
              }}
            >
              <ScheduleDatesDisplay
                categoryId={category.id}
                scheduleDates={categoryScheduleDates}
              />
            </View>
          </View>
        )}
      </View>
    </GridListItem>
  );
}
