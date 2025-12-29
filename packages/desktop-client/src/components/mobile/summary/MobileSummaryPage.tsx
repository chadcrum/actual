// @ts-strict-ignore
import React, { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';
import { send } from 'loot-core/platform/client/fetch';

import { SummaryTable } from './SummaryTable';
import { usePinnedCategories } from '@desktop-client/hooks/usePinnedCategories';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { PinnedCategoriesSection } from './PinnedCategoriesSection';
import { PinnedCategoryRow } from './PinnedCategoryRow';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

import { sync } from '@desktop-client/app/appSlice';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import {
  prewarmMonth,
  makeBalanceAmountStyle,
  makePillStyleFromTextColor,
} from '@desktop-client/components/budget/util';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { SyncRefresh } from '@desktop-client/components/SyncRefresh';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useGoalFundingStatus } from '@desktop-client/hooks/useGoalFundingStatus';
import { useGoalTargetSum } from '@desktop-client/hooks/useGoalTargetSum';
import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';
import { useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useDispatch } from '@desktop-client/redux';

type SummaryData = {
  budgeted: number;
  spent: number;
  goalTarget: number;
  underfunded: number;
};

export function MobileSummaryPage() {
  const { t } = useTranslation();
  const spreadsheet = useSpreadsheet();
  const dispatch = useDispatch();

  const currMonth = monthUtils.currentMonth();
  const [initialized, setInitialized] = useState(false);
  const [budgetTypePref] = useSyncedPref('budgetType');
  const budgetType =
    budgetTypePref === 'envelope' || budgetTypePref === 'tracking'
      ? budgetTypePref
      : 'envelope';

  useEffect(() => {
    async function init() {
      try {
        await prewarmMonth(budgetType, spreadsheet, currMonth);
      } catch (error) {
        console.error('Failed to prewarm month:', error);
      }
      setInitialized(true);
    }

    init();
  }, [budgetType, currMonth, spreadsheet]);

  if (!initialized) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.mobilePageBackground,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 25,
        }}
      >
        <View />
      </View>
    );
  }

  const monthName = monthUtils.format(currMonth, 'MMMM');

  return (
    <Page
      padding={0}
      header={<MobilePageHeader title={`${monthName} ${t('Overview')}`} />}
    >
      <SheetNameProvider name={monthUtils.sheetForMonth(currMonth)}>
        <SyncRefresh
          onSync={async () => {
            dispatch(sync());
          }}
        >
          {({ onRefresh: _onRefresh }) => <SummaryContent month={currMonth} />}
        </SyncRefresh>
      </SheetNameProvider>
    </Page>
  );
}

type SummaryContentProps = {
  month: string;
};

function SummaryContent({ month }: SummaryContentProps) {
  const format = useFormat();
  const dispatch = useDispatch();
  const budgeted = useSheetValue<
    'envelope-budget',
    typeof envelopeBudget.totalBudgeted
  >(envelopeBudget.totalBudgeted);
  const spent = useSheetValue<
    'envelope-budget',
    typeof envelopeBudget.totalSpent
  >(envelopeBudget.totalSpent);
  const goalTarget = useGoalTargetSum(month);
  const { underfunded } = useGoalFundingStatus(month);

  const summaryData: SummaryData = useMemo(
    () => ({
      budgeted: budgeted ?? 0,
      spent: spent ?? 0,
      goalTarget: goalTarget ?? 0,
      underfunded: underfunded ?? 0,
    }),
    [budgeted, spent, goalTarget, underfunded],
  );

  // Pinned categories feature
  const pinnedCategoriesEnabled = useFeatureFlag('enableMobileSummary');
  const { pinnedIds } = usePinnedCategories();
  const { grouped: categoryGroups, list: allCategories } = useCategories();

  const onSaveNotes = useCallback((id: string, notes: string) => {
    send('notes-save', { id, note: notes });
  }, []);

  const onOpenCategoryNotesModal = useCallback(
    (categoryId: string) => {
      const category = allCategories.find(c => c.id === categoryId);
      if (!category) return;

      dispatch(
        pushModal({
          modal: {
            name: 'notes',
            options: {
              id: categoryId,
              name: category.name,
              onSave: onSaveNotes,
            },
          },
        }),
      );
    },
    [allCategories, dispatch, onSaveNotes],
  );

  const onOpenBalanceModal = useCallback(
    (categoryId: string) => {
      const category = allCategories.find(c => c.id === categoryId);
      if (!category) return;

      dispatch(
        pushModal({
          modal: {
            name: 'envelope-balance-menu',
            options: {
              month: month,
              categoryId: categoryId,
              onCarryover: (carryover: boolean) => {
                console.warn('onCarryover handler not yet implemented');
              },
              onTransfer: () => {
                console.warn('onTransfer handler not yet implemented');
              },
              onCover: () => {
                console.warn('onCover handler not yet implemented');
              },
            },
          },
        }),
      );
    },
    [allCategories, month, dispatch],
  );

  // Sort categories by budget page order (expenses first by group, then income)
  const sortedPinnedCategories = useMemo(() => {
    if (pinnedIds.length === 0) {
      return [];
    }

    // Build a map of category ID to category for quick lookup
    const categoryMap = new Map(allCategories.map(cat => [cat.id, cat]));

    // Collect categories in budget page order
    const orderedCategories: typeof allCategories = [];

    // First, add expense categories in group order
    categoryGroups.forEach(group => {
      if (group.categories) {
        group.categories.forEach(cat => {
          if (categoryMap.has(cat.id)) {
            orderedCategories.push(categoryMap.get(cat.id)!);
          }
        });
      }
    });

    // Then, add income categories (those in allCategories but not in categoryGroups)
    const expenseCategoryIds = new Set(
      orderedCategories.map(cat => cat.id),
    );
    allCategories.forEach(cat => {
      if (!expenseCategoryIds.has(cat.id)) {
        orderedCategories.push(cat);
      }
    });

    // Filter to only pinned categories while preserving budget page order
    return orderedCategories
      .filter(cat => pinnedIds.includes(cat.id))
      .map(cat => ({
        categoryId: cat.id,
        categoryName: cat.name,
      }));
  }, [pinnedIds, categoryGroups, allCategories]);

  return (
    <>
      <SummaryTable data={summaryData} format={format} />
      {pinnedCategoriesEnabled && sortedPinnedCategories.length > 0 && (
        <PinnedCategoriesSectionWithBalances
          pinnedCategoryData={sortedPinnedCategories}
          format={format}
          onClickName={onOpenCategoryNotesModal}
          onClickBalance={onOpenBalanceModal}
        />
      )}
    </>
  );
}

interface PinnedCategoriesSectionWithBalancesProps {
  pinnedCategoryData: Array<{ categoryId: string; categoryName: string }>;
  format: ReturnType<typeof useFormat>;
  onClickName?: (categoryId: string) => void;
  onClickBalance?: (categoryId: string) => void;
}

function PinnedCategoriesSectionWithBalances({
  pinnedCategoryData,
  format,
  onClickName,
  onClickBalance,
}: PinnedCategoriesSectionWithBalancesProps) {
  const { t } = useTranslation();

  // For now, return a direct rendering with balance-fetching rows
  // This replaces the renderRows pattern from PinnedCategoriesSection
  if (pinnedCategoryData.length === 0) {
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
          marginTop: 8,
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
          {pinnedCategoryData.map((category) => (
            <PinnedCategoryRowWithBalance
              key={category.categoryId}
              categoryId={category.categoryId}
              categoryName={category.categoryName}
              format={format}
              onClickName={onClickName}
              onClickBalance={onClickBalance}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

interface PinnedCategoryRowWithBalanceProps {
  categoryId: string;
  categoryName: string;
  format: ReturnType<typeof useFormat>;
  pillStyle?: CSSProperties;
  onClickName?: (categoryId: string) => void;
  onClickBalance?: (categoryId: string) => void;
}

function PinnedCategoryRowWithBalance({
  categoryId,
  categoryName,
  format,
  pillStyle: pillStyleProp,
  onClickName,
  onClickBalance,
}: PinnedCategoryRowWithBalanceProps) {
  const balanceBinding = envelopeBudget.catBalance(categoryId);
  const balance = useSheetValue<'envelope-budget', typeof balanceBinding>(
    balanceBinding,
  );

  const ynabPillsEnabled = useFeatureFlag('ynabStyleMobilePills');
  const goalBinding = envelopeBudget.catGoal(categoryId);
  const goal = useSheetValue<'envelope-budget', typeof goalBinding>(
    goalBinding,
  );

  const budgetedBinding = envelopeBudget.catBudgeted(categoryId);
  const budgeted = useSheetValue<'envelope-budget', typeof budgetedBinding>(
    budgetedBinding,
  );

  // Generate pill style based on balance, goal, and budgeted values
  const textColorStyle = makeBalanceAmountStyle(
    balance ?? 0,
    goal,
    budgeted,
  );
  const pillStyle = ynabPillsEnabled
    ? makePillStyleFromTextColor(textColorStyle, false)
    : pillStyleProp;

  return (
    <PinnedCategoryRow
      categoryId={categoryId}
      categoryName={categoryName}
      balance={balance ?? 0}
      format={format}
      pillStyle={pillStyle}
      onClickName={onClickName}
      onClickBalance={onClickBalance}
    />
  );
}
