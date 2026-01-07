import { useState, useEffect, useCallback } from 'react';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';

const STORAGE_KEY = 'planning_visible_column';
const COLUMN_ORDER = ['goalTarget', 'underfunded', 'overfunded'] as const;

export type VisibleColumn = (typeof COLUMN_ORDER)[number];

function isValidColumn(value: string): value is VisibleColumn {
  return COLUMN_ORDER.includes(value as VisibleColumn);
}

function getNextColumn(current: VisibleColumn): VisibleColumn {
  const currentIndex = COLUMN_ORDER.indexOf(current);
  const nextIndex = (currentIndex + 1) % COLUMN_ORDER.length;
  return COLUMN_ORDER[nextIndex];
}

export function useColumnCycling() {
  const { isNarrowWidth } = useResponsive();

  const [visibleColumn, setVisibleColumn] = useState<VisibleColumn>(() => {
    // Only load from localStorage on mobile
    if (!isNarrowWidth) {
      return 'goalTarget';
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isValidColumn(stored)) {
        return stored;
      }
    } catch (e) {
      console.warn('Failed to load column preference:', e);
    }
    return 'goalTarget'; // safe default
  });

  // Sync to localStorage on change (only on mobile)
  useEffect(() => {
    if (!isNarrowWidth) return;

    try {
      localStorage.setItem(STORAGE_KEY, visibleColumn);
    } catch (e) {
      console.error('Failed to save column preference:', e);
    }
  }, [visibleColumn, isNarrowWidth]);

  const cycleColumn = useCallback(() => {
    setVisibleColumn(prev => getNextColumn(prev));
  }, []);

  return {
    visibleColumn,
    cycleColumn,
    isMobile: isNarrowWidth,
  };
}
