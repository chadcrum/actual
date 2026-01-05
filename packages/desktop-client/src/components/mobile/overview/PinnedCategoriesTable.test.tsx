import { render, screen, fireEvent } from '@testing-library/react';

import { theme } from '@actual-app/components/theme';

import { PinnedCategoriesTable } from './PinnedCategoriesTable';

import { usePinnedCategories } from '@desktop-client/components/budget/hooks/usePinnedCategories';

vi.mock('../../budget/hooks/usePinnedCategories');

// Budget type state that can be modified per test
let mockBudgetType: 'envelope' | 'tracking' = 'envelope';

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
      return [mockBudgetType, vi.fn()];
    }
    return [undefined, vi.fn()];
  },
}));

// Store balance, budgeted, and goal values for use in mocks (in cents as integers)
const categoryBalances = new Map([
  ['cat-1', 15050], // $150.50
  ['cat-2', 4500], // $45.00
  ['cat-3', 7500], // $75.00
  ['cat-funded', 10000], // $100.00 - balance
  ['cat-overfunded', 15000], // $150.00 - balance
  ['cat-underfunded', 5000], // $50.00 - balance
  ['cat-negative', -3000], // -$30.00 - balance
  ['cat-no-goal', 8000], // $80.00 - balance
]);

const categoryBudgeted = new Map([
  ['cat-funded', 10000], // $100.00 - exactly meets goal
  ['cat-overfunded', 15000], // $150.00 - exceeds goal
  ['cat-underfunded', 5000], // $50.00 - less than goal
  ['cat-negative', 2000], // $20.00 - budgeted but negative balance
  ['cat-no-goal', 8000], // $80.00 - no goal set
]);

const categoryGoals = new Map([
  ['cat-funded', 10000], // $100.00 - goal
  ['cat-overfunded', 10000], // $100.00 - goal (budgeted exceeds this)
  ['cat-underfunded', 10000], // $100.00 - goal (budgeted less than this)
  ['cat-negative', 10000], // $100.00 - goal (but balance is negative)
  ['cat-no-goal', null], // no goal set
]);

let lastCategoryIdUsed = '';
let lastBindingType = '';

vi.mock('@desktop-client/spreadsheet/bindings', () => ({
  envelopeBudget: {
    catBalance: (categoryId: string) => {
      lastCategoryIdUsed = categoryId;
      lastBindingType = 'balance';
      return { categoryId, type: 'balance' };
    },
    catBudgeted: (categoryId: string) => {
      lastCategoryIdUsed = categoryId;
      lastBindingType = 'budgeted';
      return { categoryId, type: 'budgeted' };
    },
    catGoal: (categoryId: string) => {
      lastCategoryIdUsed = categoryId;
      lastBindingType = 'goal';
      return { categoryId, type: 'goal' };
    },
    catLongGoal: (categoryId: string) => {
      lastCategoryIdUsed = categoryId;
      lastBindingType = 'longGoal';
      return { categoryId, type: 'longGoal' };
    },
  },
  trackingBudget: {
    catBalance: (categoryId: string) => {
      lastCategoryIdUsed = categoryId;
      lastBindingType = 'balance';
      return { categoryId, type: 'balance' };
    },
    catBudgeted: (categoryId: string) => {
      lastCategoryIdUsed = categoryId;
      lastBindingType = 'budgeted';
      return { categoryId, type: 'budgeted' };
    },
    catGoal: (categoryId: string) => {
      lastCategoryIdUsed = categoryId;
      lastBindingType = 'goal';
      return { categoryId, type: 'goal' };
    },
    catLongGoal: (categoryId: string) => {
      lastCategoryIdUsed = categoryId;
      lastBindingType = 'longGoal';
      return { categoryId, type: 'longGoal' };
    },
  },
}));

vi.mock('@desktop-client/hooks/useSheetValue', () => ({
  useSheetValue: (binding: any) => {
    const categoryId = binding?.categoryId || lastCategoryIdUsed;
    const bindingType = binding?.type || lastBindingType;

    if (bindingType === 'balance') {
      return categoryBalances.get(categoryId) ?? 0;
    } else if (bindingType === 'budgeted') {
      return categoryBudgeted.get(categoryId) ?? 0;
    } else if (bindingType === 'goal') {
      return categoryGoals.get(categoryId) ?? null;
    } else if (bindingType === 'longGoal') {
      // Return 0 for all categories (non-long goals)
      // This means we should use budgetedValue in the formula
      return 0;
    }
    return 0;
  },
}));

describe('PinnedCategoriesTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBudgetType = 'envelope'; // Reset to envelope budget for most tests
  });

  test('displays empty state when no categories pinned', () => {
    // @ts-ignore - vi.mocked returns a type that's compatible with the hook
    vi.mocked(usePinnedCategories).mockReturnValue({
      getPinnedCategories: () => [],
    });

    render(<PinnedCategoriesTable onCategoryClick={vi.fn()} />);

    expect(screen.getByText('Pinned Categories')).toBeInTheDocument();
    expect(screen.getByText(/No pinned categories/)).toBeInTheDocument();
  });

  test('displays pinned categories in table format', () => {
    const mockCategories = [
      { id: 'cat-1', name: 'Groceries', group: 'group-1' },
      { id: 'cat-2', name: 'Utilities', group: 'group-1' },
    ];

    // @ts-ignore - vi.mocked returns a type that's compatible with the hook
    vi.mocked(usePinnedCategories).mockReturnValue({
      getPinnedCategories: () => mockCategories,
    });

    render(<PinnedCategoriesTable onCategoryClick={vi.fn()} />);

    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Utilities')).toBeInTheDocument();
    // Verify balances are displayed (as numbers without currency symbol in the text node)
    expect(screen.getByText('150.50')).toBeInTheDocument();
    expect(screen.getByText('45.00')).toBeInTheDocument();
  });

  test('calls onCategoryClick when category row is clicked', () => {
    const mockOnClick = vi.fn();
    const mockCategories = [
      { id: 'cat-1', name: 'Groceries', group: 'group-1' },
    ];

    // @ts-ignore - vi.mocked returns a type that's compatible with the hook
    vi.mocked(usePinnedCategories).mockReturnValue({
      getPinnedCategories: () => mockCategories,
    });

    const { container } = render(
      <PinnedCategoriesTable onCategoryClick={mockOnClick} />,
    );

    const row = container.querySelector('[data-testid="category-row-cat-1"]');
    fireEvent.click(row!);

    expect(mockOnClick).toHaveBeenCalledWith('cat-1');
  });

  describe('Goal-aware coloring for envelope budget', () => {
    test('displays green when budgeted equals goal (funded)', () => {
      const mockCategories = [
        { id: 'cat-funded', name: 'Funded Category', group: 'group-1' },
      ];

      // @ts-ignore - vi.mocked returns a type that's compatible with the hook
      vi.mocked(usePinnedCategories).mockReturnValue({
        getPinnedCategories: () => mockCategories,
      });

      const { container } = render(
        <PinnedCategoriesTable onCategoryClick={vi.fn()} />,
      );

      const row = container.querySelector(
        '[data-testid="category-row-cat-funded"]',
      );
      const balanceText = screen.getByText('100.00'); // Query by actual balance value
      expect(balanceText).toHaveStyle({ color: theme.noticeText });
    });

    test('displays green when budgeted exceeds goal (overfunded)', () => {
      const mockCategories = [
        { id: 'cat-overfunded', name: 'Overfunded Category', group: 'group-1' },
      ];

      // @ts-ignore - vi.mocked returns a type that's compatible with the hook
      vi.mocked(usePinnedCategories).mockReturnValue({
        getPinnedCategories: () => mockCategories,
      });

      const { container } = render(
        <PinnedCategoriesTable onCategoryClick={vi.fn()} />,
      );

      const row = container.querySelector(
        '[data-testid="category-row-cat-overfunded"]',
      );
      const balanceText = screen.getByText('150.00'); // Query by actual balance value
      expect(balanceText).toHaveStyle({ color: theme.noticeText });
    });

    test('displays yellow when budgeted is less than goal (underfunded)', () => {
      const mockCategories = [
        {
          id: 'cat-underfunded',
          name: 'Underfunded Category',
          group: 'group-1',
        },
      ];

      // @ts-ignore - vi.mocked returns a type that's compatible with the hook
      vi.mocked(usePinnedCategories).mockReturnValue({
        getPinnedCategories: () => mockCategories,
      });

      const { container } = render(
        <PinnedCategoriesTable onCategoryClick={vi.fn()} />,
      );

      const row = container.querySelector(
        '[data-testid="category-row-cat-underfunded"]',
      );
      const balanceText = screen.getByText('50.00'); // Query by actual balance value
      expect(balanceText).toHaveStyle({ color: theme.warningText });
    });

    test('displays red when balance is negative regardless of goal', () => {
      const mockCategories = [
        { id: 'cat-negative', name: 'Negative Category', group: 'group-1' },
      ];

      // @ts-ignore - vi.mocked returns a type that's compatible with the hook
      vi.mocked(usePinnedCategories).mockReturnValue({
        getPinnedCategories: () => mockCategories,
      });

      const { container } = render(
        <PinnedCategoriesTable onCategoryClick={vi.fn()} />,
      );

      const row = container.querySelector(
        '[data-testid="category-row-cat-negative"]',
      );
      const balanceText = screen.getByText('-30.00'); // Query by actual balance value
      expect(balanceText).toHaveStyle({ color: theme.errorText });
    });

    test('uses simple positive color when no goal is set', () => {
      const mockCategories = [
        { id: 'cat-no-goal', name: 'No Goal Category', group: 'group-1' },
      ];

      // @ts-ignore - vi.mocked returns a type that's compatible with the hook
      vi.mocked(usePinnedCategories).mockReturnValue({
        getPinnedCategories: () => mockCategories,
      });

      const { container } = render(
        <PinnedCategoriesTable onCategoryClick={vi.fn()} />,
      );

      const row = container.querySelector(
        '[data-testid="category-row-cat-no-goal"]',
      );
      const balanceText = screen.getByText('80.00'); // Query by actual balance value
      // When no goal is set, should use simple positive/negative coloring
      // Positive balance should show theme.noticeTextMenu (the simple positive color)
      expect(balanceText).toHaveStyle({ color: theme.noticeTextMenu });
    });
  });

  describe('Simple coloring for tracking budget', () => {
    test('uses simple positive/negative colors for tracking budget', () => {
      mockBudgetType = 'tracking';

      const mockCategories = [
        { id: 'cat-funded', name: 'Tracking Category', group: 'group-1' },
      ];

      // @ts-ignore - vi.mocked returns a type that's compatible with the hook
      vi.mocked(usePinnedCategories).mockReturnValue({
        getPinnedCategories: () => mockCategories,
      });

      const { container } = render(
        <PinnedCategoriesTable onCategoryClick={vi.fn()} />,
      );

      const row = container.querySelector(
        '[data-testid="category-row-cat-funded"]',
      );
      const balanceText = screen.getByText('100.00'); // Query by actual balance value
      // Tracking budget should always use simple colors regardless of goals
      expect(balanceText).toHaveStyle({ color: theme.noticeTextMenu });
    });

    test('uses red for negative balance in tracking budget', () => {
      mockBudgetType = 'tracking';

      const mockCategories = [
        { id: 'cat-negative', name: 'Negative Tracking', group: 'group-1' },
      ];

      // @ts-ignore - vi.mocked returns a type that's compatible with the hook
      vi.mocked(usePinnedCategories).mockReturnValue({
        getPinnedCategories: () => mockCategories,
      });

      const { container } = render(
        <PinnedCategoriesTable onCategoryClick={vi.fn()} />,
      );

      const row = container.querySelector(
        '[data-testid="category-row-cat-negative"]',
      );
      const balanceText = screen.getByText('-30.00'); // Query by actual balance value
      expect(balanceText).toHaveStyle({ color: theme.errorTextMenu });
    });
  });
});
