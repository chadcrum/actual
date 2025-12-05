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
      // Calculate target values using getDifferenceToGoal formula
      // Matches BalanceWithCarryover component:
      // longGoalValue === 1 ? balance - goal : budgeted - goal
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

          // Get budget month data which includes all category values
          const budgetMonthData = await send('api/budget-month', { month });
          const categoryGroups = budgetMonthData?.categoryGroups || [];

          // Build a map of category ID -> budget data for quick lookup
          const categoryDataMap: Record<string, any> = {};
          for (const group of categoryGroups) {
            if ((group as any).categories && Array.isArray((group as any).categories)) {
              for (const cat of (group as any).categories) {
                categoryDataMap[(cat as any).id] = cat;
              }
            }
          }

          // Calculate target value for each category
          for (const category of categories) {
            try {
              const catData = categoryDataMap[category.id];
              
              if (catData) {
                const { balance = 0, goal = 0, budgeted = 0, longGoal = 0 } = catData;
                
                // Apply getDifferenceToGoal formula from BalanceWithCarryover
                const targetValue = longGoal === 1 
                  ? balance - goal        // Long goal: balance - goal
                  : budgeted - goal;      // Template goal: budgeted - goal
                
                newTargetAmounts[category.id] = targetValue;
              } else {
                newTargetAmounts[category.id] = 0;
              }
            } catch (err) {
              console.warn(`Error calculating data for category ${category.id}:`, err);
              newTargetAmounts[category.id] = 0;
            }
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
