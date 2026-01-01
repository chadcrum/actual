import { render, screen, fireEvent } from '@testing-library/react';
import { PinnedCategoriesTable } from './PinnedCategoriesTable';
import { usePinnedCategories } from '../../budget/hooks/usePinnedCategories';

vi.mock('../../budget/hooks/usePinnedCategories');
vi.mock('@desktop-client/hooks/useFormat', () => ({
  useFormat: () => (value: number) => `$${value.toFixed(2)}`,
}));

describe('PinnedCategoriesTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('displays empty state when no categories pinned', () => {
    vi.mocked(usePinnedCategories).mockReturnValue({
      getPinnedCategories: () => [],
    } as any);

    render(<PinnedCategoriesTable onCategoryClick={vi.fn()} />);

    expect(screen.getByText('Pinned Categories')).toBeInTheDocument();
    expect(
      screen.getByText(/No pinned categories/)
    ).toBeInTheDocument();
  });

  test('displays pinned categories in table format', () => {
    const mockCategories = [
      { id: 'cat-1', name: 'Groceries', balance: 150.5 },
      { id: 'cat-2', name: 'Utilities', balance: -25.0 },
    ];

    vi.mocked(usePinnedCategories).mockReturnValue({
      getPinnedCategories: () => mockCategories,
    } as any);

    render(<PinnedCategoriesTable onCategoryClick={vi.fn()} />);

    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Utilities')).toBeInTheDocument();
  });

  test('calls onCategoryClick when category row is clicked', () => {
    const mockOnClick = vi.fn();
    const mockCategories = [
      { id: 'cat-1', name: 'Groceries', balance: 150.5 },
    ];

    vi.mocked(usePinnedCategories).mockReturnValue({
      getPinnedCategories: () => mockCategories,
    } as any);

    const { container } = render(
      <PinnedCategoriesTable onCategoryClick={mockOnClick} />
    );

    const row = container.querySelector('[data-testid="category-row-cat-1"]');
    fireEvent.click(row!);

    expect(mockOnClick).toHaveBeenCalledWith('cat-1');
  });

  test('displays category balances with proper formatting', () => {
    const mockCategories = [
      { id: 'cat-1', name: 'Test', balance: 1234.56 },
    ];

    vi.mocked(usePinnedCategories).mockReturnValue({
      getPinnedCategories: () => mockCategories,
    } as any);

    render(<PinnedCategoriesTable onCategoryClick={vi.fn()} />);

    // Check that balance is formatted as currency
    expect(screen.getByText('$1234.56')).toBeInTheDocument();
  });
});
