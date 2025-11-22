# DATA-FLOW.md - Understanding Data Flow in Actual

This document explains how data flows through Actual's Redux store, reactivity system, and undo/redo mechanisms. For core architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Table of Contents

- [Redux State Management](#redux-state-management)
- [Server Method Integration](#server-method-integration)
- [Undo/Redo System](#undoredo-system)
- [Reactivity & Subscriptions](#reactivity--subscriptions)
- [Query Dependencies](#query-dependencies)

## Redux State Management

Actual uses Redux Toolkit for client-side state management. The store is organized into slices by domain:

```54:66:packages/desktop-client/src/redux/store.ts
const rootReducer = combineReducers({
  [accountsSliceName]: accountsSliceReducer,
  [appSliceName]: appSliceReducer,
  [budgetSliceName]: budgetSliceReducer,
  [budgetfilesSliceName]: budgetfilesSliceReducer,
  [modalsSliceName]: modalsSliceReducer,
  [notificationsSliceName]: notificationsSliceReducer,
  [payeesSliceName]: payeesSliceReducer,
  [prefsSliceName]: prefsSliceReducer,
  [transactionsSliceName]: transactionsSliceReducer,
  [tagsSliceName]: tagsSliceReducer,
  [usersSliceName]: usersSliceReducer,
});
```

### Slice Pattern

Each slice follows a consistent pattern with:
- Initial state
- Reducers (sync state updates)
- Actions (async operations via thunks)

Example from prefs slice:

```136:174:packages/desktop-client/src/prefs/prefsSlice.ts
type MergeSyncedPrefsPayload = SyncedPrefs;

const prefsSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    setPrefs(state, action: PayloadAction<SetPrefsPayload>) {
      state.local = action.payload.local;
      state.global = action.payload.global;
      state.synced = action.payload.synced;
    },
    mergeLocalPrefs(state, action: PayloadAction<MergeLocalPrefsPayload>) {
      state.local = { ...state.local, ...action.payload };
    },
    mergeGlobalPrefs(state, action: PayloadAction<MergeGlobalPrefsPayload>) {
      state.global = { ...state.global, ...action.payload };
    },
    mergeSyncedPrefs(state, action: PayloadAction<MergeSyncedPrefsPayload>) {
      state.synced = { ...state.synced, ...action.payload };
    },
  },
  extraReducers: builder => {
    builder.addCase(resetApp, state => ({
      ...initialState,
      global: state.global || initialState.global,
    }));
  },
});

export const { name, reducer, getInitialState } = prefsSlice;

export const actions = {
  ...prefsSlice.actions,
  loadPrefs,
  savePrefs,
  
```

### Error Handling

The store includes middleware that automatically shows notifications for rejected actions:

```68:83:packages/desktop-client/src/redux/store.ts
const notifyOnRejectedActionsMiddleware = createListenerMiddleware();
notifyOnRejectedActionsMiddleware.startListening({
  predicate: isRejected,
  effect: async (action, { dispatch }) => {
    // Show notification for rejected actions
    dispatch(
      addNotification({
        type: 'error',
        message: action.error?.message || 'An error occurred',
      }),
    );
  },
});
```

## Server Method Integration

Client code calls server methods using the `send()` function, which abstracts platform differences:

```19:35:packages/desktop-client/src/index.tsx
import { send } from 'loot-core/platform/client/fetch';
import { q } from 'loot-core/shared/query';

import * as accountsSlice from './accounts/accountsSlice';
import * as appSlice from './app/appSlice';
import { AuthProvider } from './auth/AuthProvider';
import * as budgetSlice from './budget/budgetSlice';
import * as budgetfilesSlice from './budgetfiles/budgetfilesSlice';
import { App } from './components/App';
import { ServerProvider } from './components/ServerContext';
import * as modalsSlice from './modals/modalsSlice';
import * as notificationsSlice from './notifications/notificationsSlice';
import * as payeesSlice from './payees/payeesSlice';
import * as prefsSlice from './prefs/prefsSlice';
import { aqlQuery } from './queries/aqlQuery';
import { store } from './redux/store';
import * as tagsSlice from './tags/tagsSlice';
import * as transactionsSlice from './transactions/transactionsSlice';
import { redo, undo } from './undo';
import * as usersSlice from './users/usersSlice';
```

Actions are bound to the store for convenient access:

```37:52:packages/desktop-client/src/index.tsx
const boundActions = bindActionCreators(
  {
    ...accountsSlice.actions,
    ...appSlice.actions,
    ...budgetSlice.actions,
    ...budgetfilesSlice.actions,
    ...modalsSlice.actions,
    ...notificationsSlice.actions,
    ...payeesSlice.actions,
    ...prefsSlice.actions,
    ...transactionsSlice.actions,
    ...tagsSlice.actions,
    ...usersSlice.actions,
  },
  store.dispatch,
);
```

These bound actions are made available globally via a `ServerProvider` context, allowing components to call server methods easily.

## Undo/Redo System

Actual implements a sophisticated undo/redo system that tracks mutations at the message level.

### How Undo Works

1. **Snapshots**: Before each mutation, a snapshot is taken (identified by `undoTag`):

```50:55:packages/loot-core/src/platform/client/undo/index.ts
export const snapshot = () => {
  const tagged = { ...currentUndoState, id: uuidv4() };
  UNDO_STATE_MRU.unshift(tagged);
  UNDO_STATE_MRU = UNDO_STATE_MRU.slice(0, HISTORY_SIZE);
  return tagged.id;
};
```

The snapshot captures:
- Current URL
- Modal state
- Other UI state that should be restored on undo

2. **Message History**: Messages are stored in history with markers:

```68:92:packages/loot-core/src/server/undo.ts
export function withUndo<T>(
  func: () => Promise<T>,
  meta?: unknown,
): Promise<T> {
  const context = getMutatorContext();
  if (context.undoDisabled || context.undoListening) {
    return func();
  }

  MESSAGE_HISTORY = MESSAGE_HISTORY.slice(0, CURSOR + 1);

  const marker: MarkerMessage = { type: 'marker', meta };

  if (MESSAGE_HISTORY[MESSAGE_HISTORY.length - 1].type === 'marker') {
    MESSAGE_HISTORY[MESSAGE_HISTORY.length - 1] = marker;
  } else {
    MESSAGE_HISTORY.push(marker);
    CURSOR++;
  }

  return withMutatorContext(
    { undoListening: true, undoTag: context.undoTag },
    func,
  );
}
```

3. **Undo Application**: When undoing, messages are reversed:

```130:158:packages/loot-core/src/server/undo.ts
export async function undo() {
  const end = CURSOR;
  CURSOR = Math.max(CURSOR - 1, 0);

  // Walk back to the nearest marker
  while (CURSOR > 0 && MESSAGE_HISTORY[CURSOR].type !== 'marker') {
    CURSOR--;
  }

  const meta = MESSAGE_HISTORY[CURSOR].meta;
  const start = Math.max(CURSOR, 0);
  const entries = MESSAGE_HISTORY.slice(start, end + 1).filter(
    (entry): entry is MessagesMessage => entry.type === 'messages',
  );

  if (entries.length > 0) {
    const toApply = entries
      .reduce((acc, entry) => {
        return acc.concat(
          entry.messages
            .map(message => undoMessage(message, entry.oldData))
            .filter(x => x),
        );
      }, [])
      .reverse();

    await applyUndoAction(toApply, meta, entries[0].undoTag);
  }
}
```

The `undoMessage` function reverses each message by restoring the old value from `oldData`.

### Redo

Redo works similarly but moves forward through the history:

```205:236:packages/loot-core/src/server/undo.ts
export async function redo() {
  const meta =
    MESSAGE_HISTORY[CURSOR].type === 'marker'
      ? MESSAGE_HISTORY[CURSOR].meta
      : null;

  const start = CURSOR;
  CURSOR = Math.min(CURSOR + 1, MESSAGE_HISTORY.length - 1);

  // Walk forward to the nearest marker
  while (
    CURSOR < MESSAGE_HISTORY.length - 1 &&
    MESSAGE_HISTORY[CURSOR].type !== 'marker'
  ) {
    CURSOR++;
  }

  const end = CURSOR;
  const entries = MESSAGE_HISTORY.slice(start + 1, end + 1).filter(
    (entry): entry is MessagesMessage => entry.type === 'messages',
  );

  if (entries.length > 0) {
    const toApply = entries.reduce((acc, entry) => {
      return acc
        .concat(entry.messages)
        .concat(redoResurrections(entry.messages, entry.oldData));
    }, []);

    await applyUndoAction(toApply, meta, entries[entries.length - 1].undoTag);
  }
}
```

### Undo Events

When undo/redo happens, the client receives an event and updates the UI:

```50:106:packages/desktop-client/src/global-events.ts
  const unlistenUndo = listen('undo-event', undoState => {
    const { tables, undoTag } = undoState;
    const promises: Promise<unknown>[] = [];

    if (
      tables.includes('categories') ||
      tables.includes('category_groups') ||
      tables.includes('category_mapping')
    ) {
      promises.push(store.dispatch(reloadCategories()));
    }

    if (
      tables.includes('accounts') ||
      tables.includes('payees') ||
      tables.includes('payee_mapping')
    ) {
      promises.push(store.dispatch(reloadPayees()));
    }

    if (tables.includes('accounts')) {
      promises.push(store.dispatch(reloadAccounts()));
    }

    const tagged = undo.getTaggedState(undoTag);

    if (tagged) {
      Promise.all(promises).then(() => {
        undo.setUndoState('undoEvent', undoState);

        // If a modal has been tagged, open it instead of navigating
        if (tagged.openModal) {
          const { modalStack } = store.getState().modals;

          if (
            modalStack.length === 0 ||
            modalStack[modalStack.length - 1].name !== tagged.openModal.name
          ) {
            store.dispatch(replaceModal({ modal: tagged.openModal }));
          }
        } else {
          store.dispatch(closeModal());

          if (
            window.location.href.replace(window.location.origin, '') !==
            tagged.url
          ) {
            window.__navigate(tagged.url);
            // This stops propagation of the undo event, which is
            // important because if we are changing URLs any existing
            // undo listeners on the current page don't need to be run
            return true;
          }
        }
      });
    }
  });
```

The undo event includes:
- `tables`: Which tables were affected
- `undoTag`: The snapshot ID to restore UI state

### Mutation Tracking

All mutations are automatically tracked. The system uses `withMutation` to mark functions that modify data:

```56:83:packages/loot-core/src/server/api.ts
function withMutation<Params extends Array<unknown>, ReturnType>(
  handler: (...args: Params) => Promise<ReturnType>,
) {
  
```

This ensures all data changes are captured for undo/redo.

## Reactivity & Subscriptions

Actual uses a spreadsheet system for reactive calculations. When data changes, dependent calculations automatically update.

### Spreadsheet Integration

The spreadsheet tracks dependencies and recalculates when inputs change:

```148:203:packages/loot-core/src/server/budget/base.ts
export function triggerBudgetChanges(oldValues, newValues) {
  const { createdMonths = new Set() } = sheet.get().meta();
  const budgetType = getBudgetType();
  sheet.startTransaction();

  try {
    newValues.forEach((items, table) => {
      const old = oldValues.get(table);

      items.forEach(newValue => {
        const oldValue = old && old.get(newValue.id);

        if (table === 'zero_budget_months') {
          handleBudgetMonthChange(newValue);
        } else if (table === 'zero_budgets' || table === 'reflect_budgets') {
          handleBudgetChange(newValue);
        } else if (table === 'transactions') {
          const changed = new Set(
            Object.keys(getChangedValues(oldValue || {}, newValue) || {}),
          );

          if (oldValue) {
            handleTransactionChange(oldValue, changed);
          }
          handleTransactionChange(newValue, changed);
        } else if (table === 'category_mapping') {
          handleCategoryMappingChange(createdMonths, oldValue, newValue);
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
          if (budgetType === 'envelope') {
            envelopeBudget.handleCategoryGroupChange(
              createdMonths,
              oldValue,
              newValue,
            );
          } else {
            report.handleCategoryGroupChange(createdMonths, oldValue, newValue);
          }
        } else if (table === 'accounts') {
          handleAccountChange(createdMonths, oldValue, newValue);
        }
      });
    });
  } finally {
    sheet.endTransaction();
  }
}
```

When data changes:
1. `triggerBudgetChanges` is called with old and new values
2. The spreadsheet identifies which calculations need to update
3. Dependent cells are recalculated
4. The transaction ensures all updates happen atomically

### Cache Barriers

The spreadsheet uses cache barriers to batch updates:

```323:325:packages/loot-core/src/server/sync/index.ts
  if (sheet.get()) {
    sheet.get().startCacheBarrier();
  }
```

This prevents unnecessary recalculations during bulk updates.

## Query Dependencies

AQL queries return dependencies that allow components to know which data they depend on:

```114:129:packages/loot-core/src/server/aql/exec.ts
export async function compileAndRunAqlQuery(
  schema,
  schemaConfig: SchemaConfig,
  queryState: QueryState,
  options: RunCompiledAqlQueryOptions,
) {
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await runCompiledAqlQuery(
    queryState,
    sqlPieces,
    state,
    options,
  );
  return { data, dependencies: state.dependencies };
}
```

When data changes, components using those queries can be notified to re-fetch. The dependencies array contains table names that the query depends on.

### Subscription Pattern

Components can subscribe to data changes:

1. Run a query that returns dependencies
2. Store the dependencies
3. When mutations occur, check if affected tables match dependencies
4. If they match, invalidate and re-fetch

This enables efficient updates without polling or manually tracking dependencies.

See also: [ARCHITECTURE.md](./ARCHITECTURE.md), [DOMAIN-LOGIC.md](./DOMAIN-LOGIC.md), [AGENTS.md](./AGENTS.md)

