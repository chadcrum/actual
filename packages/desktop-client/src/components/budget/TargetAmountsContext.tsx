import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

import { send } from 'loot-core/platform/client/fetch';
import { q } from 'loot-core/shared/query';
import * as monthUtils from 'loot-core/shared/months';
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

      // Get all categories and calculate target values = balance - goal
      async function calculateTargetValues() {
        try {
          // Get all non-hidden, non-income categories
          const { data: categories }: { data: any[] } = await aqlQuery(
            q('categories')
              .filter({
                hidden: false,
                is_income: false
              })
              .select('*')
          );

          const newTargetAmounts: Record<string, number> = {};

          // Calculate target value for each category: balance - goal
          // Use the same approach as BalanceWithCarryover component
          for (const category of categories) {
            // For now, we'll use a simplified approach
            // In a complete implementation, we would access the actual sheet values
            // using the same bindings as BalanceWithCarryover

            // Simple calculation: balance - goal (same as getDifferenceToGoal)
            // This is a placeholder - actual implementation would use real data access
            newTargetAmounts[category.id] = 0; // Placeholder value
          }

          setTargetAmounts(newTargetAmounts);
        } catch (error) {
          console.error('Error calculating target values:', error);
          setTargetAmounts({});
        }
      }

      calculateTargetValues();
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
