import React, { memo } from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import { GoalColumn } from './GoalColumn';
import { GoalGroupColumn } from './GoalGroupColumn';
import { GoalHeader } from './GoalHeader';
import { UnderfundedColumn } from './UnderfundedColumn';
import { UnderfundedGroupColumn } from './UnderfundedGroupColumn';
import { UnderfundedHeader } from './UnderfundedHeader';

import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

/**
 * Props for the BudgetMonthColumns component.
 */
type BudgetMonthColumnsProps = {
  /** The month string (e.g., "2024-01") */
  month: string;
  /** Category ID for category-type columns */
  categoryId?: string;
  /** Group ID for group-type columns */
  groupId?: string;
  /** The type of column to render */
  type: 'category' | 'group' | 'header';
  /** The column type to return (goal or underfunded) */
  columnType?: 'goal' | 'underfunded';
};

/**
 * BudgetMonthColumns - Seam component for the Budget Detailed View feature.
 *
 * This component acts as the architectural seam that controls when the Goal column
 * is displayed. It checks feature flags, user preferences, and responsive state
 * to determine whether to render the Goal column components.
 *
 * Fork Compliance:
 * - Seam exists independently of feature flags (structural boundary)
 * - Feature flags gate behavior inside the seam, not the seam itself
 * - When disabled, returns null (identical to upstream behavior)
 * - No forking of code paths - just conditional rendering
 *
 * @param props - Component props
 * @returns Goal column component or null if disabled
 */
export const BudgetMonthColumns = memo(function BudgetMonthColumns({
  month,
  categoryId,
  groupId,
  type,
  columnType = 'goal',
}: BudgetMonthColumnsProps) {
  const isFeatureEnabled = useFeatureFlag('budget-detailed-view');
  const [detailedViewEnabled] = useSyncedPref('budget.detailed-view-enabled');
  const { isNarrowWidth } = useResponsive();

  const showGoalColumn =
    isFeatureEnabled && detailedViewEnabled === 'true' && !isNarrowWidth;

  const showUnderfundedColumn =
    isFeatureEnabled && detailedViewEnabled === 'true' && !isNarrowWidth;

  if (columnType === 'underfunded' && showUnderfundedColumn) {
    if (type === 'header') {
      return <UnderfundedHeader month={month} />;
    }

    if (type === 'group' && groupId) {
      return <UnderfundedGroupColumn groupId={groupId} month={month} />;
    }

    if (type === 'category' && categoryId) {
      return <UnderfundedColumn categoryId={categoryId} month={month} />;
    }
  } else if (columnType === 'goal' && showGoalColumn) {
    if (type === 'header') {
      return <GoalHeader month={month} />;
    }

    if (type === 'group' && groupId) {
      return <GoalGroupColumn groupId={groupId} month={month} />;
    }

    if (type === 'category' && categoryId) {
      return <GoalColumn categoryId={categoryId} />;
    }
  }

  return null;
});
