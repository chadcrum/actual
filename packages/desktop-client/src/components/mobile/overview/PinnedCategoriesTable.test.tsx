import { render, screen, fireEvent } from '@testing-library/react';

import { PinnedCategoriesTable } from './PinnedCategoriesTable';

import { usePinnedCategories } from '@desktop-client/components/budget/hooks/usePinnedCategories';

vi.mock('../../budget/hooks/usePinnedCategories');
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
// Store balance values for use in mocks (in cents as integers)
const categoryBalances = new Map([
  ['cat-1', 15050], // $150.50
  ['cat-2', 4500], // $45.00
  ['cat-3', 7500], // $75.00
]);

let lastCategoryIdUsed = '';

vi.mock('@desktop-client/spreadsheet/bindings', () => ({
  envelopeBudget: {
    catBalance: (categoryId: string) => {
      lastCategoryIdUsed = categoryId;
      return { categoryId };
    },
  },
  trackingBudget: {
    catBalance: (categoryId: string) => {
      lastCategoryIdUsed = categoryId;
      return { categoryId };
    },
  },
}));

vi.mock('@desktop-client/hooks/useSheetValue', () => ({
  useSheetValue: (binding: any) => {
    const categoryId = binding?.categoryId || lastCategoryIdUsed;
    return categoryBalances.get(categoryId) ?? 0;
  },
}));

describe('PinnedCategoriesTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
