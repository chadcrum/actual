import { render, screen, fireEvent } from '@testing-library/react';

import { PinnedCategoriesTable } from './PinnedCategoriesTable';

import { usePinnedCategories } from '@desktop-client/components/budget/hooks/usePinnedCategories';

vi.mock('../../budget/hooks/usePinnedCategories');

describe('PinnedCategoriesTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('displays empty state when no categories pinned', () => {
    vi.mocked(usePinnedCategories).mockReturnValue({
      getPinnedCategories: () => [],
    } as unknown);

    render(<PinnedCategoriesTable onCategoryClick={vi.fn()} />);

    expect(screen.getByText('Pinned Categories')).toBeInTheDocument();
    expect(screen.getByText(/No pinned categories/)).toBeInTheDocument();
  });

  test('displays pinned categories in table format', () => {
    const mockCategories = [
      { id: 'cat-1', name: 'Groceries' },
      { id: 'cat-2', name: 'Utilities' },
    ];

    vi.mocked(usePinnedCategories).mockReturnValue({
      getPinnedCategories: () => mockCategories,
    } as unknown);

    render(<PinnedCategoriesTable onCategoryClick={vi.fn()} />);

    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Utilities')).toBeInTheDocument();
  });

  test('calls onCategoryClick when category row is clicked', () => {
    const mockOnClick = vi.fn();
    const mockCategories = [{ id: 'cat-1', name: 'Groceries' }];

    vi.mocked(usePinnedCategories).mockReturnValue({
      getPinnedCategories: () => mockCategories,
    } as unknown);

    const { container } = render(
      <PinnedCategoriesTable onCategoryClick={mockOnClick} />,
    );

    const row = container.querySelector('[data-testid="category-row-cat-1"]');
    fireEvent.click(row!);

    expect(mockOnClick).toHaveBeenCalledWith('cat-1');
  });
});
