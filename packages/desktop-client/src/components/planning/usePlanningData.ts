import { useMemo } from 'react';

export function usePlanningData() {
  return useMemo(() => {
    return {
      categories: [],
      groups: [],
    };
  }, []);
}
