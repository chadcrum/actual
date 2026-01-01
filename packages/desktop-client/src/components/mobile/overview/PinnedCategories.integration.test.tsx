import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';

import { PinnedCategoriesTable } from './PinnedCategoriesTable';

// Import the components and hooks we're testing
import { usePinnedCategories } from '@desktop-client/components/budget/hooks/usePinnedCategories';
import { PinToOverviewCheckbox } from '@desktop-client/components/modals/PinToOverviewCheckbox';

// Mock dependencies
vi.mock('../../budget/hooks/usePinnedCategories');
vi.mock('@desktop-client/hooks/useFormat', () => ({
  useFormat: () => (value: number) => `$${value.toFixed(2)}`,
}));
vi.mock('@desktop-client/hooks/useLocale', () => ({
  useLocale: () => 'en',
}));
vi.mock('@desktop-client/hooks/useSyncedPref', () => ({
  useSyncedPref: (key: string) => {
    if (key === 'budgetType') {
      return ['envelope', vi.fn()];
    }
    return [undefined, vi.fn()];
  },
}));
vi.mock('@desktop-client/hooks/useSheetName', () => ({
  SheetNameProvider: ({ children }: { children: JSX.Element }) => children,
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
        { id: 'cat-1', name: 'Groceries', balance: 150.5, goal_target: 200 },
        { id: 'cat-2', name: 'Utilities', balance: 45.0, goal_target: 100 },
        { id: 'cat-3', name: 'Entertainment', balance: 75.0, goal_target: 50 },
      ];
      return allCategories.filter(cat => pinnedCategoryIds.includes(cat.id));
    });

    mockIsPinned = vi.fn((categoryId: string) =>
      pinnedCategoryIds.includes(categoryId),
    );

    (usePinnedCategories as unknown).mockReturnValue({
      pinnedCategoryIds,
      isPinned: mockIsPinned,
      togglePin: mockTogglePin,
      getPinnedCategories: mockGetPinnedCategories,
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
      expect(mockIsPinned('cat-1')).toBe(false);

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
      expect(screen.getByText('$150.50')).toBeInTheDocument();
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
      expect(screen.getByText('$150.50')).toBeInTheDocument();

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
