import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PinnedCategoriesSection } from './PinnedCategoriesSection';
import { type UseFormatResult } from '@desktop-client/hooks/useFormat';

// Mock react-beautiful-dnd
vi.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }: any) => <div>{children}</div>,
  Droppable: ({ children }: any) =>
    children(
      {
        innerRef: vi.fn(),
        droppableProps: {},
        placeholder: null,
      },
      { isDraggingOver: false },
    ),
  Draggable: ({ children, _draggableId, _index }: any) =>
    children(
      {
        innerRef: vi.fn(),
        draggableProps: { style: {} },
        dragHandleProps: {},
      },
      { isDragging: false },
    ),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock components
vi.mock('@actual-app/components/block', () => ({
  Block: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@actual-app/components/view', () => ({
  View: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@actual-app/components/theme', () => ({
  theme: {
    pageTextSubdued: '#666',
    buttonMenuBackground: '#f0f0f0',
    tableRowBackgroundHover: '#e0e0e0',
    tableBorder: '#ddd',
    pageText: '#000',
    warningText: '#d32f2f',
  },
}));

vi.mock('@actual-app/components/icons/v1', () => ({
  SvgMenu: () => <div>Menu Icon</div>,
}));

vi.mock('@desktop-client/components/PrivacyFilter', () => ({
  PrivacyFilter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('./PinnedCategoryRow', () => ({
  PinnedCategoryRow: ({ categoryName, balance, format }: any) => (
    <div data-testid={`category-${categoryName}`}>
      {categoryName}:{' '}
      {typeof format === 'function'
        ? format(Math.abs(balance), 'financial')
        : format(Math.abs(balance), 'financial')}
    </div>
  ),
}));

describe('PinnedCategoriesSection', () => {
  const mockFormat = vi.fn((value: number, _type?: string) => `$${value}`);

  // Create a callable object that can be used as UseFormatResult
  const mockFormatResult = Object.assign(
    (value: number, type?: string) => mockFormat(value, type),
    {
      forEdit: vi.fn((value: number) => `$${value}`),
      fromEdit: vi.fn((value: string) => parseInt(value.replace('$', ''), 10)),
    },
  ) as any as UseFormatResult;

  const pinnedCategories = [
    { categoryId: 'cat-1', categoryName: 'Groceries', balance: 250 },
    { categoryId: 'cat-2', categoryName: 'Gas', balance: 100 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no categories are pinned', () => {
    const { container } = render(
      <PinnedCategoriesSection
        pinnedCategories={[]}
        format={mockFormatResult}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders section header when categories are pinned', () => {
    render(
      <PinnedCategoriesSection
        pinnedCategories={pinnedCategories}
        format={mockFormatResult}
      />,
    );
    expect(screen.getByText('Pinned Categories')).toBeInTheDocument();
  });

  it('renders pinned categories in correct order', () => {
    const reorderedCategories = [pinnedCategories[1], pinnedCategories[0]];
    render(
      <PinnedCategoriesSection
        pinnedCategories={reorderedCategories}
        format={mockFormatResult}
      />,
    );

    const gas = screen.getByTestId('category-Gas');
    const groceries = screen.getByTestId('category-Groceries');

    expect(gas).toBeInTheDocument();
    expect(groceries).toBeInTheDocument();

    // Check that Gas appears before Groceries in the DOM
    const gasPosition = gas.compareDocumentPosition(groceries);
    expect(gasPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('passes format function to child components', () => {
    render(
      <PinnedCategoriesSection
        pinnedCategories={pinnedCategories}
        format={mockFormatResult}
      />,
    );

    expect(mockFormat).toHaveBeenCalled();
  });
});
