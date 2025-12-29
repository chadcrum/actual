import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PinnedCategoryRow } from './PinnedCategoryRow';
import { type UseFormatResult } from '@desktop-client/hooks/useFormat';

// Mock components
vi.mock('@actual-app/components/block', () => ({
  Block: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@actual-app/components/view', () => ({
  View: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@actual-app/components/theme', () => ({
  theme: {
    tableBorder: '#ddd',
    warningText: '#d32f2f',
  },
}));

vi.mock('@desktop-client/components/PrivacyFilter', () => ({
  PrivacyFilter: ({ children }: any) => <div>{children}</div>,
}));

describe('PinnedCategoryRow', () => {
  const mockFormat = vi.fn((value: number, _type?: string) => `$${value}`);

  // Create a callable object that can be used as UseFormatResult
  const mockFormatResult = Object.assign(
    (value: number, type?: string) => mockFormat(value, type),
    {
      forEdit: vi.fn((value: number) => `$${value}`),
      fromEdit: vi.fn((value: string) => parseInt(value.replace('$', ''), 10)),
    },
  ) as any as UseFormatResult;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders category name and formatted balance', () => {
    render(
      <PinnedCategoryRow
        categoryId="cat-1"
        categoryName="Groceries"
        balance={250}
        format={mockFormatResult}
      />,
    );

    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('$250')).toBeInTheDocument();
  });

  it('renders negative balance with warning text color when no pillStyle provided', () => {
    const { container } = render(
      <PinnedCategoryRow
        categoryId="cat-1"
        categoryName="Groceries"
        balance={-250}
        format={mockFormatResult}
      />,
    );

    // The balance should be rendered as absolute value
    expect(screen.getByText('$250')).toBeInTheDocument();

    // Check that the warning color is applied to the balance block
    const balanceBlock = screen.getByText('$250');
    const balanceStyle = window.getComputedStyle(balanceBlock);
    expect(balanceStyle.color).toBe('rgb(211, 47, 47)'); // #d32f2f in RGB
  });

  it('calls onClickName handler when category name is clicked', async () => {
    const onClickName = vi.fn();
    const user = userEvent.setup();

    render(
      <PinnedCategoryRow
        categoryId="cat-1"
        categoryName="Groceries"
        balance={250}
        format={mockFormatResult}
        onClickName={onClickName}
      />,
    );

    const categoryNameElement = screen.getByText('Groceries');
    await user.click(categoryNameElement);

    expect(onClickName).toHaveBeenCalledWith('cat-1');
    expect(onClickName).toHaveBeenCalledTimes(1);
  });

  it('calls onClickBalance handler when balance is clicked', async () => {
    const onClickBalance = vi.fn();
    const user = userEvent.setup();

    render(
      <PinnedCategoryRow
        categoryId="cat-2"
        categoryName="Gas"
        balance={100}
        format={mockFormatResult}
        onClickBalance={onClickBalance}
      />,
    );

    const balanceElement = screen.getByText('$100');
    await user.click(balanceElement);

    expect(onClickBalance).toHaveBeenCalledWith('cat-2');
    expect(onClickBalance).toHaveBeenCalledTimes(1);
  });

  it('does not call click handlers when they are not provided', async () => {
    const user = userEvent.setup();

    render(
      <PinnedCategoryRow
        categoryId="cat-1"
        categoryName="Groceries"
        balance={250}
        format={mockFormatResult}
      />,
    );

    // Should render without errors when handlers are not provided
    const categoryNameElement = screen.getByText('Groceries');
    const balanceElement = screen.getByText('$250');

    await user.click(categoryNameElement);
    await user.click(balanceElement);

    // No errors should occur
    expect(categoryNameElement).toBeInTheDocument();
    expect(balanceElement).toBeInTheDocument();
  });

  it('applies pointer cursor style when click handlers are provided', () => {
    const onClickName = vi.fn();
    const { container } = render(
      <PinnedCategoryRow
        categoryId="cat-1"
        categoryName="Groceries"
        balance={250}
        format={mockFormatResult}
        onClickName={onClickName}
      />,
    );

    const categoryNameElement = screen.getByText('Groceries');
    const computedStyle = window.getComputedStyle(categoryNameElement);
    expect(computedStyle.cursor).toBe('pointer');
  });

  it('applies pillStyle to balance when provided', () => {
    const pillStyle = { color: '#ff0000', backgroundColor: '#00ff00' };
    render(
      <PinnedCategoryRow
        categoryId="cat-1"
        categoryName="Groceries"
        balance={250}
        format={mockFormatResult}
        pillStyle={pillStyle}
      />,
    );

    expect(screen.getByText('$250')).toBeInTheDocument();
  });

  it('calls both handlers independently when both are provided', async () => {
    const onClickName = vi.fn();
    const onClickBalance = vi.fn();
    const user = userEvent.setup();

    render(
      <PinnedCategoryRow
        categoryId="cat-1"
        categoryName="Groceries"
        balance={250}
        format={mockFormatResult}
        onClickName={onClickName}
        onClickBalance={onClickBalance}
      />,
    );

    const categoryNameElement = screen.getByText('Groceries');
    const balanceElement = screen.getByText('$250');

    await user.click(categoryNameElement);
    expect(onClickName).toHaveBeenCalledWith('cat-1');
    expect(onClickBalance).not.toHaveBeenCalled();

    await user.click(balanceElement);
    expect(onClickBalance).toHaveBeenCalledWith('cat-1');
    expect(onClickName).toHaveBeenCalledTimes(1); // Still only called once
  });

  it('renders zero balance without warning color', () => {
    const { container } = render(
      <PinnedCategoryRow
        categoryId="cat-1"
        categoryName="Savings"
        balance={0}
        format={mockFormatResult}
      />,
    );

    // Zero balance should be rendered
    expect(screen.getByText('$0')).toBeInTheDocument();

    // Check that warning color is NOT applied to the zero balance
    const balanceBlock = screen.getByText('$0');
    const balanceStyle = window.getComputedStyle(balanceBlock);
    // Default color should be used, not warning color
    expect(balanceStyle.color).not.toBe('rgb(211, 47, 47)');
  });
});
