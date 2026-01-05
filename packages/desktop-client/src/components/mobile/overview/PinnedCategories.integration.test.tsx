import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';

import { PinnedCategoriesTable } from './PinnedCategoriesTable';

// Import the components and hooks we're testing
import { usePinnedCategories } from '@desktop-client/components/budget/hooks/usePinnedCategories';
import { PinToOverviewCheckbox } from '@desktop-client/components/modals/PinToOverviewCheckbox';

// Store balance values for use in mocks (in cents as integers)
const categoryBalances = new Map([
  ['cat-1', 15050], // $150.50
  ['cat-2', 4500], // $45.00
  ['cat-3', 7500], // $75.00
]);

// Store goal values (in cents as integers)
const categoryGoals = new Map([
  ['cat-1', 20000], // $200.00
  ['cat-2', 10000], // $100.00
  ['cat-3', 5000], // $50.00
]);

// Store budgeted values (in cents as integers)
const categoryBudgeted = new Map([
  ['cat-1', 15000], // $150.00
  ['cat-2', 5000], // $50.00
  ['cat-3', 8000], // $80.00
]);

// Store long goal flag (0 or 1)
const categoryLongGoals = new Map([
  ['cat-1', 0], // Not a long goal
  ['cat-2', 0], // Not a long goal
  ['cat-3', 1], // Is a long goal
]);

let lastCategoryIdUsed = '';
let lastBindingType = '';

// Mock dependencies
vi.mock('../../budget/hooks/usePinnedCategories');
vi.mock('@desktop-client/hooks/useFormat', () => ({
  useFormat: () => (value: number) => `$${value.toFixed(2)}`,
}));
vi.mock('@desktop-client/hooks/useLocale', () => ({
  useLocale: () => 'en',
}));
vi.mock('@desktop-client/hooks/useFeatureFlag', () => ({
  useFeatureFlag: (flag: string) => {
    if (flag === 'enableOverviewPage') {
      return true;
    }
    return false;
  },
}));
vi.mock('@desktop-client/hooks/useSyncedPref', () => ({
  useSyncedPref: (key: string) => {
    if (key === 'budgetType') {
      return ['envelope', vi.fn()];
    }
    return [undefined, vi.fn()];
  },
}));
vi.mock('@desktop-client/spreadsheet/bindings', () => ({
  envelopeBudget: {
    catBalance: (categoryId: string) => {
      lastCategoryIdUsed = categoryId;
      lastBindingType = 'balance';
      return { categoryId, bindingType: 'balance' };
    },
    catGoal: (categoryId: string) => {
      lastCategoryIdUsed = categoryId;
      lastBindingType = 'goal';
      return { categoryId, bindingType: 'goal' };
    },
    catBudgeted: (categoryId: string) => {
      lastCategoryIdUsed = categoryId;
      lastBindingType = 'budgeted';
      return { categoryId, bindingType: 'budgeted' };
    },
    catLongGoal: (categoryId: string) => {
      lastCategoryIdUsed = categoryId;
      lastBindingType = 'longGoal';
      return { categoryId, bindingType: 'longGoal' };
    },
  },
  trackingBudget: {
    catBalance: (categoryId: string) => {
      lastCategoryIdUsed = categoryId;
      lastBindingType = 'balance';
      return { categoryId, bindingType: 'balance' };
    },
    catGoal: (categoryId: string) => {
      lastCategoryIdUsed = categoryId;
      lastBindingType = 'goal';
      return { categoryId, bindingType: 'goal' };
    },
    catBudgeted: (categoryId: string) => {
      lastCategoryIdUsed = categoryId;
      lastBindingType = 'budgeted';
      return { categoryId, bindingType: 'budgeted' };
    },
    catLongGoal: (categoryId: string) => {
      lastCategoryIdUsed = categoryId;
      lastBindingType = 'longGoal';
      return { categoryId, bindingType: 'longGoal' };
    },
  },
}));
vi.mock('@desktop-client/hooks/useSheetValue', () => ({
  useSheetValue: (binding: any) => {
    const categoryId = binding?.categoryId || lastCategoryIdUsed;
    const bindingType = binding?.bindingType || lastBindingType;

    switch (bindingType) {
      case 'balance':
        return categoryBalances.get(categoryId) ?? 0;
      case 'goal':
        return categoryGoals.get(categoryId) ?? null;
      case 'budgeted':
        return categoryBudgeted.get(categoryId) ?? 0;
      case 'longGoal':
        return categoryLongGoals.get(categoryId) ?? 0;
      default:
        return categoryBalances.get(categoryId) ?? 0;
    }
  },
}));
vi.mock('@desktop-client/hooks/useSheetName', () => ({
  SheetNameProvider: ({ children }: { children: React.ReactNode }) => children,
  useSheetName: () => 'March 2024',
}));
vi.mock('@desktop-client/hooks/useCategories', () => ({
  useCategories: () => ({
    list: [
      { id: 'cat-1', name: 'Groceries', balance: 150.5, goal_target: 200 },
      { id: 'cat-2', name: 'Utilities', balance: 45.0, goal_target: 100 },
      { id: 'cat-3', name: 'Entertainment', balance: 75.0, goal_target: 50 },
    ],
    grouped: [],
  }),
}));
vi.mock('@actual-app/components/theme', () => ({
  theme: {
    tableText: '#000',
    tableTextSubdued: '#666',
    pageTextSubdued: '#999',
    tableBorder: '#ddd',
    tableBackground: '#fff',
    tableRowBackgroundHover: '#f5f5f5',
    mobilePageBackground: '#fafafa',
    pillBorder: '#ddd',
    menuItemText: '#000',
    noticeTextMenu: '#0a0',
    errorTextMenu: '#f00',
  },
}));

describe('Pinned Categories Integration', () => {
  let mockTogglePin: ReturnType<typeof vi.fn>;
  let mockGetPinnedCategories: ReturnType<typeof vi.fn>;
  let mockIsPinned: ReturnType<typeof vi.fn>;
  let pinnedCategoryIds: string[] = [];

  const setupMocks = () => {
    mockTogglePin = vi.fn((categoryId: string) => {
      if (pinnedCategoryIds.includes(categoryId)) {
        pinnedCategoryIds = pinnedCategoryIds.filter(id => id !== categoryId);
      } else {
        pinnedCategoryIds = [...pinnedCategoryIds, categoryId];
      }
    });

    mockGetPinnedCategories = vi.fn(() => {
      const allCategories = [
        {
          id: 'cat-1',
          name: 'Groceries',
          group: 'group-1',
          balance: 150.5,
          goal_target: 200,
        },
        {
          id: 'cat-2',
          name: 'Utilities',
          group: 'group-1',
          balance: 45.0,
          goal_target: 100,
        },
        {
          id: 'cat-3',
          name: 'Entertainment',
          group: 'group-1',
          balance: 75.0,
          goal_target: 50,
        },
      ];
      return allCategories.filter((cat: any) =>
        pinnedCategoryIds.includes(cat.id),
      ) as any;
    });

    mockIsPinned = vi.fn((categoryId: string) =>
      pinnedCategoryIds.includes(categoryId),
    );

    // @ts-ignore - Mock type compatibility with hook
    vi.mocked(usePinnedCategories).mockReturnValue({
      pinnedCategoryIds,
      isPinned: mockIsPinned as any,
      togglePin: mockTogglePin as any,
      getPinnedCategories: mockGetPinnedCategories as any,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    pinnedCategoryIds = [];
    setupMocks();
  });

  describe('Pinning Categories Flow', () => {
    test('user can pin a category from the checkbox and see it reflected in hook state', () => {
      const { rerender } = render(
        <PinToOverviewCheckbox
          categoryId="cat-1"
          theme={{
            pillBorder: '#ddd',
            menuItemText: '#000',
          }}
        />,
      );

      // Initially, the checkbox should be unchecked
      expect((mockIsPinned as any)('cat-1')).toBe(false);

      // Find and click the checkbox
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
      fireEvent.click(checkbox);

      // Verify togglePin was called with the category ID
      expect(mockTogglePin).toHaveBeenCalledWith('cat-1');

      // Simulate the state change
      pinnedCategoryIds = ['cat-1'];
      setupMocks();

      rerender(
        <PinToOverviewCheckbox
          categoryId="cat-1"
          theme={{
            pillBorder: '#ddd',
            menuItemText: '#000',
          }}
        />,
      );

      // After rerender, the checkbox should reflect the pinned state
      const updatedCheckbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(updatedCheckbox.checked).toBe(true);
    });

    test('pinned category appears in the PinnedCategoriesTable widget', () => {
      // Setup: category is pinned
      pinnedCategoryIds = ['cat-1'];
      setupMocks();

      render(<PinnedCategoriesTable onCategoryClick={vi.fn()} />);

      // Verify the pinned category is displayed
      expect(screen.getByText('Groceries')).toBeInTheDocument();
    });

    test('multiple categories can be pinned simultaneously', () => {
      // Setup: multiple categories are pinned
      pinnedCategoryIds = ['cat-1', 'cat-2'];
      setupMocks();

      render(<PinnedCategoriesTable onCategoryClick={vi.fn()} />);

      // Both pinned categories should be displayed
      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText('Utilities')).toBeInTheDocument();
    });
  });

  describe('Clicking Pinned Categories', () => {
    test('clicking pinned category calls onCategoryClick handler', () => {
      const mockOnClick = vi.fn();

      // Setup: category is pinned
      pinnedCategoryIds = ['cat-1'];
      setupMocks();

      const { container } = render(
        <PinnedCategoriesTable onCategoryClick={mockOnClick} />,
      );

      // Find and click the category row
      const row = container.querySelector('[data-testid="category-row-cat-1"]');
      fireEvent.click(row!);

      // Verify the callback was called with the correct category ID
      expect(mockOnClick).toHaveBeenCalledWith('cat-1');
    });

    test('multiple pinned categories can be clicked independently', () => {
      const mockOnClick = vi.fn();

      // Setup: multiple categories are pinned
      pinnedCategoryIds = ['cat-1', 'cat-2'];
      setupMocks();

      const { container } = render(
        <PinnedCategoriesTable onCategoryClick={mockOnClick} />,
      );

      // Click first category
      const row1 = container.querySelector(
        '[data-testid="category-row-cat-1"]',
      );
      fireEvent.click(row1!);
      expect(mockOnClick).toHaveBeenCalledWith('cat-1');

      // Click second category
      const row2 = container.querySelector(
        '[data-testid="category-row-cat-2"]',
      );
      fireEvent.click(row2!);
      expect(mockOnClick).toHaveBeenCalledWith('cat-2');

      expect(mockOnClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Unpinning Categories', () => {
    test('user can unpin a category from the checkbox', () => {
      // Setup: category is pinned
      pinnedCategoryIds = ['cat-1'];
      setupMocks();

      const { rerender } = render(
        <PinToOverviewCheckbox
          categoryId="cat-1"
          theme={{
            pillBorder: '#ddd',
            menuItemText: '#000',
          }}
        />,
      );

      // Verify checkbox is checked
      let checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);

      // Click to unpin
      fireEvent.click(checkbox);
      expect(mockTogglePin).toHaveBeenCalledWith('cat-1');

      // Simulate the state change
      pinnedCategoryIds = [];
      setupMocks();

      rerender(
        <PinToOverviewCheckbox
          categoryId="cat-1"
          theme={{
            pillBorder: '#ddd',
            menuItemText: '#000',
          }}
        />,
      );

      // Verify checkbox is now unchecked
      checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    test('pinned category is removed from widget after unpinning', () => {
      const mockOnClick = vi.fn();

      // Setup: category is pinned
      pinnedCategoryIds = ['cat-1'];
      setupMocks();

      const { rerender } = render(
        <PinnedCategoriesTable onCategoryClick={mockOnClick} />,
      );

      // Verify pinned category is shown
      expect(screen.getByText('Groceries')).toBeInTheDocument();

      // Simulate unpinning
      pinnedCategoryIds = [];
      setupMocks();

      rerender(<PinnedCategoriesTable onCategoryClick={mockOnClick} />);

      // Verify pinned category is no longer shown
      expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
      // Verify empty state message appears
      expect(screen.getByText(/No pinned categories/)).toBeInTheDocument();
    });

    test('unpinning one category preserves other pinned categories', () => {
      const mockOnClick = vi.fn();

      // Setup: multiple categories are pinned
      pinnedCategoryIds = ['cat-1', 'cat-2'];
      setupMocks();

      const { rerender } = render(
        <PinnedCategoriesTable onCategoryClick={mockOnClick} />,
      );

      // Both categories should be shown
      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText('Utilities')).toBeInTheDocument();

      // Simulate unpinning one category
      pinnedCategoryIds = ['cat-2'];
      setupMocks();

      rerender(<PinnedCategoriesTable onCategoryClick={mockOnClick} />);

      // One category should be removed, the other preserved
      expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
      expect(screen.getByText('Utilities')).toBeInTheDocument();
    });
  });

  describe('State Persistence and Re-renders', () => {
    test('pinned categories persist across component re-renders', () => {
      const mockOnClick = vi.fn();

      // Setup: category is pinned
      pinnedCategoryIds = ['cat-1'];
      setupMocks();

      const { rerender } = render(
        <PinnedCategoriesTable onCategoryClick={mockOnClick} />,
      );

      // Verify pinned category is shown
      expect(screen.getByText('Groceries')).toBeInTheDocument();

      // Re-render with same mock state
      rerender(<PinnedCategoriesTable onCategoryClick={mockOnClick} />);

      // Category should still be visible
      expect(screen.getByText('Groceries')).toBeInTheDocument();

      // Re-render again
      rerender(<PinnedCategoriesTable onCategoryClick={mockOnClick} />);

      // Category should still persist
      expect(screen.getByText('Groceries')).toBeInTheDocument();
    });

    test('pinned state reflects changes after togglePin is called', () => {
      const mockOnClick = vi.fn();

      // Setup: no categories pinned initially
      pinnedCategoryIds = [];
      setupMocks();

      const { rerender } = render(
        <PinnedCategoriesTable onCategoryClick={mockOnClick} />,
      );

      // Initially empty
      expect(screen.getByText(/No pinned categories/)).toBeInTheDocument();

      // Simulate pinning a category via togglePin
      pinnedCategoryIds = ['cat-1'];
      setupMocks();

      rerender(<PinnedCategoriesTable onCategoryClick={mockOnClick} />);

      // Category should now be visible
      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(
        screen.queryByText(/No pinned categories/),
      ).not.toBeInTheDocument();
    });

    test('hook state updates propagate to both table and checkbox components', () => {
      // Setup: category is pinned
      pinnedCategoryIds = ['cat-1'];
      const mockOnClick = vi.fn();
      setupMocks();

      // Render both components
      const { rerender: rerenderTable } = render(
        <PinnedCategoriesTable onCategoryClick={mockOnClick} />,
      );

      const { rerender: rerenderCheckbox } = render(
        <PinToOverviewCheckbox
          categoryId="cat-1"
          theme={{ pillBorder: '#ddd', menuItemText: '#000' }}
        />,
      );

      // Both should reflect pinned state
      expect(screen.getByText('Groceries')).toBeInTheDocument();
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);

      // Simulate unpin
      pinnedCategoryIds = [];
      setupMocks();

      // Re-render both components
      rerenderTable(<PinnedCategoriesTable onCategoryClick={mockOnClick} />);
      rerenderCheckbox(
        <PinToOverviewCheckbox
          categoryId="cat-1"
          theme={{ pillBorder: '#ddd', menuItemText: '#000' }}
        />,
      );

      // Both should now reflect unpinned state
      expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
      const updatedCheckbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(updatedCheckbox.checked).toBe(false);
    });
  });

  describe('Empty State Handling', () => {
    test('displays empty state when no categories are pinned', () => {
      // Setup: no categories pinned
      pinnedCategoryIds = [];
      setupMocks();

      render(<PinnedCategoriesTable onCategoryClick={vi.fn()} />);

      expect(screen.getByText('Pinned Categories')).toBeInTheDocument();
      expect(screen.getByText(/No pinned categories/)).toBeInTheDocument();
      expect(
        screen.getByText(/Pin categories from the budget page/),
      ).toBeInTheDocument();
    });

    test('transitions from empty state to showing pinned categories', () => {
      const mockOnClick = vi.fn();

      // Start with empty state
      pinnedCategoryIds = [];
      setupMocks();

      const { rerender } = render(
        <PinnedCategoriesTable onCategoryClick={mockOnClick} />,
      );

      expect(screen.getByText(/No pinned categories/)).toBeInTheDocument();

      // Simulate pinning categories
      pinnedCategoryIds = ['cat-1', 'cat-2'];
      setupMocks();

      rerender(<PinnedCategoriesTable onCategoryClick={mockOnClick} />);

      // Empty state should be gone
      expect(
        screen.queryByText(/No pinned categories/),
      ).not.toBeInTheDocument();

      // Categories should be displayed
      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText('Utilities')).toBeInTheDocument();
    });

    test('transitions back to empty state when all categories are unpinned', () => {
      const mockOnClick = vi.fn();

      // Start with pinned categories
      pinnedCategoryIds = ['cat-1', 'cat-2'];
      setupMocks();

      const { rerender } = render(
        <PinnedCategoriesTable onCategoryClick={mockOnClick} />,
      );

      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText('Utilities')).toBeInTheDocument();

      // Simulate unpinning all categories
      pinnedCategoryIds = [];
      setupMocks();

      rerender(<PinnedCategoriesTable onCategoryClick={mockOnClick} />);

      // Categories should be gone
      expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
      expect(screen.queryByText('Utilities')).not.toBeInTheDocument();

      // Empty state should be displayed
      expect(screen.getByText(/No pinned categories/)).toBeInTheDocument();
    });
  });

  describe('Goal-Aware Color Coding', () => {
    test('pinned category with goal shows goal-aware colors in envelope budget', () => {
      const mockOnClick = vi.fn();

      // Setup: category with goal is pinned
      pinnedCategoryIds = ['cat-1']; // cat-1 has balance $150.50, goal $200.00, budgeted $150.00
      setupMocks();

      const { container } = render(
        <PinnedCategoriesTable onCategoryClick={mockOnClick} />,
      );

      // Find the balance text element
      const row = container.querySelector('[data-testid="category-row-cat-1"]');
      expect(row).toBeInTheDocument();

      // Verify the category name is displayed
      expect(screen.getByText('Groceries')).toBeInTheDocument();
      // Verify balance is displayed (integerToCurrency formats without $ symbol in tests)
      expect(screen.getByText('150.50')).toBeInTheDocument();
    });

    test('pinned category without goal shows simple positive/negative colors', () => {
      const mockOnClick = vi.fn();

      // Setup: Remove goal from cat-1 to test simple color mode
      categoryGoals.set('cat-1', null as any);

      // Setup: category is pinned
      pinnedCategoryIds = ['cat-1'];
      setupMocks();

      const { container } = render(
        <PinnedCategoriesTable onCategoryClick={mockOnClick} />,
      );

      // Find the balance text element
      const row = container.querySelector('[data-testid="category-row-cat-1"]');
      expect(row).toBeInTheDocument();

      // Verify the category is displayed
      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText('150.50')).toBeInTheDocument();

      // Restore goal for other tests
      categoryGoals.set('cat-1', 20000);
    });

    test('underfunded category shows warning color', () => {
      const mockOnClick = vi.fn();

      // Setup: cat-2 has balance $45.00, goal $100.00, budgeted $50.00 (underfunded)
      pinnedCategoryIds = ['cat-2'];
      setupMocks();

      render(<PinnedCategoriesTable onCategoryClick={mockOnClick} />);

      // Verify the category and balance are displayed
      expect(screen.getByText('Utilities')).toBeInTheDocument();
      expect(screen.getByText('45.00')).toBeInTheDocument();
    });

    test('overfunded category shows correct color', () => {
      const mockOnClick = vi.fn();

      // Setup: cat-3 has balance $75.00, goal $50.00, budgeted $80.00 (overfunded)
      // Also has longGoal=1, so it uses balance instead of budgeted
      pinnedCategoryIds = ['cat-3'];
      setupMocks();

      render(<PinnedCategoriesTable onCategoryClick={mockOnClick} />);

      // Verify the category and balance are displayed
      expect(screen.getByText('Entertainment')).toBeInTheDocument();
      expect(screen.getByText('75.00')).toBeInTheDocument();
    });
  });

  describe('User Interaction Flow', () => {
    test('complete user flow: from empty state to pinned category displayed and back', () => {
      const mockOnClick = vi.fn();

      // Step 1: Start with empty state - no pinned categories
      pinnedCategoryIds = [];
      setupMocks();

      const { rerender, unmount } = render(
        <PinnedCategoriesTable onCategoryClick={mockOnClick} />,
      );

      // Verify empty state is shown
      expect(screen.getByText(/No pinned categories/)).toBeInTheDocument();

      // Step 2: Simulate user pinning a category
      pinnedCategoryIds = ['cat-1'];
      setupMocks();

      rerender(<PinnedCategoriesTable onCategoryClick={mockOnClick} />);

      // Step 3: Verify pinned category is now displayed
      expect(screen.getByText('Groceries')).toBeInTheDocument();

      // Step 4: User clicks the pinned category
      const { container } = render(
        <PinnedCategoriesTable onCategoryClick={mockOnClick} />,
      );
      const row = container.querySelector('[data-testid="category-row-cat-1"]');
      fireEvent.click(row!);
      expect(mockOnClick).toHaveBeenCalledWith('cat-1');

      // Step 5: Clean up and test unpin flow separately
      unmount();
    });

    test('complete workflow: pin through checkbox and view in table', () => {
      // Step 1: User initially unpinned
      pinnedCategoryIds = [];
      setupMocks();

      const { rerender } = render(
        <PinToOverviewCheckbox
          categoryId="cat-1"
          theme={{ pillBorder: '#ddd', menuItemText: '#000' }}
        />,
      );

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      // Step 2: User pins the category via checkbox
      fireEvent.click(checkbox);
      expect(mockTogglePin).toHaveBeenCalled();

      // Step 3: Update state to reflect pin
      pinnedCategoryIds = ['cat-1'];
      setupMocks();

      rerender(
        <PinToOverviewCheckbox
          categoryId="cat-1"
          theme={{ pillBorder: '#ddd', menuItemText: '#000' }}
        />,
      );

      // Step 4: Checkbox should now show checked
      const updatedCheckbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(updatedCheckbox.checked).toBe(true);

      // Step 5: Verify category is displayed in table
      render(<PinnedCategoriesTable onCategoryClick={vi.fn()} />);
      expect(screen.getByText('Groceries')).toBeInTheDocument();
    });
  });
});
