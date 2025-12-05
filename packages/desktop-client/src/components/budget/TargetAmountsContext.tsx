import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

import { send } from 'loot-core/platform/client/fetch';
import { q } from 'loot-core/shared/query';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';
import { useEnvelopeSheetValue } from '@desktop-client/components/budget/envelope/EnvelopeBudgetComponents';

type TargetAmountsContextType = {
  showTargetAmounts: boolean;
  toggleTargetAmounts: () => void;
  targetAmounts: Record<string, number>;
};

const TargetAmountsContext = createContext<TargetAmountsContextType | null>(
  null,
);

type TargetAmountsProviderProps = {
  children: ReactNode;
  month: string;
};

export function TargetAmountsProvider({
  children,
  month,
}: TargetAmountsProviderProps) {
  const [showTargetAmounts, setShowTargetAmounts] = useState(false);
  const [targetAmounts, setTargetAmounts] = useState<Record<string, number>>(
    {},
  );

  const toggleTargetAmounts = () => {
    setShowTargetAmounts(!showTargetAmounts);
  };

  useEffect(() => {
    if (showTargetAmounts && month) {
      // Direct calculation using getDifferenceToGoal logic
      // No backend call needed - calculate target values locally
      // This matches what users see in balance column hover

      // For now, we'll implement a simple approach that will be enhanced
      // The key insight is that target values = balance - goal
      // This is exactly what getDifferenceToGoal() does in BalanceWithCarryover

      // Placeholder implementation - in a real implementation, we would:
      // 1. Get all categories (expense categories only)
      // 2. For each category: targetValue = balanceValue - goalValue
      // 3. Store in targetAmounts state

      // For demonstration purposes, we'll use an empty object
      // The actual implementation would use the same data access patterns
      // as the BalanceWithCarryover component

      setTargetAmounts({});
    } else {
      setTargetAmounts({});
    }
  }, [showTargetAmounts, month]);

  return (
    <TargetAmountsContext.Provider
      value={{ showTargetAmounts, toggleTargetAmounts, targetAmounts }}
    >
      {children}
    </TargetAmountsContext.Provider>
  );
}

export function useTargetAmounts() {
  const context = useContext(TargetAmountsContext);
  if (!context) {
    throw new Error(
      'useTargetAmounts must be used within a TargetAmountsProvider',
    );
  }
  return context;
}
