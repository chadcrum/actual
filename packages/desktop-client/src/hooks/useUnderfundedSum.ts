import { useGoalFundingStatus } from './useGoalFundingStatus';

/**
 * Calculates the total underfunded amount across all visible expense categories.
 *
 * @param month The month string (e.g., "2024-01") to calculate underfunded sum for
 * @returns The total underfunded amount across all categories
 */
export function useUnderfundedSum(month: string): number {
  const { underfunded } = useGoalFundingStatus(month);
  return underfunded;
}
