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
  targetAmounts: Record<string, number | undefined>;
  totalGoal: number;
  totalUnderfunded: number;
  totalOverfunded: number;
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
  const [targetAmounts, setTargetAmounts] = useState<Record<string, number | undefined>>(
    {},
  );
  const [totalGoal, setTotalGoal] = useState<number>(0);
  const [totalUnderfunded, setTotalUnderfunded] = useState<number>(0);
  const [totalOverfunded, setTotalOverfunded] = useState<number>(0);

  const toggleTargetAmounts = () => {
    setShowTargetAmounts(!showTargetAmounts);
  };

  useEffect(() => {
    if (month) {
      // Calculate target values using getDifferenceToGoal formula
      // Matches BalanceWithCarryover component:
      // longGoalValue === 1 ? balance - goal : budgeted - goal
      async function calculateTargetValues() {
        try {
          // Parse month to get month number for query (format: YYYY-MM)
          const monthNum = parseInt(month.replace('-', ''));

          // Get all non-hidden, non-income categories
          const { data: categories }: { data: any[] } = await aqlQuery(
            q('categories')
              .filter({
                hidden: false,
                is_income: false
              })
              .select('*')
          );

          // Get goal and long_goal values from zero_budgets table for this month
          const { data: budgets }: { data: any[] } = await aqlQuery(
            q('zero_budgets')
              .filter({ month: monthNum })
              .select('*')
          );

          // Get budget month data which includes budget/balance for each category
          const budgetMonthData = await send('api/budget-month', { month });
          const categoryGroups = budgetMonthData?.categoryGroups || [];

          // Build a map of category ID -> budget data (balance, budgeted) for quick lookup
          const budgetDataMap: Record<string, any> = {};
          for (const group of categoryGroups) {
            if ((group as any).categories && Array.isArray((group as any).categories)) {
              for (const cat of (group as any).categories) {
                budgetDataMap[(cat as any).id] = cat;
              }
            }
          }

          // Build a map of category ID -> goal/longGoal data from budgets table
          const budgetGoalMap: Record<string, any> = {};
          for (const budget of budgets) {
            budgetGoalMap[budget.category] = {
              goal: budget.goal ?? 0,
              long_goal: budget.long_goal ?? 0
            };
          }

          const newTargetAmounts: Record<string, number | undefined> = {};

          // Calculate target value for each category
          for (const category of categories) {
            try {
              const budgetData = budgetDataMap[category.id];
              const goalData = budgetGoalMap[category.id];

              if (budgetData) {
                const balance = budgetData.balance ?? 0;
                const budgeted = budgetData.budgeted ?? 0;
                const goal = goalData?.goal ?? 0;
                const longGoal = goalData?.long_goal ?? 0;

                // If no goal is set, show N/A (use undefined)
                if (goal === null || goal === undefined || goal === 0) {
                  newTargetAmounts[category.id] = undefined;
                } else {
                  // Apply getDifferenceToGoal formula from BalanceWithCarryover
                  // This matches exactly what the balance hover shows
                  const targetValue = longGoal === 1
                    ? balance - goal        // Long goal: balance - goal
                    : budgeted - goal;      // Template goal: budgeted - goal

                  newTargetAmounts[category.id] = targetValue;
                }
              } else {
                newTargetAmounts[category.id] = undefined;
              }
            } catch (err) {
              console.warn(`Error calculating data for category ${category.id}:`, err);
              newTargetAmounts[category.id] = undefined;
            }
          }

          console.log('Target amounts calculated:', newTargetAmounts);

          setTargetAmounts(newTargetAmounts);

          // Calculate total goal: sum of all budget goals for the month for visible categories
          let totalGoalAmount = 0;
          for (const category of categories) {
            const goalData = budgetGoalMap[category.id];
            totalGoalAmount += goalData?.goal ?? 0;
          }
          setTotalGoal(totalGoalAmount);


          // Calculate total underfunded and overfunded
          let totalUnderfundedAmount = 0;
          let totalOverfundedAmount = 0;
          for (const amount of Object.values(newTargetAmounts)) {
            if (amount !== undefined) {
              if (amount < 0) {
                totalUnderfundedAmount += amount;
              } else if (amount > 0) {
                totalOverfundedAmount += amount;
              }
            }
          }
          setTotalUnderfunded(totalUnderfundedAmount);
          setTotalOverfunded(totalOverfundedAmount);
        } catch (error) {
          console.error('Error calculating target values:', error);
          setTargetAmounts({});
          setTotalGoal(0);
          setTotalUnderfunded(0);
          setTotalOverfunded(0);
        }
      }

      calculateTargetValues();
    } else {
      setTargetAmounts({});
      setTotalGoal(0);
    }
  }, [showTargetAmounts, month]);

  return (
    <TargetAmountsContext.Provider
      value={{ showTargetAmounts, toggleTargetAmounts, targetAmounts, totalGoal, totalUnderfunded, totalOverfunded }}
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
