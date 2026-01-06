import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Planning } from './index';
import { useCategories } from '@desktop-client/hooks/useCategories';

// Mock dependencies
vi.mock('@desktop-client/hooks/useCategories');
vi.mock('./PlanningTable', () => ({
  PlanningTable: () => <div data-testid="planning-table">Planning Table</div>,
}));

describe('Planning Page', () => {
  beforeEach(() => {
    // Mock categories
    (useCategories as any).mockReturnValue({
      grouped: [
        {
          id: 'group-1',
          name: 'Expenses',
          hidden: false,
          categories: [
            {
              id: 'cat-1',
              name: 'Groceries',
              hidden: false,
              tombstone: false,
              goal_def: null,
            },
            {
              id: 'cat-2',
              name: 'Utilities',
              hidden: false,
              tombstone: false,
              goal_def: JSON.stringify({ target: 500, type: 'monthly' }),
            },
          ],
        },
      ],
      list: [],
    });

    // Mock localStorage
    global.localStorage.getItem = vi.fn(() => null);
    global.localStorage.setItem = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Planning page header', () => {
    render(<Planning />);
    expect(screen.getByText('Budget Planning')).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<Planning />);
    expect(
      screen.getByText('Review goal targets and toggle categories to see budget impact')
    ).toBeInTheDocument();
  });

  it('renders the PlanningTable component', () => {
    render(<Planning />);
    expect(screen.getByTestId('planning-table')).toBeInTheDocument();
  });

  it('renders without errors', () => {
    const { container } = render(<Planning />);
    // Verify the component renders something
    expect(container).toBeInTheDocument();
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('maintains proper layout structure', () => {
    const { container } = render(<Planning />);
    // Check for h1 header
    const heading = container.querySelector('h1');
    expect(heading).toBeInTheDocument();
    expect(heading?.textContent).toBe('Budget Planning');
  });
});
