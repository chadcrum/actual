import { createContext, useContext, useState, type ReactNode } from 'react';

type TargetAmountsContextType = {
  showTargetAmounts: boolean;
  toggleTargetAmounts: () => void;
};

const TargetAmountsContext = createContext<TargetAmountsContextType | null>(
  null,
);

export function TargetAmountsProvider({ children }: { children: ReactNode }) {
  const [showTargetAmounts, setShowTargetAmounts] = useState(false);

  const toggleTargetAmounts = () => {
    setShowTargetAmounts(!showTargetAmounts);
  };

  return (
    <TargetAmountsContext.Provider
      value={{ showTargetAmounts, toggleTargetAmounts }}
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
