import { useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'planning_selected_categories';

interface CheckboxState {
  [categoryId: string]: boolean;
}

export function useCheckboxState(allCategoryIds: string[]) {
  const [selectedCategories, setSelectedCategories] = useState<CheckboxState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load planning checkbox state:', e);
    }
    // Default: all categories selected
    return allCategoryIds.reduce((acc, id) => {
      acc[id] = true;
      return acc;
    }, {} as CheckboxState);
  });

  // Sync to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCategories));
    } catch (e) {
      console.error('Failed to save planning checkbox state:', e);
    }
  }, [selectedCategories]);

  // Ensure new categories default to selected
  useEffect(() => {
    setSelectedCategories(prev => {
      const updated = { ...prev };
      let hasChanges = false;

      allCategoryIds.forEach(id => {
        if (!(id in updated)) {
          updated[id] = true;
          hasChanges = true;
        }
      });

      return hasChanges ? updated : prev;
    });
  }, [allCategoryIds]);

  const toggleCategory = useCallback((categoryId: string) => {
    setSelectedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  const toggleGroup = useCallback((categoryIds: string[]) => {
    setSelectedCategories(prev => {
      // Check if all are currently selected
      const allSelected = categoryIds.every(id => prev[id]);
      const newValue = !allSelected;

      const updated = { ...prev };
      categoryIds.forEach(id => {
        updated[id] = newValue;
      });
      return updated;
    });
  }, []);

  const toggleAll = useCallback((allIds: string[]) => {
    setSelectedCategories(prev => {
      const allSelected = allIds.every(id => prev[id]);
      const newValue = !allSelected;

      const updated = { ...prev };
      allIds.forEach(id => {
        updated[id] = newValue;
      });
      return updated;
    });
  }, []);

  const isSelected = useCallback((categoryId: string) => {
    return selectedCategories[categoryId] ?? true;
  }, [selectedCategories]);

  const getGroupCheckboxState = useCallback((categoryIds: string[]): 'checked' | 'unchecked' | 'indeterminate' => {
    const selected = categoryIds.filter(id => selectedCategories[id] ?? true);
    if (selected.length === 0) return 'unchecked';
    if (selected.length === categoryIds.length) return 'checked';
    return 'indeterminate';
  }, [selectedCategories]);

  return {
    selectedCategories,
    toggleCategory,
    toggleGroup,
    toggleAll,
    isSelected,
    getGroupCheckboxState,
  };
}
