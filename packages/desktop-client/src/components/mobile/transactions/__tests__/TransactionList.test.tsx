import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { SelectedTransactionsFloatingActionBar } from '../TransactionList';
import type { TransactionEntity } from 'loot-core/types/models';

// Mock all the dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
  Trans: ({ children }: any) => children,
}));

vi.mock('@desktop-client/hooks/useFeatureFlag', () => ({
  useFeatureFlag: vi.fn((flag: string) => {
    if (flag === 'mobileParity') {
      return true; // Default to enabled for most tests
    }
    return false;
  }),
}));

vi.mock('@desktop-client/hooks/useSelected', () => ({
  useSelectedItems: vi.fn(() => {
    const selectedMap = new Map([['tx1', true]]);
    // Override the iterator to return just keys instead of [key, value] pairs
    selectedMap[Symbol.iterator] = function* () {
      yield* this.keys();
    };
    return selectedMap;
  }),
  useSelectedDispatch: vi.fn(() => vi.fn()),
}));

vi.mock('@desktop-client/hooks/useUndo', () => ({
  useUndo: () => ({
    showUndoNotification: vi.fn(),
  }),
}));

vi.mock('@desktop-client/hooks/useTransactionBatchActions', () => ({
  useTransactionBatchActions: () => ({
    onBatchEdit: vi.fn(),
    onBatchDuplicate: vi.fn(),
    onBatchDelete: vi.fn(),
    onBatchLinkSchedule: vi.fn(),
    onBatchUnlinkSchedule: vi.fn(),
    onSetTransfer: vi.fn(),
    onMerge: vi.fn(),
  }),
}));

vi.mock('@desktop-client/hooks/useNavigate', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@desktop-client/hooks/useAccounts', () => ({
  useAccounts: () => [],
}));

vi.mock('@desktop-client/hooks/useCategories', () => ({
  useCategories: () => ({ list: [] }),
}));

vi.mock('@desktop-client/hooks/usePayees', () => ({
  usePayees: () => [],
}));

vi.mock('@desktop-client/redux', () => ({
  useDispatch: () => vi.fn(),
}));

vi.mock('@actual-app/components/styles', () => ({
  styles: {
    mobileMenuItem: {},
    mobileMinHeight: 44,
    mediumText: {},
    smallText: {},
  },
}));

vi.mock('@actual-app/components/theme', () => ({
  theme: {
    mobileHeaderText: '#000',
    buttonBareDisabledText: '#999',
    errorTextMenu: '#d00',
    floatingActionBarBackground: '#fff',
    mobilePageBackground: '#f5f5f5',
  },
}));

vi.mock('@actual-app/components/button', () => ({
  Button: ({ children, onPress, ...props }: any) => (
    <button onClick={onPress} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@actual-app/components/text', () => ({
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

vi.mock('@actual-app/components/view', () => ({
  View: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@actual-app/components/popover', () => ({
  Popover: ({ children, isOpen }: any) => (isOpen ? <div>{children}</div> : null),
}));

vi.mock('@actual-app/components/menu', () => ({
  Menu: ({ items, onMenuSelect }: any) => (
    <div>
      {items?.map((item: any) => (
        <button
          key={item.name}
          onClick={() => onMenuSelect(item.name)}
          disabled={item.disabled}
        >
          {item.text}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@desktop-client/components/mobile/FloatingActionBar', () => ({
  FloatingActionBar: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@actual-app/components/icons/v0', () => ({
  SvgDelete: () => <div data-testid="delete-icon" />,
}));

vi.mock('@actual-app/components/icons/v1', () => ({
  SvgDotsHorizontalTriple: () => <div data-testid="dots-icon" />,
}));

vi.mock('@actual-app/components/icons/AnimatedLoading', () => ({
  AnimatedLoading: () => <div data-testid="loading-icon" />,
}));

describe('SelectedTransactionsFloatingActionBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTransactions: TransactionEntity[] = [
    {
      id: 'tx1',
      amount: 100,
      date: '2024-01-01',
      account: 'acc1',
      payee: 'payee1',
      category: 'cat1',
      notes: 'Test',
      imported_payee: null,
      cleared: false,
      schedule: null,
      is_parent: false,
      is_child: false,
      parent_id: null,
      sort_order: 0,
      reconciled: false,
      'is_deleted': false,
      transfer_acct: null,
      starting_balance_flag: false,
      starting_balance_id: null,
    } as any,
  ];

  it('should show "Create rule" option when mobileParity flag is enabled', async () => {
    const mockOnCreateRule = vi.fn();

    render(
      <SelectedTransactionsFloatingActionBar
        transactions={mockTransactions}
        style={{}}
        showMakeTransfer={false}
        onCreateRule={mockOnCreateRule}
      />
    );

    // The dots button should trigger menu to open
    const dotsButton = screen.getByRole('button', { name: 'More options' });
    fireEvent.click(dotsButton);

    // Wait for menu to appear and find Create rule button
    await waitFor(() => {
      expect(screen.getByText('Create rule')).toBeInTheDocument();
    });
  });

  it('should hide "Create rule" option when mobileParity flag is disabled', async () => {
    // Update the mock to return false for mobileParity flag
    const { useFeatureFlag } = await import('@desktop-client/hooks/useFeatureFlag');
    vi.mocked(useFeatureFlag).mockImplementation(
      (flag: string) => flag === 'mobileParity' ? false : false
    );

    const mockOnCreateRule = vi.fn();

    render(
      <SelectedTransactionsFloatingActionBar
        transactions={mockTransactions}
        style={{}}
        showMakeTransfer={false}
        onCreateRule={mockOnCreateRule}
      />
    );

    // The dots button should trigger menu to open
    const dotsButton = screen.getByRole('button', { name: 'More options' });
    fireEvent.click(dotsButton);

    // Wait for menu and verify Create rule is NOT present
    await waitFor(() => {
      expect(screen.queryByText('Create rule')).not.toBeInTheDocument();
    });
  });

  it('should call onCreateRule when create-rule menu item is clicked', async () => {
    // Reset the mock to ensure mobileParity is enabled
    const { useFeatureFlag } = await import('@desktop-client/hooks/useFeatureFlag');
    vi.mocked(useFeatureFlag).mockImplementation(
      (flag: string) => flag === 'mobileParity' ? true : false
    );

    const mockOnCreateRule = vi.fn();

    render(
      <SelectedTransactionsFloatingActionBar
        transactions={mockTransactions}
        style={{}}
        showMakeTransfer={false}
        onCreateRule={mockOnCreateRule}
      />
    );

    // Open the more options menu
    const dotsButton = screen.getByRole('button', { name: 'More options' });
    fireEvent.click(dotsButton);

    // Wait for and click the Create rule button
    await waitFor(() => {
      const createRuleButton = screen.getByText('Create rule');
      expect(createRuleButton).toBeInTheDocument();
      fireEvent.click(createRuleButton);
    });

    // Verify the handler was called with the selected transaction IDs
    expect(mockOnCreateRule).toHaveBeenCalledWith({
      ids: ['tx1'],
    });
  });
});
