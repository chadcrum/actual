# DOMAIN-LOGIC.md - Understanding Actual's Business Logic

This document explains the core domain concepts in Actual: transactions, budgets, and calculations. For data flow patterns, see [DATA-FLOW.md](./DATA-FLOW.md).

## Table of Contents

- [Transactions](#transactions)
- [Split Transactions](#split-transactions)
- [Envelope Budgeting](#envelope-budgeting)
- [Budget Calculations](#budget-calculations)
- [Category Mapping](#category-mapping)
- [Transfers](#transfers)

## Transactions

Transactions represent money moving in or out of accounts. They have several key properties:

- `amount`: The transaction amount (positive for income, negative for expenses)
- `account`: The account the transaction belongs to
- `category`: The budget category (null for transfers)
- `payee`: The payee/merchant
- `date`: Transaction date
- `cleared`: Whether the transaction has cleared the bank
- `reconciled`: Whether the transaction has been reconciled

### Transaction Storage

Transactions are stored with split transaction support using `isParent` and `isChild` flags:

```38:56:packages/loot-core/src/server/sql/init.sql
CREATE TABLE transactions
  (id TEXT PRIMARY KEY,
   isParent INTEGER DEFAULT 0,
   isChild INTEGER DEFAULT 0,
   acct TEXT,
   category TEXT,
   amount INTEGER,
   description TEXT,
   notes TEXT,
   date INTEGER,
   financial_id TEXT,
   type TEXT,
   location TEXT,
   error TEXT,
   imported_description TEXT,
   starting_balance_flag INTEGER DEFAULT 0,
   transferred_id TEXT,
   sort_order REAL,
   tombstone INTEGER DEFAULT 0);
```

Transactions are stored as integers (cents) for precision. Dates are stored as Unix timestamps.

## Split Transactions

Split transactions allow a single transaction to be divided across multiple categories. They consist of:

- **Parent transaction**: The main transaction (has `isParent = true`)
- **Child transactions**: The splits (have `isChild = true` and reference `parent_id`)

### Creating Splits

When splitting a transaction:

```312:340:packages/loot-core/src/shared/transactions.ts
export function splitTransaction(
  transactions: readonly TransactionEntity[],
  id: string,
  createSubtransactions?: (
    parentTransaction: TransactionEntity,
  ) => TransactionEntity[],
) {
  return replaceTransactions(transactions, id, trans => {
    if (trans.is_parent || trans.is_child) {
      return trans;
    }

    const subtransactions = createSubtransactions?.(trans) || [
      makeChild(trans),
    ];

    const { error, ...rest } = trans;

    return {
      ...rest,
      is_parent: true,
      error: num(trans.amount) === 0 ? null : SplitTransactionError(0, trans),
      subtransactions: subtransactions.map(t => ({
        ...t,
        sort_order: t.sort_order || -1,
      })),
    } satisfies TransactionEntity;
  });
}
```

The parent transaction becomes `is_parent = true`, and child transactions are created with `is_child = true`.

### Finding Split Groups

To get all transactions in a split:

```107:118:packages/loot-core/src/shared/transactions.ts
function getSplit(
  transactions: readonly TransactionEntity[],
  parentIndex: number,
) {
  const split = [transactions[parentIndex]];
  let curr = parentIndex + 1;
  while (curr < transactions.length && transactions[curr].is_child) {
    split.push(transactions[curr]);
    curr++;
  }
  return split;
}
```

Child transactions immediately follow their parent in the database, making it efficient to retrieve split groups.

### Split Transaction Rules

Child transactions inherit certain properties from the parent:

- They must have the same account
- They should share the same payee (if parent has one)
- The cleared flag should match the parent
- The sum of child amounts should equal the parent amount

When these rules are violated, the parent transaction gets an error flag:

```333:333:packages/loot-core/src/shared/transactions.ts
      error: num(trans.amount) === 0 ? null : SplitTransactionError(0, trans),
```

The `SplitTransactionError` indicates that the sum of child amounts doesn't equal the parent amount.

## Envelope Budgeting

Actual implements envelope budgeting where you allocate money to categories each month. Budgets are stored per month per category.

### Budget Structure

Each budget month contains:

- **Budgeted amount**: How much you allocated to the category
- **Spent amount**: How much was spent (sum of transactions)
- **Leftover**: Budgeted + Spent (can be negative if overspent)
- **Carryover**: Whether to carry over leftover to next month

### Creating Budget Cells

Budget cells are created dynamically when categories are created:

```33:74:packages/loot-core/src/server/budget/envelope.ts
export function createCategory(cat, sheetName, prevSheetName) {
  if (!cat.is_income) {
    sheet.get().createStatic(sheetName, `budget-${cat.id}`, 0);

    // This makes the app more robust by "fixing up" null budget values.
    // Those should not be allowed, but in case somehow a null value
    // ends up there, we are resilient to it. Preferrably the
    // spreadsheet would have types and be more strict about what is
    // allowed to be set.
    if (sheet.get().getCellValue(sheetName, `budget-${cat.id}`) == null) {
      sheet.get().set(resolveName(sheetName, `budget-${cat.id}`), 0);
    }

    sheet.get().createStatic(sheetName, `carryover-${cat.id}`, false);

    sheet.get().createDynamic(sheetName, `leftover-${cat.id}`, {
      initialValue: 0,
      dependencies: [
        `budget-${cat.id}`,
        `sum-amount-${cat.id}`,
        `${prevSheetName}!carryover-${cat.id}`,
        `${prevSheetName}!leftover-${cat.id}`,
        `${prevSheetName}!leftover-pos-${cat.id}`,
      ],
      run: (budgeted, spent, prevCarryover, prevLeftover, prevLeftoverPos) => {
        return safeNumber(
          number(budgeted) +
            number(spent) +
            (prevCarryover ? number(prevLeftover) : number(prevLeftoverPos)),
        );
      },
    });

    sheet.get().createDynamic(sheetName, 'leftover-pos-' + cat.id, {
      initialValue: 0,
      dependencies: [`leftover-${cat.id}`],
      run: leftover => {
        return leftover < 0 ? 0 : leftover;
      },
    });
  }
}
```

The leftover calculation depends on:

- `budget-${cat.id}`: The budgeted amount for this month
- `sum-amount-${cat.id}`: The sum of all transactions in this category (negative for expenses)
- Previous month's leftover and carryover settings

If carryover is enabled, the full leftover (positive or negative) carries over. Otherwise, only positive leftover carries over.

### Budget Summary

The summary section shows:

- **Available funds**: Income + leftover from last month
- **To budget**: Available - budgeted + last month's overspent (if not carried over)
- **Total budgeted**: Sum of all budgeted amounts
- **Total spent**: Sum of all spent amounts

```98:209:packages/loot-core/src/server/budget/envelope.ts
export function createSummary(groups, categories, prevSheetName, sheetName) {
  const incomeGroup = groups.filter(group => group.is_income)[0];
  const expenseCategories = categories.filter(cat => !cat.is_income);
  const incomeCategories = categories.filter(cat => cat.is_income);

  sheet.get().createStatic(sheetName, 'buffered', 0);

  sheet.get().createDynamic(sheetName, 'from-last-month', {
    initialValue: 0,
    dependencies: [
      `${prevSheetName}!to-budget`,
      `${prevSheetName}!buffered-selected`,
    ],
    run: (toBudget, buffered) =>
      safeNumber(number(toBudget) + number(buffered)),
  });

  // Alias the group income total to `total-income`
  sheet.get().createDynamic(sheetName, 'total-income', {
    initialValue: 0,
    dependencies: [`group-sum-amount-${incomeGroup.id}`],
    run: amount => amount,
  });

  sheet.get().createDynamic(sheetName, 'available-funds', {
    initialValue: 0,
    dependencies: ['total-income', 'from-last-month'],
    run: (income, fromLastMonth) =>
      safeNumber(number(income) + number(fromLastMonth)),
  });

  sheet.get().createDynamic(sheetName, 'last-month-overspent', {
    initialValue: 0,
    dependencies: flatten2(
      expenseCategories.map(cat => [
        `${prevSheetName}!leftover-${cat.id}`,
        `${prevSheetName}!carryover-${cat.id}`,
      ]),
    ),
    run: (...data) => {
      data = unflatten2(data);
      return safeNumber(
        data.reduce((total, [leftover, carryover]) => {
          if (carryover) {
            return total;
          }
          return total + Math.min(0, number(leftover));
        }, 0),
      );
    },
  });

  sheet.get().createDynamic(sheetName, 'total-budgeted', {
    initialValue: 0,
    dependencies: groups
      .filter(group => !group.is_income)
      .map(group => `group-budget-${group.id}`),
    run: (...amounts) => {
      // Negate budgeted amount
      return -sumAmounts(...amounts);
    },
  });

  sheet.get().createDynamic(sheetName, 'buffered', { initialValue: 0 });
  sheet.get().createDynamic(sheetName, 'buffered-auto', {
    initialValue: 0,
    dependencies: flatten2(
      incomeCategories.map(c => [
        `${sheetName}!sum-amount-${c.id}`,
        `${sheetName}!carryover-${c.id}`,
      ]),
    ),
    run: (...data) => {
      data = unflatten2(data);
      return safeNumber(
        data.reduce((total, [sumAmount, carryover]) => {
          if (carryover) {
            return total + sumAmount;
          }
          return total;
        }, 0),
      );
    },
  });
  sheet.get().createDynamic(sheetName, 'buffered-selected', {
    initialValue: 0,
    dependencies: [`${sheetName}!buffered`, `${sheetName}!buffered-auto`],
    run: (man, auto) => {
      if (man !== 0) {
        return man;
      }
      return auto;
    },
  });

  sheet.get().createDynamic(sheetName, 'to-budget', {
    initialValue: 0,
    dependencies: [
      'available-funds',
      'last-month-overspent',
      'total-budgeted',
      'buffered-selected',
    ],
    run: (available, lastOverspent, totalBudgeted, buffered) => {
      return safeNumber(
        number(available) +
          number(lastOverspent) +
          number(totalBudgeted) -
          number(buffered),
      );
    },
  });

  sheet.get().createDynamic(sheetName, 'total-spent', {
    initialValue: 0,
    dependencies: groups
      .filter(group => !group.is_income)
      .map(group => `group-sum-amount-${group.id}`),
    run: sumAmounts,
  });

  sheet.get().createDynamic(sheetName, 'total-leftover', {
    initialValue: 0,
    dependencies: groups
      .filter(group => !group.is_income)
      .map(group => `group-leftover-${group.id}`),
    run: sumAmounts,
  });
}
```

The "to budget" amount is calculated as:

- Available funds (income + from last month)
- Plus last month's overspent (negative amounts from categories without carryover)
- Plus total budgeted (negated, so subtracting)
- Minus buffered amount (reserved income)

## Budget Calculations

Budget amounts are calculated reactively using the spreadsheet system. When a transaction changes, all dependent budget cells recalculate.

### Transaction Changes

When a transaction changes, the spent amount for its category updates:

```164:172:packages/loot-core/src/server/budget/base.ts
        } else if (table === 'transactions') {
          const changed = new Set(
            Object.keys(getChangedValues(oldValue || {}, newValue) || {}),
          );

          if (oldValue) {
            handleTransactionChange(oldValue, changed);
          }
          handleTransactionChange(newValue, changed);
```

The `handleTransactionChange` function updates the spreadsheet cells that sum transaction amounts per category.

### Category Changes

When categories are created, deleted, or modified, the budget structure updates:

```175:184:packages/loot-core/src/server/budget/base.ts
        } else if (table === 'categories') {
          if (budgetType === 'envelope') {
            envelopeBudget.handleCategoryChange(
              createdMonths,
              oldValue,
              newValue,
            );
          } else {
            report.handleCategoryChange(createdMonths, oldValue, newValue);
          }
        } else if (table === 'category_groups') {
```

This ensures budget cells are created or removed as categories change.

## Category Mapping

Transfers between accounts use category mapping. When a category represents a transfer account, transactions use `category_mapping` to link to the actual transfer account ID:

```81:83:packages/loot-core/src/server/sql/init.sql
CREATE TABLE category_mapping
  (id TEXT PRIMARY KEY,
   transferId TEXT);
```

This allows the system to track which account money is transferred to/from while still using the category field. The mapping table links category IDs to account IDs for transfers.

### How Transfers Work

When you create a transfer transaction:

1. A category is created (or exists) that represents the transfer
2. The `category_mapping` table links that category to the target account
3. The transaction uses that category
4. The system knows it's a transfer because the category is in the mapping table

## Transfers

Transfers are special transactions that move money between accounts. They are tracked differently:

- The transaction's `category` field references a category that's mapped to the target account
- The `transfer_id` field on transactions links the two sides of a transfer
- Transfers don't affect budget categories (they're neither income nor expense)

### Transfer Creation

When creating a transfer:

```47:93:packages/loot-core/src/server/transactions/transfer.ts
export async function addTransfer(transaction, transferredAccount) {

```

The system creates or finds a category mapped to the target account, then links the transaction to that category.

See also: [ARCHITECTURE.md](./ARCHITECTURE.md), [DATA-FLOW.md](./DATA-FLOW.md), [AGENTS.md](./AGENTS.md)
