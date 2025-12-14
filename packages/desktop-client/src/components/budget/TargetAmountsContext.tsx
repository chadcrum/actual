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
import { useLocalPref } from '../../hooks/useLocalPref';

type TargetAmountsContextType = {
  showTargetAmounts: boolean;
  toggleTargetAmounts: () => void;
  targetAmounts: Record<string, Record<string, { goal: number; difference: number } | undefined>>;
  totalGoal: number;
  totalUnderfunded: number;
  totalOverfunded: number;
};

const TargetAmountsContext = createContext<TargetAmountsContextType | null>(
  null,
);

type TargetAmountsProviderProps = {
  children: ReactNode;
  months: string[];
};

export function TargetAmountsProvider({
  children,
  months,
}: TargetAmountsProviderProps) {
  const [showTargetAmountsPref, setShowTargetAmountsPref] = useLocalPref('budget.showTargetAmounts');
  const showTargetAmounts = (showTargetAmountsPref as boolean) ?? false;
  const setShowTargetAmounts = setShowTargetAmountsPref;
  const [targetAmounts, setTargetAmounts] = useState<Record<string, Record<string, { goal: number; difference: number } | undefined>>>(
    {},
  );
  const [totalGoal, setTotalGoal] = useState<number>(0);
  const [totalUnderfunded, setTotalUnderfunded] = useState<number>(0);
  const [totalOverfunded, setTotalOverfunded] = useState<number>(0);

  const toggleTargetAmounts = () => {
    setShowTargetAmounts(!showTargetAmounts);
  };

  useEffect(() => {
    // If no months are provided, reset everything
    if (!months || months.length === 0) {
      setTargetAmounts({});
      setTotalGoal(0);
      setTotalUnderfunded(0);
      setTotalOverfunded(0);
      return;
    }

    // Only calculate if needed (though we might want to pre-calculate always if this context is always mounted)
    // For now, let's calculate if we have months, assuming we want the data ready or if showTargetAmounts is true.
    // However, to save perf, maybe we only calculate if showTargetAmounts is true?
    // The previous implementation used `if (month)` which suggests it ran whenever month was present.
    // But let's check if we should gate it on `showTargetAmounts`.
    // The previous implementation had `[showTargetAmounts, month]` as deps and `if (month)`.
    // It didn't explicitly check `showTargetAmounts` inside `if (month)`, but `targetTotal` calculation used `showTargetAmounts`.
    // Actually, `calculateTargetValues` was called inside the effect. 
    // Wait, the previous implementation did:
    // useEffect(() => { if (month) { calculateTargetValues() } else { ... } }, [showTargetAmounts, month])
    // But `calculateTargetValues` didn't check `showTargetAmounts` before fetching data.
    // EXCEPT, `TargetAmountsProvider` on mobile sits behind a `showMore` check which implies user interaction.
    // On desktop, we want this to be available when the toggle is ON.
    if (!showTargetAmounts) {
      setTargetAmounts({});
      return;
    }

    let mounted = true;

    async function calculateAllTargetValues() {
      const allTargetAmounts: Record<string, Record<string, { goal: number; difference: number } | undefined>> = {};
      let allTotalGoal = 0;
      let allTotalUnderfunded = 0;
      let allTotalOverfunded = 0;

      await Promise.all(months.map(async (month) => {
        if (!mounted) return;
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

          const monthTargetAmounts: Record<string, { goal: number; difference: number } | undefined> = {};

          // Calculate target value for each category
          for (const category of categories) {
            const budgetData = budgetDataMap[category.id];
            const goalData = budgetGoalMap[category.id];

            if (budgetData) {
              const balance = budgetData.balance ?? 0;
              const budgeted = budgetData.budgeted ?? 0;
              const goal = goalData?.goal ?? 0;
              const longGoal = goalData?.long_goal ?? 0;

              // If no goal is set, show N/A (use undefined)
              if (goal === null || goal === undefined || goal === 0) {
                monthTargetAmounts[category.id] = undefined;
              } else {
                const difference = longGoal === 1
                  ? balance - goal
                  : budgeted - goal;

                monthTargetAmounts[category.id] = { goal, difference };
              }
            } else {
              monthTargetAmounts[category.id] = undefined;
            }
          }

          allTargetAmounts[month] = monthTargetAmounts;

          // Calculate totals for this month
          for (const category of categories) {
            const goalData = budgetGoalMap[category.id];
            allTotalGoal += goalData?.goal ?? 0;
          }

          for (const amount of Object.values(monthTargetAmounts)) {
            if (amount !== undefined) {
              if (amount.difference < 0) {
                allTotalUnderfunded += amount.difference;
              } else if (amount.difference > 0) {
                allTotalOverfunded += amount.difference; // Still keep overfunded logic if desired, though usually only underfunded is key
              }
            }
          }

        } catch (error) {
          console.error(`Error calculating target values for ${month}:`, error);
          allTargetAmounts[month] = {};
        }
      }));

      if (mounted) {
        setTargetAmounts(allTargetAmounts);
        setTotalGoal(allTotalGoal);
        setTotalUnderfunded(allTotalUnderfunded);
        setTotalOverfunded(allTotalOverfunded);
      }
    }

    calculateAllTargetValues();

    return () => {
      mounted = false;
    };
  }, [showTargetAmounts, months]); // Re-run if months array changes or toggle changes

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
